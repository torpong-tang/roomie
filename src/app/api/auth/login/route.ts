import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAccessCode, normalizeEmail, normalizePlaceKey, setAuthCookie, verifyAccessCode } from '@/lib/auth';

export async function POST(request: Request) {
    const body = await request.json();
    const identifier = String(body.email || '').trim();
    const email = normalizeEmail(identifier);
    const accessCode = String(body.accessCode || '').trim();

    if (!identifier || !accessCode) {
        return NextResponse.json({ error: 'Place/Email and access code are required' }, { status: 400 });
    }

    const appUser = await prisma.appUser.findUnique({ where: { email } });
    if (appUser?.isActive && appUser.role === 'admin') {
        if (accessCode !== getAccessCode()) {
            return NextResponse.json({ error: 'Access code is incorrect' }, { status: 401 });
        }
        const response = NextResponse.json({ user: { email: appUser.email, role: appUser.role } });
        setAuthCookie(response, { email: appUser.email, role: 'admin' });
        return response;
    }

    const place = await prisma.place.findUnique({ where: { key: normalizePlaceKey(identifier) } });
    if (!place || !place.isActive || !verifyAccessCode(accessCode, place.accessCodeHash)) {
        return NextResponse.json({ error: 'Place/Email or access code is incorrect' }, { status: 401 });
    }

    const response = NextResponse.json({ user: { email: place.key, role: 'place', placeId: place.id, placeName: place.key } });
    setAuthCookie(response, { email: place.key, role: 'place', placeId: place.id, placeName: place.key });
    return response;
}
