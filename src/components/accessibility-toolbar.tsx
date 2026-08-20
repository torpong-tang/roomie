'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CaseSensitive, Contrast, Languages } from 'lucide-react';
import { assetPath } from '@/lib/paths';
import {
    ColorMode,
    FONT_SCALE_MAX,
    FONT_SCALE_MIN,
    FONT_SCALE_STEP,
    Language,
    usePreferences,
} from '@/components/preferences-provider';
import { useTranslation } from '@/components/translation-provider';
import type { TranslationKey } from '@/lib/i18n';

const COLOR_MODES: { mode: ColorMode; labelKey: TranslationKey }[] = [
    { mode: 'default', labelKey: 'toolbar.colorDefault' },
    { mode: 'contrast', labelKey: 'toolbar.colorContrast' },
    { mode: 'grayscale', labelKey: 'toolbar.colorGrayscale' },
];

const LANGUAGES: { code: Language; short: string; labelKey: TranslationKey }[] = [
    { code: 'th', short: 'TH', labelKey: 'toolbar.thai' },
    { code: 'en', short: 'EN', labelKey: 'toolbar.english' },
];

export function AccessibilityToolbar() {
    const { fontScale, setFontScale, resetFontScale, colorMode, setColorMode, language, setLanguage } =
        usePreferences();
    const { t } = useTranslation();
    const bar = useRef<HTMLDivElement>(null);
    const percent = Math.round(fontScale * 100);
    // CSS cannot read an input's value, so the filled part of the track is fed in here.
    const trackProgress = ((fontScale - FONT_SCALE_MIN) / (FONT_SCALE_MAX - FONT_SCALE_MIN)) * 100;

    /*
     * The bar is fixed at the top, so the page needs to know how tall it is: the
     * body pads itself by that much and the sticky app header parks just below it.
     * Its height changes with the font scale and with wrapping on narrow screens,
     * so it is measured rather than hard-coded.
     */
    useEffect(() => {
        const element = bar.current;
        if (!element) return;

        const publishHeight = () => {
            document.documentElement.style.setProperty('--a11y-bar-height', `${element.offsetHeight}px`);
        };
        publishHeight();

        const observer = new ResizeObserver(publishHeight);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={bar}
            role="group"
            aria-label={t('toolbar.label')}
            className="glass-panel fixed inset-x-0 top-0 z-[130] flex flex-wrap items-center gap-x-3 gap-y-2 border-x-0 border-t-0 px-3 py-2.5 sm:flex-nowrap sm:gap-x-4 sm:px-4"
        >
            {/* Brand, pinned to the far left of the bar. */}
            <Link
                href="/"
                data-tour="brand"
                className="group flex shrink-0 items-center gap-2.5 rounded-full pr-2 text-white"
            >
                <span className="glass-tile h-9 w-9 shrink-0 overflow-hidden rounded-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static asset under basePath */}
                    <img src={assetPath('/logo.webp')} alt="" className="h-full w-full object-cover" />
                </span>
                {/* Phones keep the mark only, so the bar does not eat a whole extra row. */}
                <span className="hidden whitespace-nowrap text-lg font-bold tracking-tight sm:inline">Roomie</span>
            </Link>

            {/* Controls fill the rest of the bar. */}
            <div className="flex flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:flex-nowrap sm:justify-end sm:gap-x-4">
            {/* Font size */}
            <div className="flex shrink-0 items-center gap-2.5">
                <label htmlFor="a11y-font-scale" className="hidden whitespace-nowrap text-sm font-medium text-white/80 sm:block">
                    {t('toolbar.fontSize')}
                </label>
                <input
                    id="a11y-font-scale"
                    type="range"
                    className="a11y-range"
                    min={FONT_SCALE_MIN}
                    max={FONT_SCALE_MAX}
                    step={FONT_SCALE_STEP}
                    value={fontScale}
                    onChange={(event) => setFontScale(Number(event.target.value))}
                    aria-label={t('toolbar.fontSizeValue', { percent })}
                    aria-valuetext={`${percent}%`}
                    style={{ '--range-progress': `${trackProgress}%` } as React.CSSProperties}
                />
                <button
                    type="button"
                    onClick={resetFontScale}
                    title={t('toolbar.resetFontSize')}
                    aria-label={t('toolbar.resetFontSize')}
                    className="glass-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                >
                    <CaseSensitive className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>

            <span aria-hidden="true" className="hidden h-7 w-px bg-white/15 sm:block" />

            {/* Colour mode */}
            <div className="flex shrink-0 items-center gap-2">
                <Contrast className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
                <div className="glass-tile flex items-center gap-0.5 rounded-xl p-1" role="group" aria-label={t('toolbar.colorMode')}>
                    {COLOR_MODES.map(({ mode, labelKey }) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setColorMode(mode)}
                            aria-pressed={colorMode === mode}
                            className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                colorMode === mode
                                    ? 'bg-cyan-400 text-slate-950'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            {t(labelKey)}
                        </button>
                    ))}
                </div>
            </div>

            <span aria-hidden="true" className="hidden h-7 w-px bg-white/15 sm:block" />

            {/* Language */}
            <div className="flex shrink-0 items-center gap-2">
                <Languages className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
                <div className="glass-tile flex items-center gap-0.5 rounded-xl p-1" role="group" aria-label={t('toolbar.language')}>
                    {LANGUAGES.map(({ code, short, labelKey }) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => setLanguage(code)}
                            aria-pressed={language === code}
                            aria-label={t(labelKey)}
                            className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition ${
                                language === code
                                    ? 'bg-cyan-400 text-slate-950'
                                    : 'text-white/70 hover:text-white'
                            }`}
                        >
                            {short}
                        </button>
                    ))}
                </div>
            </div>
            </div>
        </div>
    );
}
