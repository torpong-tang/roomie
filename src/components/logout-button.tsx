'use client';

import { LogOut } from 'lucide-react';
import { apiPath } from '@/lib/paths';

export function LogoutButton() {
    const handleLogout = async () => {
        await fetch(apiPath('/api/auth/logout'), { method: 'POST' });
        window.location.href = apiPath('/');
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/60 transition-colors hover:text-white"
            title="Logout"
        >
            <LogOut className="h-5 w-5 text-red-300" />
            <span className="hidden md:inline">Logout</span>
        </button>
    );
}
