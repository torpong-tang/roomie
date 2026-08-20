import { NextResponse } from 'next/server';
import { addDays, addWeeks } from 'date-fns';
import prisma from '@/lib/prisma';
import { requireBooker, requireUser } from '@/lib/auth';

const REPEAT_TYPES = ['none', 'daily', 'weekly'] as const;
type RepeatType = typeof REPEAT_TYPES[number];

const MAX_REPEAT_COUNT = 10;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;
/** Allows for clock skew between the browser and the server. */
const PAST_GRACE_MS = 5 * 60 * 1000;

const TITLE_MAX = 200;
const NAME_MAX = 120;
const CONTACT_MAX = 120;

/** Postgres raises 23P01 when the Booking_no_overlap exclusion constraint rejects a row. */
const isOverlapConflict = (error: unknown) =>
    error instanceof Error && /23P01|Booking_no_overlap/.test(error.message);

class BookingConflictError extends Error {
    constructor(start: Date) {
        super(`Collision detected on ${start.toLocaleDateString()}. Room is already booked during this time.`);
        this.name = 'BookingConflictError';
    }
}

export async function GET(request: Request) {
    try {
        const { user, response } = await requireUser();
        if (response) return response;

        const requestedPlaceId = new URL(request.url).searchParams.get('placeId') || undefined;
        const placeId = user?.role === 'admin' ? requestedPlaceId : user?.placeId;

        const bookings = await prisma.booking.findMany({
            where: placeId ? { room: { placeId } } : undefined,
            include: {
                room: { include: { place: { select: { id: true, key: true } } } },
            },
            orderBy: { startTime: 'asc' },
        });
        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { user: currentUser, response } = await requireBooker();
        if (response) return response;

        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const roomId = String(body.roomId || '').trim();
        const title = String(body.title || '').trim();
        const bookedBy = String(body.user || '').trim();
        const contact = String(body.contact || '').trim();

        if (!roomId || !title || !bookedBy || !body.startTime || !body.endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (title.length > TITLE_MAX || bookedBy.length > NAME_MAX || contact.length > CONTACT_MAX) {
            return NextResponse.json({ error: 'One or more fields are too long' }, { status: 400 });
        }

        const baseStart = new Date(String(body.startTime));
        const baseEnd = new Date(String(body.endTime));
        if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
            return NextResponse.json({ error: 'Start and end time must be valid dates' }, { status: 400 });
        }
        if (baseEnd <= baseStart) {
            return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
        }
        if (baseEnd.getTime() - baseStart.getTime() > MAX_DURATION_MS) {
            return NextResponse.json({ error: 'A booking cannot be longer than 24 hours' }, { status: 400 });
        }
        if (baseStart.getTime() < Date.now() - PAST_GRACE_MS) {
            return NextResponse.json({ error: 'A booking cannot be created in the past' }, { status: 400 });
        }

        const repeatType = String(body.repeatType ?? 'none') as RepeatType;
        if (!REPEAT_TYPES.includes(repeatType)) {
            return NextResponse.json({ error: 'Repeat must be none, daily or weekly' }, { status: 400 });
        }

        const parsedCount = Number.parseInt(String(body.repeatCount ?? 1), 10);
        const repeatCount = repeatType === 'none'
            ? 1
            : Math.min(MAX_REPEAT_COUNT, Math.max(1, Number.isFinite(parsedCount) ? parsedCount : 1));

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || (currentUser?.role === 'place' && room.placeId !== currentUser.placeId)) {
            return NextResponse.json({ error: 'This room is not available for your place' }, { status: 403 });
        }

        const shift = (date: Date, index: number) => {
            if (repeatType === 'daily') return addDays(date, index);
            if (repeatType === 'weekly') return addWeeks(date, index);
            return date;
        };
        const slots = Array.from({ length: repeatCount }, (_, index) => ({
            start: shift(baseStart, index),
            end: shift(baseEnd, index),
        }));

        // The pre-check gives a helpful message; the exclusion constraint inside the same
        // transaction is what actually makes concurrent double-booking impossible.
        const created = await prisma.$transaction(async (tx) => {
            for (const slot of slots) {
                const overlap = await tx.booking.findFirst({
                    where: {
                        roomId,
                        startTime: { lt: slot.end },
                        endTime: { gt: slot.start },
                    },
                    select: { id: true },
                });
                if (overlap) {
                    throw new BookingConflictError(slot.start);
                }
            }

            return tx.booking.createManyAndReturn({
                data: slots.map((slot) => ({
                    roomId,
                    title,
                    startTime: slot.start,
                    endTime: slot.end,
                    user: bookedBy,
                    contact: contact || null,
                })),
            });
        });

        return NextResponse.json(created);
    } catch (error) {
        if (error instanceof BookingConflictError) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        if (isOverlapConflict(error)) {
            return NextResponse.json(
                { error: 'Room is already booked during this time. Please pick another slot.' },
                { status: 409 }
            );
        }
        console.error('Failed to create booking:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}
