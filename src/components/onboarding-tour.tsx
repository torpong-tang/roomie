'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import type { AllowedButtons, Driver } from 'driver.js';

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
                title: 'Welcome to Roomie',
                text: 'จองห้องประชุมและตรวจตารางว่างได้จากหน้า Calendar นี้',
                position: 'bottom' as const,
            },
            {
                id: 'place',
                selector: '[data-tour="place-selector"]',
                title: 'Place',
                text: isAdmin
                    ? 'Admin สามารถสลับสถานที่เพื่อดูและจองห้องของแต่ละสาขาได้'
                    : 'สถานที่นี้ถูกกำหนดจากสิทธิ์เข้าใช้งานของคุณ',
            },
            {
                id: 'room',
                selector: '[data-tour="room-selector"]',
                title: 'Meeting Room',
                text: 'กรองตารางให้แสดงเฉพาะห้องประชุมที่ต้องการตรวจสอบ',
            },
            {
                id: 'calendar',
                selector: '[data-tour="calendar-grid"]',
                title: 'Availability Calendar',
                text: 'เลือกวันที่เพื่อดู Agenda และรายการจองที่มีอยู่',
                position: 'top' as const,
            },
            {
                id: 'booking',
                selector: '[data-tour="new-booking"]',
                title: 'Create Booking',
                text: 'เริ่มการจองใหม่ พร้อมระบุหัวข้อ เวลา ผู้จอง และช่องทางติดต่อกลับ',
                position: 'left' as const,
            },
            ...(isAdmin ? [
                {
                    id: 'rooms',
                    selector: '[data-tour="rooms-nav"]',
                    title: 'Manage Rooms',
                    text: 'จัดการห้องประชุมและกำหนดว่าสังกัดสถานที่ใด',
                    position: 'bottom' as const,
                },
                {
                    id: 'access',
                    selector: '[data-tour="access-nav"]',
                    title: 'Access Management',
                    text: 'สร้างสถานที่ รหัสเข้าใช้งาน และสิทธิ์ผู้ดูแลระบบจากเมนูนี้',
                    position: 'bottom' as const,
                },
            ] : []),
            {
                id: 'history',
                selector: '[data-tour="history-nav"]',
                title: 'Booking History',
                text: 'เรียกดูประวัติการจองและส่งออกรายการเมื่อจำเป็น',
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
            progressText: '{{current}} of {{total}}',
            nextBtnText: 'Next',
            prevBtnText: 'Back',
            doneBtnText: 'Finish',
            onDestroyed: markAsSeen,
            onPopoverRender: (popover, { state }) => {
                const isLastStep = state.activeIndex === steps.length - 1;
                popover.previousButton.setAttribute('aria-label', 'Back to previous step');
                popover.nextButton.setAttribute('aria-label', isLastStep ? 'Finish guided tour' : 'Continue to next step');
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
    }, [pathname, role]);

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
            aria-label="Open guided tour"
            title="Guided tour"
            className="flex items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25"
        >
            <CircleHelp className="h-5 w-5" />
            <span className="hidden lg:inline">Tour</span>
        </button>
    );
}
