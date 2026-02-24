import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, capacity, description, image } = body;

        const room = await prisma.room.update({
            where: { id },
            data: {
                name,
                capacity: capacity ? parseInt(capacity) : undefined,
                description,
                image,
            },
        });

        return NextResponse.json(room);
    } catch (error) {
        console.error('Failed to update room:', error);
        return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        await prisma.room.delete({
            where: { id },
        });
        return NextResponse.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Failed to delete room:', error);
        return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }
}
