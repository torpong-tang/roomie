import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const rooms = await prisma.room.findMany({
            include: {
                bookings: true,
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
        const body = await request.json();
        const { name, capacity, description, image } = body;

        if (!name || !capacity) {
            return NextResponse.json({ error: 'Name and capacity are required' }, { status: 400 });
        }

        const room = await prisma.room.create({
            data: {
                name,
                capacity: parseInt(capacity),
                description,
                image,
            },
        });

        return NextResponse.json(room);
    } catch (error) {
        console.error('Failed to create room:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}
