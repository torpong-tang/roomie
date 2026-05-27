import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAccessCode, hashAccessCode, normalizePlaceKey, requireAdmin } from '@/lib/auth';

export async function GET() {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const places = await prisma.place.findMany({
            include: { _count: { select: { rooms: true } } },
            orderBy: { key: 'asc' },
        });
        return NextResponse.json(places);
    } catch (error) {
        console.error('Failed to fetch places:', error);
        return NextResponse.json({ error: 'Unable to load places. Database migration may be required.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const body = await request.json();
        const key = normalizePlaceKey(String(body.key || ''));
        const accessCode = String(body.accessCode || '').trim();
        if (!key || !accessCode) {
            return NextResponse.json({ error: 'Place and access code are required' }, { status: 400 });
        }
        if (accessCode.length < 6) {
            return NextResponse.json({ error: 'Access code must be at least 6 characters' }, { status: 400 });
        }
        if (accessCode === getAccessCode()) {
            return NextResponse.json({ error: 'Place access code must differ from the admin access code' }, { status: 400 });
        }

        const place = await prisma.place.create({
            data: { key, accessCodeHash: hashAccessCode(accessCode) },
            select: { id: true, key: true, isActive: true, createdAt: true },
        });
        return NextResponse.json(place);
    } catch (error) {
        console.error('Failed to create place:', error);
        return NextResponse.json({ error: 'Unable to save place. Database migration may be required.' }, { status: 500 });
    }
}
