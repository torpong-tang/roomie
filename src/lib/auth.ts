import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const AUTH_COOKIE = 'roomie_session';
export const COOKIE_PATH = '/roomie';
export const USER_ROLES = ['readonly', 'user', 'admin'] as const;
export type UserRole = typeof USER_ROLES[number];
export type SessionRole = UserRole | 'place';

export type AuthUser = {
    email: string;
    role: SessionRole;
    placeId?: string;
    placeName?: string;
};

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
    const payload = toBase64Url(JSON.stringify(user));
    return `${payload}.${sign(payload)}`;
};

export const readSessionValue = (value?: string): AuthUser | null => {
    if (!value) return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;

    const expected = sign(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
        const parsed = JSON.parse(fromBase64Url(payload));
        if (typeof parsed.email !== 'string' || ![...USER_ROLES, 'place'].includes(parsed.role)) return null;
        if (parsed.role === 'place' && typeof parsed.placeId !== 'string') return null;
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

export const getCurrentUser = async () => {
    const cookieStore = await cookies();
    const sessionUser = readSessionValue(cookieStore.get(AUTH_COOKIE)?.value);
    if (!sessionUser) return null;

    if (sessionUser.role === 'place' && sessionUser.placeId) {
        const place = await prisma.place.findUnique({ where: { id: sessionUser.placeId } });
        if (!place || !place.isActive) return null;
        return {
            email: place.key,
            role: 'place' as const,
            placeId: place.id,
            placeName: place.key,
        };
    }

    const user = await prisma.appUser.findUnique({ where: { email: sessionUser.email } });
    if (!user || !user.isActive) return null;

    return {
        email: user.email,
        role: user.role as UserRole,
    };
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

export const requireBooker = async () => {
    const { user, response } = await requireUser();
    if (response) return { user: null, response };
    if (user?.role === 'readonly') {
        return { user: null, response: NextResponse.json({ error: 'Read-only users cannot make changes' }, { status: 403 }) };
    }
    return { user, response: null };
};

export const setAuthCookie = (response: NextResponse, user: AuthUser) => {
    response.cookies.set(AUTH_COOKIE, createSessionValue(user), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: COOKIE_PATH,
        maxAge: 60 * 60 * 12,
    });
};

export const clearAuthCookie = (response: NextResponse) => {
    response.cookies.set(AUTH_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: COOKIE_PATH,
        maxAge: 0,
    });
};
