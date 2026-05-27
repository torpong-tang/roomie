import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET() {
    try {
        const { user, response } = await requireUser();
        if (response) return response;

        const places = await prisma.place.findMany({
            where: user?.role === 'admin' ? { isActive: true } : { id: user?.placeId, isActive: true },
            select: { id: true, key: true },
            orderBy: { key: 'asc' },
        });
        return NextResponse.json(places);
    } catch (error) {
        console.error('Failed to fetch available places:', error);
        return NextResponse.json({ error: 'Unable to load places.' }, { status: 500 });
    }
}
