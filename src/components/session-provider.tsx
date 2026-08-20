'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/paths';

export type SessionUser = {
    email: string;
    role: 'admin' | 'place' | 'viewer';
    placeId?: string;
    placeName?: string;
};

type SessionContextValue = {
    user: SessionUser | null;
    status: 'loading' | 'ready';
    isAdmin: boolean;
    /** Viewers may read the calendar but cannot create or cancel bookings. */
    canBook: boolean;
    isViewer: boolean;
    setUser: (user: SessionUser | null) => void;
    refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the signed-in session for the whole app. Previously the access gate, the
 * navigation and every page each called /api/auth/me on their own.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready'>('loading');

    const refresh = useCallback(async () => {
        try {
            const response = await apiFetch('/api/auth/me');
            const data = await response.json();
            setUser(data.user ?? null);
        } catch {
            setUser(null);
        } finally {
            setStatus('ready');
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({
            user,
            status,
            isAdmin: user?.role === 'admin',
            isViewer: user?.role === 'viewer',
            canBook: user?.role === 'admin' || user?.role === 'place',
            setUser,
            refresh,
        }),
        [user, status, refresh]
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider.');
    }
    return context;
}
