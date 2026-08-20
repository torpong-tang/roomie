'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

export type Language = 'th' | 'en';
export type ColorMode = 'default' | 'contrast' | 'grayscale';

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.5;
export const FONT_SCALE_STEP = 0.05;
export const FONT_SCALE_DEFAULT = 1;

export const STORAGE_KEY = 'roomie-preferences';

type Preferences = {
    language: Language;
    colorMode: ColorMode;
    fontScale: number;
};

const DEFAULTS: Preferences = {
    language: 'th',
    colorMode: 'default',
    fontScale: FONT_SCALE_DEFAULT,
};

const clampScale = (value: number) =>
    Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number.isFinite(value) ? value : FONT_SCALE_DEFAULT));

const readStored = (): Preferences => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULTS;
        const parsed = JSON.parse(raw);
        return {
            language: parsed.language === 'en' ? 'en' : 'th',
            colorMode: ['contrast', 'grayscale'].includes(parsed.colorMode) ? parsed.colorMode : 'default',
            fontScale: clampScale(Number(parsed.fontScale)),
        };
    } catch {
        return DEFAULTS;
    }
};

/**
 * Preferences live in a tiny module-level store rather than component state.
 * useSyncExternalStore then gives the server the defaults and the browser the
 * saved values without a hydration mismatch, and without a setState-in-effect.
 */
let snapshot: Preferences = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

const getSnapshot = () => {
    if (!loaded) {
        snapshot = readStored();
        loaded = true;
    }
    return snapshot;
};

const getServerSnapshot = () => DEFAULTS;

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/** The inline script in the layout applies the same three lines before first paint. */
const applyToDocument = ({ language, colorMode, fontScale }: Preferences) => {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.colorMode = colorMode;
    root.style.setProperty('--font-scale', String(fontScale));
};

const update = (patch: Partial<Preferences>) => {
    snapshot = { ...getSnapshot(), ...patch };
    loaded = true;
    applyToDocument(snapshot);
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Private browsing or a full quota: the preference just will not persist.
    }
    listeners.forEach((listener) => listener());
};

type PreferencesContextValue = Preferences & {
    setLanguage: (language: Language) => void;
    setColorMode: (mode: ColorMode) => void;
    setFontScale: (scale: number) => void;
    resetFontScale: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const preferences = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    /*
     * Hydration resets <html> to the attributes in the server markup, undoing what
     * the pre-paint script wrote. Re-applying here restores the saved preferences
     * once React has taken over, and keeps them in sync on every later change.
     */
    useEffect(() => {
        applyToDocument(preferences);
    }, [preferences]);

    const value = useMemo<PreferencesContextValue>(
        () => ({
            ...preferences,
            setLanguage: (language) => update({ language }),
            setColorMode: (colorMode) => update({ colorMode }),
            setFontScale: (fontScale) => update({ fontScale: clampScale(fontScale) }),
            resetFontScale: () => update({ fontScale: FONT_SCALE_DEFAULT }),
        }),
        [preferences]
    );

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('usePreferences must be used within PreferencesProvider.');
    }
    return context;
}
