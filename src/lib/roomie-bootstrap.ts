import type { AuthUser } from '@/lib/auth';
import type { RoomieBootstrap } from '@/lib/bootstrap-types';
import prisma from '@/lib/prisma';

export async function getRoomieBootstrap(user: AuthUser): Promise<RoomieBootstrap> {
    const places = await prisma.place.findMany({
        where: user.role === 'admin' ? { isActive: true } : { id: user.placeId, isActive: true },
        select: { id: true, key: true },
        orderBy: { key: 'asc' },
    });
    const placeId = user.role === 'admin' ? (places[0]?.id ?? '') : (user.placeId ?? '');
    const placeFilter = placeId || undefined;

    const [rooms, bookings] = await Promise.all([
        prisma.room.findMany({
            where: placeFilter ? { placeId: placeFilter } : undefined,
            include: { place: { select: { id: true, key: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.booking.findMany({
            where: placeFilter ? { room: { placeId: placeFilter } } : undefined,
            include: { room: { include: { place: { select: { id: true, key: true } } } } },
            orderBy: { startTime: 'asc' },
        }),
    ]);

    return {
        placeId,
        places,
        rooms,
        bookings: bookings.map((booking) => ({
            ...booking,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
        })),
    };
}
