import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRoomieBootstrap } from '@/lib/roomie-bootstrap';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ user: null, bootstrap: null });

        const bootstrap = await getRoomieBootstrap(user);
        return NextResponse.json({ user, bootstrap });
    } catch (error) {
        console.error('Failed to bootstrap Roomie:', error);
        return NextResponse.json({ error: 'Unable to load Roomie.' }, { status: 500 });
    }
}
