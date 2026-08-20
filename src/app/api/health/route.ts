import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const startedAt = Date.now();

    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            status: 'ok',
            service: 'roomie-api',
            database: 'reachable',
            responseTimeMs: Date.now() - startedAt,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Roomie health check failed:', error);
        return NextResponse.json({
            status: 'error',
            service: 'roomie-api',
            database: 'unreachable',
            responseTimeMs: Date.now() - startedAt,
            timestamp: new Date().toISOString(),
        }, { status: 503 });
    }
}
