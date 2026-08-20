import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
    constantTimeEquals,
    getAccessCode,
    normalizeEmail,
    normalizePlaceKey,
    setAuthCookie,
    verifyAccessCode,
} from '@/lib/auth';
import { consumeAttempt, getClientIp, resetAttempts } from '@/lib/rate-limit';
import { getRoomieBootstrap } from '@/lib/roomie-bootstrap';

const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
    const ip = getClientIp(request);
    const ipLimit = consumeAttempt(`login:ip:${ip}`, { limit: ATTEMPT_LIMIT, windowMs: ATTEMPT_WINDOW_MS });
    if (!ipLimit.allowed) {
        return NextResponse.json(
            { error: 'Too many sign-in attempts. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
        );
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const identifier = String(body.email || '').trim();
    const accessCode = String(body.accessCode || '').trim();

    if (!identifier || !accessCode) {
        return NextResponse.json({ error: 'Place/Email and access code are required' }, { status: 400 });
    }

    const identifierLimit = consumeAttempt(`login:id:${normalizePlaceKey(identifier)}`, {
        limit: ATTEMPT_LIMIT,
        windowMs: ATTEMPT_WINDOW_MS,
    });
    if (!identifierLimit.allowed) {
        return NextResponse.json(
            { error: 'Too many sign-in attempts for this account. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(identifierLimit.retryAfterSeconds) } }
        );
    }

    const succeed = async (payload: Parameters<typeof setAuthCookie>[1]) => {
        try {
            const bootstrap = await getRoomieBootstrap(payload);
            resetAttempts(`login:ip:${ip}`);
            resetAttempts(`login:id:${normalizePlaceKey(identifier)}`);
            const response = NextResponse.json({ user: payload, bootstrap });
            setAuthCookie(response, payload);
            return response;
        } catch (error) {
            console.error('Failed to prepare Roomie after sign-in:', error);
            return NextResponse.json({ error: 'Unable to load Roomie. Please try again.' }, { status: 500 });
        }
    };

    const appUser = await prisma.appUser.findUnique({ where: { email: normalizeEmail(identifier) } });
    if (appUser?.isActive) {
        if (!constantTimeEquals(accessCode, getAccessCode())) {
            return NextResponse.json({ error: 'Access code is incorrect' }, { status: 401 });
        }
        return await succeed({ email: appUser.email, role: 'admin' });
    }

    const place = await prisma.place.findUnique({ where: { key: normalizePlaceKey(identifier) } });
    if (place?.isActive) {
        if (verifyAccessCode(accessCode, place.accessCodeHash)) {
            return await succeed({ email: place.key, role: 'place', placeId: place.id, placeName: place.key });
        }
        // The optional view code grants the same place, but read-only.
        if (place.viewCodeHash && verifyAccessCode(accessCode, place.viewCodeHash)) {
            return await succeed({ email: place.key, role: 'viewer', placeId: place.id, placeName: place.key });
        }
    }

    return NextResponse.json({ error: 'Place/Email or access code is incorrect' }, { status: 401 });
}
