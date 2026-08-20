import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashAccessCode, normalizePlaceKey, requireAdmin } from '@/lib/auth';
import { PLACE_SELECT, toPlaceResponse, validateCode } from '@/lib/places';

export async function GET() {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const places = await prisma.place.findMany({
            select: { ...PLACE_SELECT, _count: { select: { rooms: true } } },
            orderBy: { key: 'asc' },
        });
        return NextResponse.json(places.map(toPlaceResponse));
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
        const viewCode = String(body.viewCode || '').trim();

        if (!key || !accessCode) {
            return NextResponse.json({ error: 'Place and access code are required' }, { status: 400 });
        }
        const accessCodeError = validateCode(accessCode, 'Access code');
        if (accessCodeError) {
            return NextResponse.json({ error: accessCodeError }, { status: 400 });
        }
        if (viewCode) {
            const viewCodeError = validateCode(viewCode, 'View code');
            if (viewCodeError) {
                return NextResponse.json({ error: viewCodeError }, { status: 400 });
            }
            if (viewCode === accessCode) {
                return NextResponse.json({ error: 'View code must differ from the booking access code' }, { status: 400 });
            }
        }

        const place = await prisma.place.create({
            data: {
                key,
                accessCodeHash: hashAccessCode(accessCode),
                viewCodeHash: viewCode ? hashAccessCode(viewCode) : null,
            },
            select: PLACE_SELECT,
        });
        return NextResponse.json(toPlaceResponse(place));
    } catch (error) {
        console.error('Failed to create place:', error);
        return NextResponse.json({ error: 'Unable to save place. Database migration may be required.' }, { status: 500 });
    }
}
