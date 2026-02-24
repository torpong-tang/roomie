import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                room: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });
        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { roomId, title, startTime, endTime, user, repeatType = 'none', repeatCount = 1 } = body;

        if (!roomId || !title || !startTime || !endTime || !user) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const bookingDates: { start: Date, end: Date }[] = [];
        const baseStart = new Date(startTime);
        const baseEnd = new Date(endTime);

        for (let i = 0; i < repeatCount; i++) {
            const occurrenceStart = new Date(baseStart);
            const occurrenceEnd = new Date(baseEnd);

            if (repeatType === 'daily') {
                occurrenceStart.setDate(baseStart.getDate() + i);
                occurrenceEnd.setDate(baseEnd.getDate() + i);
            } else if (repeatType === 'weekly') {
                occurrenceStart.setDate(baseStart.getDate() + (i * 7));
                occurrenceEnd.setDate(baseEnd.getDate() + (i * 7));
            }

            bookingDates.push({ start: occurrenceStart, end: occurrenceEnd });
        }

        // Check for overlapping bookings for any of the occurrences
        for (const dates of bookingDates) {
            const overlap = await prisma.booking.findFirst({
                where: {
                    roomId,
                    OR: [
                        {
                            startTime: {
                                lt: dates.end,
                            },
                            endTime: {
                                gt: dates.start,
                            },
                        },
                    ],
                },
            });

            if (overlap) {
                return NextResponse.json({
                    error: `Collision detected on ${dates.start.toLocaleDateString()}. Room is already booked during this time.`
                }, { status: 400 });
            }
        }

        // If no overlaps, create all bookings
        const createdBookings = await Promise.all(
            bookingDates.map(dates =>
                prisma.booking.create({
                    data: {
                        roomId,
                        title,
                        startTime: dates.start,
                        endTime: dates.end,
                        user,
                    },
                })
            )
        );

        return NextResponse.json(createdBookings);
    } catch (error) {
        console.error('Failed to create booking:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}
