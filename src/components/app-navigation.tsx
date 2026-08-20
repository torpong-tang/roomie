'use client';

import Link from 'next/link';
import { BarChart3, Calendar, LayoutDashboard, PlusCircle, ShieldCheck } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { OnboardingTour } from '@/components/onboarding-tour';
import { useSession } from '@/components/session-provider';
import { useTranslation } from '@/components/translation-provider';

export function AppNavigation() {
    const { user, isAdmin, isViewer } = useSession();
    const { t } = useTranslation();

    return (
        <nav className="flex items-center gap-3 md:gap-6">
            <Link href="/" data-tour="calendar-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                <LayoutDashboard className="h-5 w-5 text-blue-400" />
                <span className="hidden md:inline">{t('nav.calendar')}</span>
            </Link>
            {/* Viewers get the calendar and its agenda only. */}
            {!isViewer ? (
                <>
                    <Link href="/bookings" data-tour="history-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                        <Calendar className="h-5 w-5 text-indigo-400" />
                        <span className="hidden md:inline">{t('nav.history')}</span>
                    </Link>
                    <Link href="/analytics" data-tour="insights-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        <span className="hidden md:inline">{t('nav.insights')}</span>
                    </Link>
                </>
            ) : null}
            {isAdmin ? (
                <>
                    <Link href="/rooms" data-tour="rooms-nav" className="flex items-center gap-2 border-l border-white/10 pl-3 font-medium text-white transition-colors hover:text-white/80 md:pl-6">
                        <PlusCircle className="h-5 w-5 text-emerald-400" />
                        <span className="hidden md:inline">{t('nav.rooms')}</span>
                    </Link>
                    <Link href="/admin/users" data-tour="access-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                        <ShieldCheck className="h-5 w-5 text-amber-300" />
                        <span className="hidden md:inline">{t('nav.access')}</span>
                    </Link>
                </>
            ) : null}
            {user ? <OnboardingTour role={user.role} /> : null}
            <LogoutButton />
        </nav>
    );
}
