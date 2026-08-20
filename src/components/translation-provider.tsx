'use client';

import { useCallback, useMemo } from 'react';
import { usePreferences } from '@/components/preferences-provider';
import { translate, TranslateValues, TranslationKey } from '@/lib/i18n';

/**
 * Thin wrapper over the dictionary so components only deal with `t('some.key')`.
 * The identity of `t` changes with the language, which is what makes memoised
 * callbacks and effects re-run when the user switches TH/EN.
 */
export function useTranslation() {
    const { language } = usePreferences();

    const t = useCallback(
        (key: TranslationKey, values?: TranslateValues) => translate(language, key, values),
        [language]
    );

    return useMemo(() => ({ t, language }), [t, language]);
}
