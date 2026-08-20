'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, LoaderCircle, Trash2, X } from 'lucide-react';
import { useTranslation } from '@/components/translation-provider';

type AlertTone = 'success' | 'error' | 'info';
type ConfirmTone = 'primary' | 'danger';

type AlertOptions = {
    title: string;
    message: string;
    tone?: AlertTone;
};

type ConfirmOptions = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmTone;
};

type FeedbackContextValue = {
    showAlert: (options: AlertOptions) => Promise<void>;
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
    withLoading: <T>(message: string, task: () => Promise<T>) => Promise<T>;
};

type DialogState =
    | ({ kind: 'alert' } & AlertOptions)
    | ({ kind: 'confirm' } & ConfirmOptions)
    | null;

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const [dialog, setDialog] = useState<DialogState>(null);
    const [loadingCount, setLoadingCount] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Processing...');
    const resolveAlert = useRef<(() => void) | null>(null);
    const resolveConfirm = useRef<((value: boolean) => void) | null>(null);

    const showAlert = useCallback((options: AlertOptions) => new Promise<void>((resolve) => {
        resolveAlert.current = resolve;
        setDialog({ ...options, kind: 'alert', tone: options.tone ?? 'info' });
    }), []);

    const showConfirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
        resolveConfirm.current = resolve;
        setDialog({ ...options, kind: 'confirm', tone: options.tone ?? 'primary' });
    }), []);

    const withLoading = useCallback(async <T,>(message: string, task: () => Promise<T>) => {
        setLoadingMessage(message);
        setLoadingCount((count) => count + 1);
        try {
            return await task();
        } finally {
            setLoadingCount((count) => Math.max(0, count - 1));
        }
    }, []);

    const dismissAlert = () => {
        setDialog(null);
        resolveAlert.current?.();
        resolveAlert.current = null;
    };

    const settleConfirm = (accepted: boolean) => {
        setDialog(null);
        resolveConfirm.current?.(accepted);
        resolveConfirm.current = null;
    };

    const value = useMemo(() => ({ showAlert, showConfirm, withLoading }), [showAlert, showConfirm, withLoading]);
    const isLoading = loadingCount > 0;

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            {dialog ? (
                <div className="fixed inset-0 z-[1000000001] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm" role="presentation">
                    <section
                        role={dialog.kind === 'alert' ? 'alertdialog' : 'dialog'}
                        aria-modal="true"
                        aria-labelledby="feedback-title"
                        aria-describedby="feedback-message"
                        className="glass-card w-full max-w-md overflow-hidden border border-white/15 shadow-2xl shadow-black/50"
                    >
                        <div className="flex items-start gap-4 p-6">
                            <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                dialog.kind === 'confirm'
                                    ? 'bg-amber-400/15 text-amber-300'
                                    : dialog.tone === 'success'
                                        ? 'bg-emerald-400/15 text-emerald-300'
                                        : dialog.tone === 'error'
                                            ? 'bg-rose-400/15 text-rose-300'
                                            : 'bg-sky-400/15 text-sky-300'
                            }`}>
                                {dialog.kind === 'confirm'
                                    ? <HelpCircle className="h-6 w-6" />
                                    : dialog.tone === 'success'
                                        ? <CheckCircle2 className="h-6 w-6" />
                                        : <AlertCircle className="h-6 w-6" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 id="feedback-title" className="text-lg font-bold text-white">{dialog.title}</h2>
                                <p id="feedback-message" className="mt-2 text-sm leading-6 text-white/65">{dialog.message}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-white/10 p-4">
                            {dialog.kind === 'confirm' ? (
                                <>
                                    <button type="button" onClick={() => settleConfirm(false)} className="glass-button button-neutral flex items-center gap-2 rounded-xl px-5 py-3 font-bold">
                                        <X className="h-4 w-4" />
                                        {dialog.cancelLabel ?? t('common.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => settleConfirm(true)}
                                        className={`glass-button flex items-center gap-2 rounded-xl px-5 py-3 font-bold ${dialog.tone === 'danger' ? 'button-danger' : 'button-primary'}`}
                                    >
                                        {dialog.tone === 'danger' ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                        {dialog.confirmLabel ?? t('common.confirm')}
                                    </button>
                                </>
                            ) : (
                                <button type="button" autoFocus onClick={dismissAlert} className="glass-button button-primary flex items-center gap-2 rounded-xl px-5 py-3 font-bold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {t('common.ok')}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            ) : null}
            {isLoading ? (
                <div className="fixed inset-0 z-[1000000002] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm" role="status" aria-live="polite" aria-label={loadingMessage}>
                    <div className="glass-card flex min-w-[230px] flex-col items-center gap-4 p-7 text-center shadow-2xl shadow-black/45">
                        <LoaderCircle className="h-11 w-11 animate-spin text-sky-300" />
                        <p className="font-medium text-white">{loadingMessage}</p>
                    </div>
                </div>
            ) : null}
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within FeedbackProvider.');
    }
    return context;
}
