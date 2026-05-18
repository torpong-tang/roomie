import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeEmail, requireAdmin, USER_ROLES } from '@/lib/auth';

export async function GET() {
    const { response } = await requireAdmin();
    if (response) return response;

    const users = await prisma.appUser.findMany({
        orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
    return NextResponse.json(users);
}

export async function POST(request: Request) {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const email = normalizeEmail(String(body.email || ''));
    const requestedRole = String(body.role || 'user');
    const role = USER_ROLES.includes(requestedRole as 'readonly' | 'user' | 'admin') ? requestedRole : 'user';

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.appUser.upsert({
        where: { email },
        update: { role, isActive: true },
        create: { email, role },
    });
    return NextResponse.json(user);
}
