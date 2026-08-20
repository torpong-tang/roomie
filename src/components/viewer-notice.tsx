'use client';

import Link from 'next/link';
import { Eye, LayoutDashboard } from 'lucide-react';
import { useTranslation } from '@/components/translation-provider';
import type { TranslationKey } from '@/lib/i18n';

/** Shown when a view-only session opens a page that is not part of its access. */
export function ViewerNotice({ pageKey }: { pageKey: TranslationKey }) {
    const { t } = useTranslation();

    return (
        <div className="glass-card mx-auto max-w-xl p-8 text-center text-white/70">
            <Eye className="mx-auto mb-4 h-10 w-10 text-sky-400" />
            <h1 className="mb-2 text-xl font-bold text-white">{t('viewer.title', { page: t(pageKey) })}</h1>
            <p className="mb-6">{t('viewer.text')}</p>
            <Link href="/" className="glass-button button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold">
                <LayoutDashboard className="h-4 w-4" />
                {t('viewer.back')}
            </Link>
        </div>
    );
}
