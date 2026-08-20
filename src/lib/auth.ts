import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const AUTH_COOKIE = 'roomie_session';
export const COOKIE_PATH = '/roomie';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

/**
 * Roomie has three kinds of session: an administrator signing in with the admin
 * access code, a place signing in with its own access code, and a viewer signing
 * in with a place's optional read-only view code.
 */
export type SessionRole = 'admin' | 'place' | 'viewer';

const PLACE_ROLES: SessionRole[] = ['place', 'viewer'];

export type AuthUser = {
    email: string;
    role: SessionRole;
    placeId?: string;
    placeName?: string;
};

type SessionPayload = AuthUser & { exp: number };

const isProduction = () => process.env.NODE_ENV === 'production';

const requireProductionSecret = (name: string, value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed && isProduction()) {
        throw new Error(`${name} must be set in production`);
    }
    return trimmed;
};

export const getAccessCode = () =>
    requireProductionSecret('ROOMIE_ACCESS_CODE', process.env.ROOMIE_ACCESS_CODE) || 'roomie';

const getSecret = () =>
    requireProductionSecret(
        'ROOMIE_AUTH_SECRET',
        process.env.ROOMIE_AUTH_SECRET || process.env.ADMIN_SESSION_SECRET
    ) || 'roomie-local-dev-secret';

const toBase64Url = (value: string | Buffer) =>
    Buffer.from(value).toString('base64url');

const fromBase64Url = (value: string) =>
    Buffer.from(value, 'base64url').toString('utf8');

const sign = (payload: string) =>
    createHmac('sha256', getSecret()).update(payload).digest('base64url');

export const constantTimeEquals = (left: string, right: string) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizePlaceKey = (key: string) => key.trim().toLowerCase();

export const hashAccessCode = (accessCode: string) => {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(accessCode, salt, 32).toString('hex');
    return `${salt}:${hash}`;
};

export const verifyAccessCode = (accessCode: string, storedHash: string) => {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const received = scryptSync(accessCode, salt, 32);
    return received.length === expected.length && timingSafeEqual(received, expected);
};

export const createSessionValue = (user: AuthUser) => {
    const session: SessionPayload = {
        ...user,
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const payload = toBase64Url(JSON.stringify(session));
    return `${payload}.${sign(payload)}`;
};

export const readSessionValue = (value?: string): AuthUser | null => {
    if (!value) return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;
    if (!constantTimeEquals(signature, sign(payload))) return null;

    try {
        const parsed = JSON.parse(fromBase64Url(payload));
        if (typeof parsed.email !== 'string') return null;
        if (parsed.role !== 'admin' && !PLACE_ROLES.includes(parsed.role)) return null;
        if (PLACE_ROLES.includes(parsed.role) && typeof parsed.placeId !== 'string') return null;
        // Sessions carry their own expiry so a copied cookie value cannot outlive it.
        if (typeof parsed.exp !== 'number' || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
        return {
            email: normalizeEmail(parsed.email),
            role: parsed.role,
            placeId: parsed.placeId,
            placeName: parsed.placeName,
        };
    } catch {
        return null;
    }
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
    const cookieStore = await cookies();
    const sessionUser = readSessionValue(cookieStore.get(AUTH_COOKIE)?.value);
    if (!sessionUser) return null;

    if (PLACE_ROLES.includes(sessionUser.role) && sessionUser.placeId) {
        const place = await prisma.place.findUnique({ where: { id: sessionUser.placeId } });
        if (!place || !place.isActive) return null;
        // Clearing a place's view code must end the viewer sessions it handed out.
        if (sessionUser.role === 'viewer' && !place.viewCodeHash) return null;
        return {
            email: place.key,
            role: sessionUser.role,
            placeId: place.id,
            placeName: place.key,
        };
    }

    const user = await prisma.appUser.findUnique({ where: { email: sessionUser.email } });
    if (!user || !user.isActive) return null;

    return { email: user.email, role: 'admin' };
};

export const requireUser = async () => {
    const user = await getCurrentUser();
    if (!user) {
        return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    return { user, response: null };
};

export const requireAdmin = async () => {
    const { user, response } = await requireUser();
    if (response) return { user: null, response };
    if (user?.role !== 'admin') {
        return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { user, response: null };
};

/** Anything that changes a booking. Viewers are read-only. */
export const requireBooker = async () => {
    const { user, response } = await requireUser();
    if (response) return { user: null, response };
    if (user?.role === 'viewer') {
        return {
            user: null,
            response: NextResponse.json({ error: 'This account has view-only access' }, { status: 403 }),
        };
    }
    return { user, response: null };
};

export const setAuthCookie = (response: NextResponse, user: AuthUser) => {
    response.cookies.set(AUTH_COOKIE, createSessionValue(user), {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction(),
        path: COOKIE_PATH,
        maxAge: SESSION_TTL_SECONDS,
    });
};

export const clearAuthCookie = (response: NextResponse) => {
    response.cookies.set(AUTH_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction(),
        path: COOKIE_PATH,
        maxAge: 0,
    });
};
