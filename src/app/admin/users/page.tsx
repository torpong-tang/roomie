'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Building2, Eye, EyeOff, KeyRound, Plus, ShieldCheck, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';
import { useTranslation } from '@/components/translation-provider';

type AppUser = {
    id: string;
    email: string;
    isActive: boolean;
};

type Place = {
    id: string;
    key: string;
    isActive: boolean;
    hasViewCode: boolean;
    _count?: { rooms: number };
};

async function parseResponse(response: Response, fallback: string) {
    try {
        return await response.json();
    } catch {
        return { error: fallback };
    }
}

export default function AdminUsersPage() {
    const { showAlert, showConfirm, withLoading } = useFeedback();
    const { t } = useTranslation();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [places, setPlaces] = useState<Place[]>([]);
    const [email, setEmail] = useState('');
    const [placeKey, setPlaceKey] = useState('');
    const [placeCode, setPlaceCode] = useState('');
    const [placeViewCode, setPlaceViewCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchAccessData = useCallback(async (showSpinner = true) => {
        const load = async () => {
            const [userResponse, placeResponse] = await Promise.all([
                fetch(apiPath('/api/admin/users')),
                fetch(apiPath('/api/admin/places')),
            ]);
            const usersData = await parseResponse(userResponse, t('access.loadUsersFail'));
            const placesData = await parseResponse(placeResponse, t('access.loadPlacesFail'));
            if (!userResponse.ok || !placeResponse.ok) {
                throw new Error(usersData.error || placesData.error || t('access.loadFailMessage'));
            }
            setUsers(usersData);
            setPlaces(placesData);
        };
        setLoading(true);
        setError('');
        try {
            if (showSpinner) {
                await withLoading(t('access.loadingSettings'), load);
            } else {
                await load();
            }
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('access.loadFailMessage');
            setError(message);
            if (showSpinner) {
                await showAlert({ tone: 'error', title: t('access.loadFailTitle'), message });
                return;
            }
            throw caughtError;
        } finally {
            setLoading(false);
        }
    }, [showAlert, withLoading, t]);

    useEffect(() => {
        void fetchAccessData();
    }, [fetchAccessData]);

    const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            await withLoading(t('access.addingUser'), async () => {
                const response = await fetch(apiPath('/api/admin/users'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const data = await parseResponse(response, t('access.adminAddFailMessage'));
                if (!response.ok) throw new Error(data.error || t('access.adminAddFailMessage'));
                await fetchAccessData(false);
            });
            setEmail('');
            await showAlert({ tone: 'success', title: t('access.adminAddedTitle'), message: t('access.adminAddedMessage', { email }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('access.adminAddFailMessage');
            setError(message);
            await showAlert({ tone: 'error', title: t('access.adminAddFailTitle'), message });
        }
    };

    const handleCreatePlace = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            await withLoading(t('access.addingPlace'), async () => {
                const response = await fetch(apiPath('/api/admin/places'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: placeKey, accessCode: placeCode, viewCode: placeViewCode }),
                });
                const data = await parseResponse(response, t('access.placeAddFailMessage'));
                if (!response.ok) throw new Error(data.error || t('access.placeAddFailMessage'));
                await fetchAccessData(false);
            });
            setPlaceKey('');
            setPlaceCode('');
            setPlaceViewCode('');
            await showAlert({ tone: 'success', title: t('access.placeAddedTitle'), message: t('access.placeAddedMessage', { place: placeKey }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('access.placeAddFailMessage');
            setError(message);
            await showAlert({ tone: 'error', title: t('access.placeAddFailTitle'), message });
        }
    };

    const updateUser = async (user: AppUser, isActive: boolean) => {
        try {
            await withLoading(t('access.updatingUser'), async () => {
                const response = await fetch(apiPath(`/api/admin/users/${user.id}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive }),
                });
                const data = await parseResponse(response, t('access.userUpdateFailMessage'));
                if (!response.ok) throw new Error(data.error || t('access.userUpdateFailMessage'));
                await fetchAccessData(false);
            });
            await showAlert({ tone: 'success', title: t('access.userUpdatedTitle'), message: t('access.userUpdatedMessage', { email: user.email }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('access.userUpdateFailMessage');
            setError(message);
            await showAlert({ tone: 'error', title: t('access.userUpdateFailTitle'), message });
        }
    };

    const updatePlace = async (place: Place, changes: { isActive?: boolean; accessCode?: string; viewCode?: string | null }) => {
        try {
            await withLoading(t('access.updatingPlace'), async () => {
                const response = await fetch(apiPath(`/api/admin/places/${place.id}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(changes),
                });
                const data = await parseResponse(response, t('access.placeUpdateFailMessage'));
                if (!response.ok) throw new Error(data.error || t('access.placeUpdateFailMessage'));
                await fetchAccessData(false);
            });
            await showAlert({ tone: 'success', title: t('access.placeUpdatedTitle'), message: t('access.placeUpdatedMessage', { place: place.key }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('access.placeUpdateFailMessage');
            setError(message);
            await showAlert({ tone: 'error', title: t('access.placeUpdateFailTitle'), message });
        }
    };

    const resetPlaceCode = async (place: Place) => {
        const accessCode = window.prompt(t('access.promptAccessCode', { place: place.key }));
        if (accessCode) await updatePlace(place, { accessCode });
    };

    const setViewCode = async (place: Place) => {
        const viewCode = window.prompt(t('access.promptViewCode', { place: place.key }));
        if (viewCode) await updatePlace(place, { viewCode });
    };

    const clearViewCode = async (place: Place) => {
        const confirmed = await showConfirm({
            title: t('access.removeViewTitle'),
            message: t('access.removeViewMessage', { place: place.key }),
            confirmLabel: t('access.removeViewConfirm'),
            tone: 'danger',
        });
        if (confirmed) await updatePlace(place, { viewCode: null });
    };

    const deleteUser = async (user: AppUser) => {
        const confirmed = await showConfirm({
            title: t('access.removeUserTitle'),
            message: t('access.removeUserMessage', { email: user.email }),
            confirmLabel: t('access.removeUserConfirm'),
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await withLoading(t('access.removingUser'), async () => {
                const response = await fetch(apiPath(`/api/admin/users/${user.id}`), { method: 'DELETE' });
                const data = await parseResponse(response, t('access.userRemoveFailMessage'));
                if (!response.ok) throw new Error(data.error || t('access.userRemoveFailMessage'));
                await fetchAccessData(false);
            });
            await showAlert({ tone: 'success', title: t('access.userRemovedTitle'), message: t('access.userRemovedMessage', { email: user.email }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('access.userRemoveFailMessage');
            setError(message);
            await showAlert({ tone: 'error', title: t('access.userRemoveFailTitle'), message });
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('access.title')}</h1>
                    <p className="text-sm text-white/50">{t('access.subtitle')}</p>
                </div>
            </div>

            {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                    <Building2 className="h-5 w-5 text-sky-400" />
                    {t('access.placesHeading')}
                </h2>
                <p className="text-sm text-white/50">
{t('access.placesHelp')}
                </p>
                <form onSubmit={handleCreatePlace} className="glass-card grid gap-4 p-6 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <input value={placeKey} onChange={(event) => setPlaceKey(event.target.value)} className="glass-input rounded-lg p-3" placeholder={t('access.placeKeyPlaceholder')} required />
                    <input type="password" value={placeCode} onChange={(event) => setPlaceCode(event.target.value)} className="glass-input rounded-lg p-3" placeholder={t('access.accessCodePlaceholder')} required />
                    <input type="password" value={placeViewCode} onChange={(event) => setPlaceViewCode(event.target.value)} className="glass-input rounded-lg p-3" placeholder={t('access.viewCodePlaceholder')} />
                    <button type="submit" className="glass-button button-warning flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold">
                        <Plus className="h-4 w-4" /> {t('access.addPlace')}
                    </button>
                </form>
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-white/50">
                            <tr><th className="px-5 py-4">{t('place.label')}</th><th className="px-5 py-4">{t('access.colRooms')}</th><th className="px-5 py-4">{t('common.status')}</th><th className="px-5 py-4">{t('access.colViewOnly')}</th><th className="px-5 py-4 text-right">{t('common.actions')}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {places.map((place) => (
                                <tr key={place.id}>
                                    <td className="px-5 py-4 font-medium text-white">{place.key}</td>
                                    <td className="px-5 py-4 text-white/60">{place._count?.rooms ?? 0}</td>
                                    <td className="px-5 py-4 text-white/70">{place.isActive ? t('common.active') : t('common.inactive')}</td>
                                    <td className="px-5 py-4">
                                        {place.hasViewCode
                                            ? <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">{t('access.viewEnabled')}</span>
                                            : <span className="text-xs text-white/35">{t('access.viewNotSet')}</span>}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => resetPlaceCode(place)} title={t('access.setAccessCode')} className="rounded-lg bg-amber-400/10 p-2 text-amber-300 transition hover:bg-amber-400/20">
                                                <KeyRound className="h-5 w-5" />
                                            </button>
                                            <button type="button" onClick={() => setViewCode(place)} title={place.hasViewCode ? t('access.changeViewCode') : t('access.setViewCode')} className="rounded-lg bg-violet-400/10 p-2 text-violet-300 transition hover:bg-violet-400/20">
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            {place.hasViewCode ? (
                                                <button type="button" onClick={() => clearViewCode(place)} title={t('access.removeViewCode')} className="rounded-lg bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20">
                                                    <EyeOff className="h-5 w-5" />
                                                </button>
                                            ) : null}
                                            <button type="button" onClick={() => updatePlace(place, { isActive: !place.isActive })} title={place.isActive ? t('access.disablePlace') : t('access.enablePlace')} className="rounded-lg bg-sky-400/10 p-2 text-sky-300 transition hover:bg-sky-400/20">
                                                {place.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && places.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-white/40">{t('access.noPlaces')}</td></tr> : null}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" /> {t('access.adminsHeading')}
                </h2>
                <p className="text-sm text-white/50">
{t('access.adminsHelp')}
                </p>
                <form onSubmit={handleCreateUser} className="glass-card grid gap-4 p-6 md:grid-cols-[1fr_auto]">
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="glass-input rounded-lg p-3" placeholder={t('access.emailPlaceholder')} required />
                    <button type="submit" className="glass-button button-success flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold"><Plus className="h-4 w-4" /> {t('access.addAdmin')}</button>
                </form>
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-white/50">
                            <tr><th className="px-5 py-4">{t('access.colEmail')}</th><th className="px-5 py-4">{t('common.status')}</th><th className="px-5 py-4 text-right">{t('common.actions')}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <tr key={user.id} className="text-white/80">
                                    <td className="px-5 py-4 font-medium text-white">{user.email}</td>
                                    <td className="px-5 py-4">{user.isActive ? t('common.active') : t('common.inactive')}</td>
                                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => updateUser(user, !user.isActive)} title={user.isActive ? t('access.disable') : t('access.enable')} className="rounded-lg bg-sky-400/10 p-2 text-sky-300 transition hover:bg-sky-400/20">
                                            {user.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                        </button>
                                        <button type="button" onClick={() => deleteUser(user)} title={t('access.removeTooltip')} className="rounded-lg bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20"><Trash2 className="h-5 w-5" /></button>
                                    </div></td>
                                </tr>
                            ))}
                            {!loading && users.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-white/40">{t('access.noAdmins')}</td></tr> : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
