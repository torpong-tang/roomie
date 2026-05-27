import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireBooker } from '@/lib/auth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, response } = await requireBooker();
        if (response) return response;

        const { id } = await params;

        // Check if booking exists
        const booking = await prisma.booking.findUnique({
            where: { id }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        if (user?.role === 'place') {
            const room = await prisma.room.findUnique({ where: { id: booking.roomId } });
            if (!room || room.placeId !== user.placeId) {
                return NextResponse.json({ error: 'This booking is not available for your place' }, { status: 403 });
            }
        }

        await prisma.booking.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Failed to cancel booking:', error);
        return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }
}
