import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;

        // Check if booking exists
        const booking = await prisma.booking.findUnique({
            where: { id }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
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
