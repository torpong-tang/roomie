import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = () => new Set(
    (process.env.ROOMIE_CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)
);

const CORS_METHODS = 'GET,HEAD,POST,PATCH,DELETE,OPTIONS';
const CORS_HEADERS = 'Content-Type,Authorization';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const corsHeaders = (origin: string) => ({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Allow-Headers': CORS_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
});

/**
 * Enables the dedicated API deployment without accepting arbitrary cross-site
 * cookie requests. Same-origin deployments continue to work without CORS.
 */
export function proxy(request: NextRequest) {
    const origin = request.headers.get('origin')?.replace(/\/+$/, '') || '';
    const allowed = allowedOrigins();
    const forwardedProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;
    const isSameOrigin = origin === requestOrigin;
    const isAllowedCrossOrigin = Boolean(origin && !isSameOrigin && allowed.has(origin));

    if (origin && !isSameOrigin && !isAllowedCrossOrigin) {
        return NextResponse.json({ error: 'Origin is not allowed' }, { status: 403 });
    }

    if (!SAFE_METHODS.has(request.method) && !origin) {
        const contentType = request.headers.get('content-type') || '';
        if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
            return NextResponse.json({ error: 'Unsupported request origin' }, { status: 403 });
        }
    }

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: isAllowedCrossOrigin ? corsHeaders(origin) : undefined,
        });
    }

    const response = NextResponse.next();
    if (isAllowedCrossOrigin) {
        Object.entries(corsHeaders(origin)).forEach(([key, value]) => response.headers.set(key, value));
    }
    return response;
}

export const config = {
    matcher: '/api/:path*',
};
