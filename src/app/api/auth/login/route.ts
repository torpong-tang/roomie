import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_ACCESS_CODE, normalizeEmail, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
    const body = await request.json();
    const email = normalizeEmail(String(body.email || ''));
    const accessCode = String(body.accessCode || '').trim();

    if (!email || !accessCode) {
        return NextResponse.json({ error: 'Email and access code are required' }, { status: 400 });
    }

    if (accessCode !== (process.env.ROOMIE_ACCESS_CODE || DEFAULT_ACCESS_CODE)) {
        return NextResponse.json({ error: 'Access code is incorrect' }, { status: 401 });
    }

    const appUser = await prisma.appUser.findUnique({ where: { email } });
    if (!appUser || !appUser.isActive) {
        return NextResponse.json({ error: 'This email is not allowed to use Roomie' }, { status: 403 });
    }

    const response = NextResponse.json({
        user: {
            email: appUser.email,
            role: appUser.role,
        },
    });
    setAuthCookie(response, { email: appUser.email, role: appUser.role as 'readonly' | 'user' | 'admin' });
    return response;
}
