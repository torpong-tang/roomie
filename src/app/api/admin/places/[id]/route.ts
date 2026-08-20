import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashAccessCode, normalizePlaceKey, requireAdmin, verifyAccessCode } from '@/lib/auth';
import { PLACE_SELECT, toPlaceResponse, validateCode } from '@/lib/places';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { response } = await requireAdmin();
        if (response) return response;

        const { id } = await params;
        const body = await request.json();
        const key = body.key === undefined ? undefined : normalizePlaceKey(String(body.key));
        const accessCode = String(body.accessCode || '').trim();
        // `viewCode: null` clears the code and ends every viewer session for this place.
        const clearViewCode = body.viewCode === null;
        const viewCode = clearViewCode ? '' : String(body.viewCode || '').trim();

        if (key === '') {
            return NextResponse.json({ error: 'Place is required' }, { status: 400 });
        }
        if (accessCode) {
            const error = validateCode(accessCode, 'Access code');
            if (error) return NextResponse.json({ error }, { status: 400 });
        }
        if (viewCode) {
            const error = validateCode(viewCode, 'View code');
            if (error) return NextResponse.json({ error }, { status: 400 });

            const existing = await prisma.place.findUnique({ where: { id }, select: { accessCodeHash: true } });
            if (!existing) {
                return NextResponse.json({ error: 'Place not found' }, { status: 404 });
            }
            // Compare against whichever booking code the place will end up with.
            const clashes = accessCode
                ? viewCode === accessCode
                : verifyAccessCode(viewCode, existing.accessCodeHash);
            if (clashes) {
                return NextResponse.json({ error: 'View code must differ from the booking access code' }, { status: 400 });
            }
        }

        const place = await prisma.place.update({
            where: { id },
            data: {
                key,
                isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
                accessCodeHash: accessCode ? hashAccessCode(accessCode) : undefined,
                viewCodeHash: clearViewCode ? null : viewCode ? hashAccessCode(viewCode) : undefined,
            },
            select: PLACE_SELECT,
        });
        return NextResponse.json(toPlaceResponse(place));
    } catch (error) {
        console.error('Failed to update place:', error);
        return NextResponse.json({ error: 'Unable to update place.' }, { status: 500 });
    }
}
