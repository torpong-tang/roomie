'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, LayoutDashboard, PlusCircle, ShieldCheck } from 'lucide-react';
import { apiPath } from '@/lib/paths';
import { LogoutButton } from '@/components/logout-button';
import { OnboardingTour } from '@/components/onboarding-tour';
import { useFeedback } from '@/components/feedback-provider';

export function AppNavigation() {
    const { withLoading } = useFeedback();
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        void withLoading('Loading navigation...', async () => {
            try {
                const response = await fetch(apiPath('/api/auth/me'));
                const data = await response.json();
                setRole(data.user?.role ?? null);
            } catch {
                setRole(null);
            }
        });
    }, [withLoading]);

    const isAdmin = role === 'admin';

    return (
        <nav className="flex items-center gap-3 md:gap-6">
            <Link href="/" data-tour="calendar-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                <LayoutDashboard className="h-5 w-5 text-blue-400" />
                <span className="hidden md:inline">Calendar</span>
            </Link>
            <Link href="/bookings" data-tour="history-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <span className="hidden md:inline">History</span>
            </Link>
            <Link href="/analytics" data-tour="insights-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                <span className="hidden md:inline">Insights</span>
            </Link>
            {isAdmin ? (
                <>
                    <Link href="/rooms" data-tour="rooms-nav" className="flex items-center gap-2 border-l border-white/10 pl-3 font-medium text-white transition-colors hover:text-white/80 md:pl-6">
                        <PlusCircle className="h-5 w-5 text-emerald-400" />
                        <span className="hidden md:inline">Rooms</span>
                    </Link>
                    <Link href="/admin/users" data-tour="access-nav" className="flex items-center gap-2 font-medium text-white transition-colors hover:text-white/80">
                        <ShieldCheck className="h-5 w-5 text-amber-300" />
                        <span className="hidden md:inline">Access</span>
                    </Link>
                </>
            ) : null}
            {role ? <OnboardingTour role={role} /> : null}
            <LogoutButton />
        </nav>
    );
}
