'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, readJson } from '@/lib/paths';
import type { RoomieBootstrap } from '@/lib/bootstrap-types';

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
    bootstrap: RoomieBootstrap | null;
    setSession: (user: SessionUser | null, bootstrap?: RoomieBootstrap | null) => void;
    refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the signed-in session for the whole app. Previously the access gate, the
 * navigation and every page each called /api/auth/me on their own.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [bootstrap, setBootstrap] = useState<RoomieBootstrap | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready'>('loading');

    const setSession = useCallback((nextUser: SessionUser | null, nextBootstrap: RoomieBootstrap | null = null) => {
        setUser(nextUser);
        setBootstrap(nextBootstrap);
        setStatus('ready');
    }, []);

    const refresh = useCallback(async () => {
        try {
            const response = await apiFetch('/api/auth/bootstrap');
            const data = await readJson<{
                user?: SessionUser | null;
                bootstrap?: RoomieBootstrap | null;
            }>(response);
            if (!response.ok) throw new Error('Unable to load session.');
            setUser(data.user ?? null);
            setBootstrap(data.bootstrap ?? null);
        } catch {
            setUser(null);
            setBootstrap(null);
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
            bootstrap,
            setSession,
            refresh,
        }),
        [user, status, bootstrap, setSession, refresh]
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
