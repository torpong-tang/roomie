import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAccessCode, hashAccessCode, normalizePlaceKey, requireAdmin } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const { id } = await params;
        const body = await request.json();
        const key = body.key === undefined ? undefined : normalizePlaceKey(String(body.key));
        const accessCode = String(body.accessCode || '').trim();
        if (key === '') {
            return NextResponse.json({ error: 'Place is required' }, { status: 400 });
        }
        if (accessCode && accessCode.length < 6) {
            return NextResponse.json({ error: 'Access code must be at least 6 characters' }, { status: 400 });
        }
        if (accessCode && accessCode === getAccessCode()) {
            return NextResponse.json({ error: 'Place access code must differ from the admin access code' }, { status: 400 });
        }

        const place = await prisma.place.update({
            where: { id },
            data: {
                key,
                isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
                accessCodeHash: accessCode ? hashAccessCode(accessCode) : undefined,
            },
            select: { id: true, key: true, isActive: true },
        });
        return NextResponse.json(place);
    } catch (error) {
        console.error('Failed to update place:', error);
        return NextResponse.json({ error: 'Unable to update place.' }, { status: 500 });
    }
}
