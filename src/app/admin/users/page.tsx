'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ShieldCheck, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiPath } from '@/lib/paths';

type AppUser = {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(apiPath('/api/admin/users'));
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Unable to load users.');
                return;
            }
            setUsers(data);
        } catch {
            setError('Unable to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        const response = await fetch(apiPath('/api/admin/users'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || 'Unable to save user.');
            return;
        }
        setEmail('');
        setRole('user');
        fetchUsers();
    };

    const updateUser = async (user: AppUser, changes: Partial<Pick<AppUser, 'role' | 'isActive'>>) => {
        setError('');
        const response = await fetch(apiPath(`/api/admin/users/${user.id}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: changes.role ?? user.role,
                isActive: changes.isActive ?? user.isActive,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || 'Unable to update user.');
            return;
        }
        fetchUsers();
    };

    const deleteUser = async (user: AppUser) => {
        if (!confirm(`Remove access for ${user.email}?`)) return;
        const response = await fetch(apiPath(`/api/admin/users/${user.id}`), { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
            setError(data.error || 'Unable to remove user.');
            return;
        }
        fetchUsers();
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
                <h1 className="text-3xl font-bold text-white">Admin Users</h1>
            </div>

            <form onSubmit={handleCreate} className="glass-card grid gap-4 p-6 md:grid-cols-[1fr_160px_auto]">
                <input
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="glass-input rounded-lg p-3 outline-hidden"
                    placeholder="user@example.com"
                    required
                />
                <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="glass-input rounded-lg bg-slate-900 p-3 outline-hidden"
                >
                    <option value="readonly">Read only</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" className="glass-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold">
                    <Plus className="h-4 w-4" />
                    Add
                </button>
            </form>

            {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div>}

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-white/50">
                        <tr>
                            <th className="px-5 py-4">Email</th>
                            <th className="px-5 py-4">Role</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user) => (
                            <tr key={user.id} className="text-white/80">
                                <td className="px-5 py-4 font-medium text-white">{user.email}</td>
                                <td className="px-5 py-4">
                                    <select
                                        value={user.role}
                                        onChange={(event) => updateUser(user, { role: event.target.value })}
                                        className="glass-input rounded-lg bg-slate-900 px-3 py-2 outline-hidden"
                                    >
                                        <option value="readonly">Read only</option>
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={user.isActive ? 'text-emerald-300' : 'text-white/30'}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => updateUser(user, { isActive: !user.isActive })}
                                            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                                            title={user.isActive ? 'Disable' : 'Enable'}
                                        >
                                            {user.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                        </button>
                                        <button
                                            onClick={() => deleteUser(user)}
                                            className="rounded-lg p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
                                            title="Remove"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-12 text-center text-white/40">No users yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
