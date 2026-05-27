'use client';

import { LogOut } from 'lucide-react';
import { apiPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';

export function LogoutButton() {
    const { showAlert, showConfirm, withLoading } = useFeedback();

    const handleLogout = async () => {
        const accepted = await showConfirm({
            title: 'Sign out of Roomie?',
            message: 'You will need your place access code or admin account to enter again.',
            confirmLabel: 'Logout',
            tone: 'danger',
        });
        if (!accepted) return;

        try {
            await withLoading('Signing out...', async () => {
                const response = await fetch(apiPath('/api/auth/logout'), { method: 'POST' });
                if (!response.ok) throw new Error('Unable to log out.');
            });
            await showAlert({ tone: 'success', title: 'Signed out', message: 'You have signed out of Roomie successfully.' });
            window.location.href = apiPath('/');
        } catch {
            await showAlert({ tone: 'error', title: 'Logout failed', message: 'Unable to sign out right now. Please try again.' });
        }
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-2 py-2 text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-white"
            title="Logout"
        >
            <LogOut className="h-5 w-5 text-red-300" />
            <span className="hidden md:inline">Logout</span>
        </button>
    );
}
