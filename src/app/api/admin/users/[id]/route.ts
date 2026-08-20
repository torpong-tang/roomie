import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/** Roomie must never end up without a way in, so the last active admin is protected. */
const isLastActiveAdmin = async (id: string) => {
    const activeAdmins = await prisma.appUser.findMany({
        where: { isActive: true },
        select: { id: true },
    });
    return activeAdmins.length <= 1 && activeAdmins[0]?.id === id;
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user: currentUser, response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (typeof body.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive is required' }, { status: 400 });
    }

    const target = await prisma.appUser.findUnique({ where: { id } });
    if (!target) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!body.isActive) {
        if (target.email === currentUser?.email) {
            return NextResponse.json({ error: 'You cannot disable your own access' }, { status: 400 });
        }
        if (await isLastActiveAdmin(id)) {
            return NextResponse.json({ error: 'At least one active administrator is required' }, { status: 400 });
        }
    }

    const user = await prisma.appUser.update({
        where: { id },
        data: { isActive: body.isActive },
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
    if (await isLastActiveAdmin(id)) {
        return NextResponse.json({ error: 'At least one active administrator is required' }, { status: 400 });
    }

    await prisma.appUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
