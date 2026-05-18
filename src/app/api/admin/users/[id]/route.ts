import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, USER_ROLES } from '@/lib/auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const requestedRole = String(body.role || 'user');
    const role = USER_ROLES.includes(requestedRole as 'readonly' | 'user' | 'admin') ? requestedRole : 'user';
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined;

    const user = await prisma.appUser.update({
        where: { id },
        data: { role, isActive },
    });
    return NextResponse.json(user);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user: currentUser, response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    const target = await prisma.appUser.findUnique({ where: { id } });
    if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.email === currentUser?.email) {
        return NextResponse.json({ error: 'You cannot remove your own access' }, { status: 400 });
    }

    await prisma.appUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
