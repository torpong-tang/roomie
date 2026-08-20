type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const prune = (now: number) => {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
};

export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
};

/**
 * Fixed-window limiter kept in process memory. Roomie runs as a single standalone
 * server, so this is enough to stop access-code guessing without extra infrastructure.
 */
export const consumeAttempt = (
    key: string,
    { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult => {
    const now = Date.now();
    if (buckets.size > 500) prune(now);

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    bucket.count += 1;
    if (bucket.count > limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        };
    }
    return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
};

export const resetAttempts = (key: string) => {
    buckets.delete(key);
};

export const getClientIp = (request: Request) => {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    return request.headers.get('x-real-ip')?.trim() || 'unknown';
};
