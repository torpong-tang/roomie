'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Building2, KeyRound, Plus, ShieldCheck, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';

type AppUser = {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
};

type Place = {
    id: string;
    key: string;
    isActive: boolean;
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
    const [users, setUsers] = useState<AppUser[]>([]);
    const [places, setPlaces] = useState<Place[]>([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [placeKey, setPlaceKey] = useState('');
    const [placeCode, setPlaceCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchAccessData = useCallback(async (showSpinner = true) => {
        const load = async () => {
            const [userResponse, placeResponse] = await Promise.all([
                fetch(apiPath('/api/admin/users')),
                fetch(apiPath('/api/admin/places')),
            ]);
            const usersData = await parseResponse(userResponse, 'Unable to load users.');
            const placesData = await parseResponse(placeResponse, 'Unable to load places.');
            if (!userResponse.ok || !placeResponse.ok) {
                throw new Error(usersData.error || placesData.error || 'Unable to load access settings.');
            }
            setUsers(usersData);
            setPlaces(placesData);
        };
        setLoading(true);
        setError('');
        try {
            if (showSpinner) {
                await withLoading('Loading access settings...', load);
            } else {
                await load();
            }
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to load access settings.';
            setError(message);
            if (showSpinner) {
                await showAlert({ tone: 'error', title: 'Unable to load settings', message });
                return;
            }
            throw caughtError;
        } finally {
            setLoading(false);
        }
    }, [showAlert, withLoading]);

    useEffect(() => {
        void fetchAccessData();
    }, [fetchAccessData]);

    const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            await withLoading('Adding user...', async () => {
                const response = await fetch(apiPath('/api/admin/users'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, role }),
                });
                const data = await parseResponse(response, 'Unable to save user.');
                if (!response.ok) throw new Error(data.error || 'Unable to save user.');
                await fetchAccessData(false);
            });
            setEmail('');
            setRole('user');
            await showAlert({ tone: 'success', title: 'User added', message: `${email} can now access Roomie.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to save user.';
            setError(message);
            await showAlert({ tone: 'error', title: 'Unable to add user', message });
        }
    };

    const handleCreatePlace = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            await withLoading('Adding place...', async () => {
                const response = await fetch(apiPath('/api/admin/places'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: placeKey, accessCode: placeCode }),
                });
                const data = await parseResponse(response, 'Unable to create place.');
                if (!response.ok) throw new Error(data.error || 'Unable to create place.');
                await fetchAccessData(false);
            });
            setPlaceKey('');
            setPlaceCode('');
            await showAlert({ tone: 'success', title: 'Place added', message: `${placeKey} is ready for meeting rooms and bookings.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to create place.';
            setError(message);
            await showAlert({ tone: 'error', title: 'Unable to add place', message });
        }
    };

    const updateUser = async (user: AppUser, changes: Partial<Pick<AppUser, 'role' | 'isActive'>>) => {
        try {
            await withLoading('Updating user...', async () => {
                const response = await fetch(apiPath(`/api/admin/users/${user.id}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: changes.role ?? user.role, isActive: changes.isActive ?? user.isActive }),
                });
                const data = await parseResponse(response, 'Unable to update user.');
                if (!response.ok) throw new Error(data.error || 'Unable to update user.');
                await fetchAccessData(false);
            });
            await showAlert({ tone: 'success', title: 'User updated', message: `${user.email} was updated successfully.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to update user.';
            setError(message);
            await showAlert({ tone: 'error', title: 'Unable to update user', message });
        }
    };

    const updatePlace = async (place: Place, changes: { isActive?: boolean; accessCode?: string }) => {
        try {
            await withLoading('Updating place...', async () => {
                const response = await fetch(apiPath(`/api/admin/places/${place.id}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(changes),
                });
                const data = await parseResponse(response, 'Unable to update place.');
                if (!response.ok) throw new Error(data.error || 'Unable to update place.');
                await fetchAccessData(false);
            });
            await showAlert({ tone: 'success', title: 'Place updated', message: `${place.key} was updated successfully.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to update place.';
            setError(message);
            await showAlert({ tone: 'error', title: 'Unable to update place', message });
        }
    };

    const resetPlaceCode = async (place: Place) => {
        const accessCode = window.prompt(`New access code for ${place.key} (minimum 6 characters)`);
        if (accessCode) await updatePlace(place, { accessCode });
    };

    const deleteUser = async (user: AppUser) => {
        const confirmed = await showConfirm({
            title: 'Remove user access?',
            message: `${user.email} will no longer be able to sign in to Roomie.`,
            confirmLabel: 'Remove User',
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await withLoading('Removing user...', async () => {
                const response = await fetch(apiPath(`/api/admin/users/${user.id}`), { method: 'DELETE' });
                const data = await parseResponse(response, 'Unable to remove user.');
                if (!response.ok) throw new Error(data.error || 'Unable to remove user.');
                await fetchAccessData(false);
            });
            await showAlert({ tone: 'success', title: 'User removed', message: `${user.email} was removed from Roomie access.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to remove user.';
            setError(message);
            await showAlert({ tone: 'error', title: 'Unable to remove user', message });
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <div>
                    <h1 className="text-3xl font-bold text-white">Access Management</h1>
                    <p className="text-sm text-white/50">Admin accounts and place access codes for Roomie.</p>
                </div>
            </div>

            {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                    <Building2 className="h-5 w-5 text-sky-400" />
                    Places
                </h2>
                <form onSubmit={handleCreatePlace} className="glass-card grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto]">
                    <input value={placeKey} onChange={(event) => setPlaceKey(event.target.value)} className="glass-input rounded-lg p-3" placeholder="Place, e.g. pea@led5" required />
                    <input type="password" value={placeCode} onChange={(event) => setPlaceCode(event.target.value)} className="glass-input rounded-lg p-3" placeholder="Access code" required />
                    <button type="submit" className="glass-button button-warning flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold">
                        <Plus className="h-4 w-4" /> Add Place
                    </button>
                </form>
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-white/50">
                            <tr><th className="px-5 py-4">Place</th><th className="px-5 py-4">Rooms</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {places.map((place) => (
                                <tr key={place.id}>
                                    <td className="px-5 py-4 font-medium text-white">{place.key}</td>
                                    <td className="px-5 py-4 text-white/60">{place._count?.rooms ?? 0}</td>
                                    <td className="px-5 py-4 text-white/70">{place.isActive ? 'Active' : 'Inactive'}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => resetPlaceCode(place)} title="Set access code" className="rounded-lg bg-amber-400/10 p-2 text-amber-300 transition hover:bg-amber-400/20">
                                                <KeyRound className="h-5 w-5" />
                                            </button>
                                            <button type="button" onClick={() => updatePlace(place, { isActive: !place.isActive })} title={place.isActive ? 'Disable place' : 'Enable place'} className="rounded-lg bg-sky-400/10 p-2 text-sky-300 transition hover:bg-sky-400/20">
                                                {place.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && places.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-white/40">No places configured.</td></tr> : null}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" /> Admin and Named Users
                </h2>
                <form onSubmit={handleCreateUser} className="glass-card grid gap-4 p-6 md:grid-cols-[1fr_160px_auto]">
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="glass-input rounded-lg p-3" placeholder="admin@example.com" required />
                    <select value={role} onChange={(event) => setRole(event.target.value)} className="glass-input rounded-lg bg-slate-900 p-3">
                        <option value="readonly">Read only</option><option value="user">User</option><option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="glass-button button-success flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold"><Plus className="h-4 w-4" /> Add User</button>
                </form>
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-white/50">
                            <tr><th className="px-5 py-4">Email</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <tr key={user.id} className="text-white/80">
                                    <td className="px-5 py-4 font-medium text-white">{user.email}</td>
                                    <td className="px-5 py-4">
                                        <select value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })} className="glass-input rounded-lg bg-slate-900 px-3 py-2">
                                            <option value="readonly">Read only</option><option value="user">User</option><option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-5 py-4">{user.isActive ? 'Active' : 'Inactive'}</td>
                                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => updateUser(user, { isActive: !user.isActive })} title={user.isActive ? 'Disable' : 'Enable'} className="rounded-lg bg-sky-400/10 p-2 text-sky-300 transition hover:bg-sky-400/20">
                                            {user.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                        </button>
                                        <button type="button" onClick={() => deleteUser(user)} title="Remove" className="rounded-lg bg-rose-500/10 p-2 text-rose-300 transition hover:bg-rose-500/20"><Trash2 className="h-5 w-5" /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
