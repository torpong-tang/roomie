'use client';

import { FormEvent, ReactNode, useState } from 'react';
import { ArrowRight, CalendarCheck, Eye, EyeOff, Home, ShieldCheck, Users, X } from 'lucide-react';
import { apiFetch, assetPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';
import { useSession } from '@/components/session-provider';
import { useTranslation } from '@/components/translation-provider';

const REDIRECT_URL = 'https://2startup.cloud/';

type AccessGateProps = {
    children: ReactNode;
};

export function AccessGate({ children }: AccessGateProps) {
    const { showAlert, withLoading } = useFeedback();
    const { user, status: sessionStatus, setUser } = useSession();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const redirectAway = () => {
        window.location.replace(REDIRECT_URL);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalizedEmail = email.trim();
        const normalizedCode = accessCode.trim();
        if (!normalizedEmail || !normalizedCode) {
            setError(t('login.missingMessage'));
            await showAlert({ tone: 'error', title: t('login.missingTitle'), message: t('login.missingMessage') });
            return;
        }

        setLoading(true);
        setError('');
        try {
            await withLoading(t('login.checking'), async () => {
                const response = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: normalizedEmail, accessCode: normalizedCode }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || t('login.genericError'));
                }
                setUser(data.user);
            });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('login.genericError');
            setError(message);
            setAccessCode('');
            setLoading(false);
            await showAlert({ tone: 'error', title: t('login.deniedTitle'), message });
        } finally {
            setLoading(false);
        }
    };

    if (sessionStatus === 'loading') return null;

    if (user) {
        return <>{children}</>;
    }

    return (
        <div className="relative min-h-screen text-white">
            {/*
             * Only a light tint here — no backdrop-blur. The glass panels below do their
             * own blurring, and they need a sharp, colourful backdrop to refract.
             */}
            <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/45 pt-[var(--a11y-bar-height,3.5rem)]">
                <div className="aurora-field">
                    <span />
                    <span />
                    <span />
                </div>

                {/* glass-tile rather than glass-panel: the panel sets position:relative,
                    which would beat Tailwind's `fixed` and drop this into the flow. */}
                <button
                    type="button"
                    onClick={redirectAway}
                    className="glass-tile fixed right-5 top-[calc(var(--a11y-bar-height,3.5rem)+1.25rem)] z-[110] inline-flex h-12 w-12 items-center justify-center rounded-full text-sky-200 hover:text-white focus:outline-none"
                    aria-label={t('login.backHome')}
                    title={t('login.backHome')}
                >
                    <Home className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-5 py-14 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
                    <LandingPanel />

                    <form onSubmit={handleSubmit} className="glass-panel relative w-full shrink-0 rounded-[28px] p-7 lg:max-w-sm">
                    {/* The landing panel is desktop-only, so small screens get the brand here. */}
                    <div className="relative mb-6 flex items-center gap-3 lg:hidden">
                        <div className="glass-tile h-11 w-11 overflow-hidden rounded-2xl">
                            {/* eslint-disable-next-line @next/next/no-img-element -- static asset under basePath */}
                            <img src={assetPath('/logo.webp')} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div>
                            <span className="block text-xl font-bold tracking-tight text-white">Roomie</span>
                            <span className="block text-xs text-white/50">{t('login.tagline')}</span>
                        </div>
                    </div>

                    <div className="relative mb-5">
                        <h1 className="text-xl font-bold text-white">{t('login.title')}</h1>
                        <p className="mt-1 text-sm text-white/60">{t('login.subtitle')}</p>
                    </div>

                    <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="roomie-email">
                        {t('login.placeEmail')}
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
                        placeholder={t('login.placePlaceholder')}
                        autoFocus
                    />

                    <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="roomie-access-code">
                        {t('login.accessCode')}
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
                            placeholder={t('login.accessCodePlaceholder')}
                        />
                        <button
                            type="button"
                            onClick={() => setIsAccessCodeVisible((value) => !value)}
                            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
                            aria-label={isAccessCodeVisible ? t('login.hideCode') : t('login.showCode')}
                            title={isAccessCodeVisible ? t('login.hideCode') : t('login.showCode')}
                        >
                            {isAccessCodeVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={redirectAway}
                            className="glass-button button-neutral flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-bold"
                        >
                            <X className="h-4 w-4" />
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={loading} className="glass-button button-primary flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-bold disabled:opacity-60">
                            <ArrowRight className="h-4 w-4" />
                            {loading ? t('common.processing') : t('login.continue')}
                        </button>
                    </div>

                    <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/40">
{t('login.footerNote')}
                    </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

const HIGHLIGHTS = [
    { icon: CalendarCheck, titleKey: 'login.feature1Title', textKey: 'login.feature1Text', accent: 'text-sky-300' },
    { icon: ShieldCheck, titleKey: 'login.feature2Title', textKey: 'login.feature2Text', accent: 'text-emerald-300' },
    { icon: Users, titleKey: 'login.feature3Title', textKey: 'login.feature3Text', accent: 'text-violet-300' },
] as const;

/** Marketing half of the sign-in screen. Hidden below `lg`, where the form is the whole page. */
function LandingPanel() {
    const { t } = useTranslation();

    // No brand block here: the accessibility bar above already carries the logo.
    return (
        <section className="hidden flex-1 lg:block">
            <h2 className="text-4xl font-bold leading-tight text-white">
                {t('login.heroLine1')}
                <br />
                <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                    {t('login.heroLine2')}
                </span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/60">
                {t('login.heroSubtitle')}
            </p>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
                {['/hero/room1.webp', '/hero/room2.webp', '/hero/room3.webp'].map((src, index) => (
                    <div
                        key={src}
                        className={`glass-tile glass-tile-hover overflow-hidden rounded-3xl p-1.5 ${
                            index === 1 ? 'mt-7' : ''
                        }`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element -- static asset under basePath */}
                        <img
                            src={assetPath(src)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-32 w-full rounded-2xl object-cover"
                        />
                    </div>
                ))}
            </div>

            <ul className="mt-9 max-w-lg space-y-3">
                {HIGHLIGHTS.map(({ icon: Icon, titleKey, textKey, accent }) => (
                    <li key={titleKey} className="glass-tile glass-tile-hover flex gap-3.5 rounded-2xl p-3.5">
                        <span className="glass-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                            <Icon className={`h-5 w-5 ${accent}`} />
                        </span>
                        <span>
                            <span className="block font-semibold text-white">{t(titleKey)}</span>
                            <span className="block text-sm leading-relaxed text-white/60">{t(textKey)}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
