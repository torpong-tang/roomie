'use client';

import { LogOut } from 'lucide-react';
import { apiPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';
import { useTranslation } from '@/components/translation-provider';

export function LogoutButton() {
    const { showAlert, showConfirm, withLoading } = useFeedback();
    const { t } = useTranslation();

    const handleLogout = async () => {
        const accepted = await showConfirm({
            title: t('logout.confirmTitle'),
            message: t('logout.confirmMessage'),
            confirmLabel: t('nav.logout'),
            tone: 'danger',
        });
        if (!accepted) return;

        try {
            await withLoading(t('logout.signingOut'), async () => {
                const response = await fetch(apiPath('/api/auth/logout'), { method: 'POST' });
                if (!response.ok) throw new Error('Unable to log out.');
            });
            await showAlert({ tone: 'success', title: t('logout.successTitle'), message: t('logout.successMessage') });
            window.location.href = apiPath('/');
        } catch {
            await showAlert({ tone: 'error', title: t('logout.failTitle'), message: t('logout.failMessage') });
        }
    };

    return (
        <button
            onClick={handleLogout}
            // The label turns white on hover, so pin the glow to rose rather than
            // letting it follow currentColor.
            className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-2 py-2 text-rose-300 transition-colors [--glow-color:var(--color-rose-400)] hover:bg-rose-500/20 hover:text-white"
            title={t('nav.logout')}
        >
            <LogOut className="h-5 w-5 text-red-300" />
            <span className="hidden md:inline">{t('nav.logout')}</span>
        </button>
    );
}
