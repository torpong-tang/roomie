'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import type { AllowedButtons, Driver } from 'driver.js';
import { useTranslation } from '@/components/translation-provider';

type OnboardingTourProps = {
    role: string;
};

type TourStep = {
    id: string;
    selector: string;
    title: string;
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
};

const REPLAY_KEY = 'roomie-tour-replay';

function isCalendarPath(pathname: string) {
    return pathname === '/' || pathname === '/roomie' || pathname === '/roomie/';
}

export function OnboardingTour({ role }: OnboardingTourProps) {
    const { t } = useTranslation();
    const pathname = usePathname();
    const router = useRouter();
    const activeTour = useRef<Driver | null>(null);
    const autoLaunchChecked = useRef(false);

    const startTour = useCallback(async () => {
        if (!isCalendarPath(pathname)) return;

        activeTour.current?.destroy();
        const { driver } = await import('driver.js');
        const isAdmin = role === 'admin';
        const steps: TourStep[] = [
            {
                id: 'welcome',
                selector: '[data-tour="brand"]',
                title: t('tour.welcomeTitle'),
                text: t('tour.welcomeText'),
                position: 'bottom' as const,
            },
            {
                id: 'place',
                selector: '[data-tour="place-selector"]',
                title: t('tour.placeTitle'),
                text: isAdmin ? t('tour.placeTextAdmin') : t('tour.placeTextUser'),
            },
            {
                id: 'room',
                selector: '[data-tour="room-selector"]',
                title: t('tour.roomTitle'),
                text: t('tour.roomText'),
            },
            {
                id: 'calendar',
                selector: '[data-tour="calendar-grid"]',
                title: t('tour.calendarTitle'),
                text: t('tour.calendarText'),
                position: 'top' as const,
            },
            {
                id: 'booking',
                selector: '[data-tour="new-booking"]',
                title: t('tour.bookingTitle'),
                text: t('tour.bookingText'),
                position: 'left' as const,
            },
            ...(isAdmin ? [
                {
                    id: 'rooms',
                    selector: '[data-tour="rooms-nav"]',
                    title: t('tour.roomsTitle'),
                    text: t('tour.roomsText'),
                    position: 'bottom' as const,
                },
                {
                    id: 'access',
                    selector: '[data-tour="access-nav"]',
                    title: t('tour.accessTitle'),
                    text: t('tour.accessText'),
                    position: 'bottom' as const,
                },
            ] : []),
            {
                id: 'history',
                selector: '[data-tour="history-nav"]',
                title: t('tour.historyTitle'),
                text: t('tour.historyText'),
                position: 'bottom' as const,
            },
        ].filter((step) => document.querySelector(step.selector));

        if (steps.length === 0) return;

        const completionKey = `roomie-tour-${role}-v1`;
        const markAsSeen = () => window.localStorage.setItem(completionKey, 'seen');
        const tour = driver({
            animate: true,
            allowClose: true,
            overlayColor: '#020617',
            overlayOpacity: 0.74,
            smoothScroll: true,
            stagePadding: 8,
            stageRadius: 12,
            popoverClass: 'roomie-tour',
            showProgress: true,
            progressText: t('tour.progress', { current: '{{current}}', total: '{{total}}' }),
            nextBtnText: t('tour.next'),
            prevBtnText: t('tour.back'),
            doneBtnText: t('tour.finish'),
            onDestroyed: markAsSeen,
            onPopoverRender: (popover, { state }) => {
                const isLastStep = state.activeIndex === steps.length - 1;
                popover.previousButton.setAttribute('aria-label', t('tour.back'));
                popover.nextButton.setAttribute('aria-label', isLastStep ? t('tour.finish') : t('tour.next'));
                popover.nextButton.classList.toggle('tour-finish-btn', isLastStep);
            },
            steps: steps.map((step, index) => {
                const showButtons: AllowedButtons[] = index === 0 ? ['close', 'next'] : ['close', 'previous', 'next'];
                return {
                    element: step.selector,
                    popover: {
                        title: step.title,
                        description: step.text,
                        side: step.position ?? 'bottom',
                        align: 'start',
                        showButtons,
                    },
                };
            }),
        });

        activeTour.current = tour;
        tour.drive();
    }, [pathname, role, t]);

    useEffect(() => {
        if (!isCalendarPath(pathname) || autoLaunchChecked.current) return;
        const timer = window.setTimeout(() => {
            if (autoLaunchChecked.current) return;
            const completionKey = `roomie-tour-${role}-v1`;
            const shouldReplay = window.sessionStorage.getItem(REPLAY_KEY) === 'yes';
            if (!shouldReplay && window.localStorage.getItem(completionKey)) return;
            window.sessionStorage.removeItem(REPLAY_KEY);
            autoLaunchChecked.current = true;
            void startTour();
        }, 600);
        return () => window.clearTimeout(timer);
    }, [pathname, role, startTour]);

    useEffect(() => () => {
        activeTour.current?.destroy();
    }, []);

    const handleOpenTour = () => {
        if (isCalendarPath(pathname)) {
            void startTour();
            return;
        }
        window.sessionStorage.setItem(REPLAY_KEY, 'yes');
        router.push('/');
    };

    return (
        <button
            type="button"
            onClick={handleOpenTour}
            aria-label={t('nav.openTour')}
            title={t('nav.openTour')}
            className="flex items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
        >
            <CircleHelp className="h-5 w-5" />
            <span className="hidden lg:inline">{t('nav.tour')}</span>
        </button>
    );
}
