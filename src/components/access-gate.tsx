'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Eye, EyeOff, Home } from 'lucide-react';
import { apiPath } from '@/lib/paths';

const REDIRECT_URL = 'https://2startup.cloud/';

type AccessGateProps = {
    children: ReactNode;
};

export function AccessGate({ children }: AccessGateProps) {
    const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking');
    const [email, setEmail] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        fetch(apiPath('/api/auth/me'))
            .then((response) => response.json())
            .then((data) => {
                if (!isCancelled) setStatus(data.user ? 'allowed' : 'blocked');
            })
            .catch(() => {
                if (!isCancelled) setStatus('blocked');
            });

        return () => {
            isCancelled = true;
        };
    }, []);

    const redirectAway = () => {
        window.location.replace(REDIRECT_URL);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalizedEmail = email.trim();
        const normalizedCode = accessCode.trim();
        if (!normalizedEmail || !normalizedCode) {
            setError('Please enter both email and access code.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await fetch(apiPath('/api/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, accessCode: normalizedCode }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Unable to sign in.');
                setAccessCode('');
                return;
            }
            setStatus('allowed');
        } catch {
            setError('Unable to sign in.');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'checking') return null;

    if (status === 'allowed') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 px-4 backdrop-blur-md">
                <button
                    type="button"
                    onClick={redirectAway}
                    className="fixed right-5 top-5 z-[110] inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 bg-sky-500 text-white shadow-2xl shadow-black/40 transition hover:scale-105 hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-300"
                    aria-label="Return to 2Startup Cloud"
                    title="Back to 2Startup Cloud"
                >
                    <Home className="h-6 w-6 fill-white" aria-hidden="true" />
                </button>
                <form onSubmit={handleSubmit} className="glass-card w-full max-w-sm p-6 shadow-2xl">
                    <div className="mb-5">
                        <div>
                            <h1 className="text-xl font-bold text-white">Roomie Access</h1>
                            <p className="mt-1 text-sm text-white/50">Enter an approved email and access code.</p>
                        </div>
                    </div>

                    <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="roomie-email">
                        Email
                    </label>
                    <input
                        id="roomie-email"
                        type="text"
                        inputMode="email"
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            setError('');
                        }}
                        className="glass-input mb-4 w-full rounded-lg p-3 outline-hidden"
                        autoComplete="email"
                        autoFocus
                    />

                    <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="roomie-access-code">
                        Access code
                    </label>
                    <div className="relative">
                        <input
                            id="roomie-access-code"
                            type={isAccessCodeVisible ? 'text' : 'password'}
                            value={accessCode}
                            onChange={(event) => {
                                setAccessCode(event.target.value);
                                setError('');
                            }}
                            className="glass-input w-full rounded-lg p-3 pr-12 outline-hidden"
                            autoComplete="off"
                            placeholder="Enter access code"
                        />
                        <button
                            type="button"
                            onClick={() => setIsAccessCodeVisible((value) => !value)}
                            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
                            aria-label={isAccessCodeVisible ? 'Hide access code' : 'Show access code'}
                            title={isAccessCodeVisible ? 'Hide access code' : 'Show access code'}
                        >
                            {isAccessCodeVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={redirectAway}
                            className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="glass-button rounded-xl p-3 text-sm font-bold disabled:opacity-60">
                            {loading ? 'Checking...' : 'Continue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
