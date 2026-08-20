import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeEmail, requireAdmin } from '@/lib/auth';

export async function GET() {
    const { response } = await requireAdmin();
    if (response) return response;

    const users = await prisma.appUser.findMany({ orderBy: { email: 'asc' } });
    return NextResponse.json(users);
}

export async function POST(request: Request) {
    const { response } = await requireAdmin();
    if (response) return response;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email = normalizeEmail(String(body.email || ''));
    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Administrator is the only account role; everyone else signs in as a place.
    const user = await prisma.appUser.upsert({
        where: { email },
        update: { role: 'admin', isActive: true },
        create: { email, role: 'admin' },
    });
    return NextResponse.json(user);
}
