'use client';

import { useTranslation } from '@/components/translation-provider';

export function AppFooter() {
    const { t } = useTranslation();

    return (
        <footer className="px-6 pb-6 text-center text-sm font-medium text-slate-400">
            {t('nav.footer')}
        </footer>
    );
}
