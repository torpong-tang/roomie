import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, requireUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const { user, response } = await requireUser();
        if (response) return response;
        const requestedPlaceId = new URL(request.url).searchParams.get('placeId') || undefined;
        const placeId = user?.role === 'admin' ? requestedPlaceId : user?.placeId;
        const rooms = await prisma.room.findMany({
            where: placeId ? { placeId } : user?.role === 'admin' ? undefined : { placeId: null },
            include: {
                bookings: true,
                place: { select: { id: true, key: true } },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(rooms);
    } catch (error) {
        console.error('Failed to fetch rooms:', error);
        return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const body = await request.json();
        const { name, capacity, description, image, placeId } = body;

        if (!name || !capacity || !placeId) {
            return NextResponse.json({ error: 'Place, name and capacity are required' }, { status: 400 });
        }

        const room = await prisma.room.create({
            data: {
                name,
                capacity: parseInt(capacity),
                description,
                image,
                placeId,
            },
        });

        return NextResponse.json(room);
    } catch (error) {
        console.error('Failed to create room:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}
