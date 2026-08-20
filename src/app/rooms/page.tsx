'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, DoorOpen, Edit2, Plus, Save, Trash2, Upload, Users, X } from 'lucide-react';
import { apiFetch, assetPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';
import { useSession } from '@/components/session-provider';
import { useTranslation } from '@/components/translation-provider';

type Place = { id: string; key: string };
type Room = {
    id: string;
    name: string;
    capacity: number;
    description: string | null;
    image: string | null;
    placeId: string | null;
    place?: Place | null;
};

export default function RoomsPage() {
    const { showAlert, showConfirm, withLoading } = useFeedback();
    const { isAdmin, status: sessionStatus } = useSession();
    const { t } = useTranslation();
    const [places, setPlaces] = useState<Place[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [description, setDescription] = useState('');
    const [placeId, setPlaceId] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editName, setEditName] = useState('');
    const [editCapacity, setEditCapacity] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPlaceId, setEditPlaceId] = useState('');

    const fetchRooms = async () => {
        const response = await apiFetch('/api/rooms');
        const data = await response.json();
        if (response.ok) setRooms(data);
    };

    useEffect(() => {
        if (sessionStatus !== 'ready' || !isAdmin) return;
        const load = async () => {
            try {
                await withLoading(t('rooms.loading'), async () => {
                    const [placesResponse] = await Promise.all([apiFetch('/api/places'), fetchRooms()]);
                    const placesData = await placesResponse.json();
                    if (!placesResponse.ok) throw new Error(t('access.loadPlacesFail'));
                    setPlaces(placesData);
                });
            } catch {
                setError(t('rooms.loadFailInline'));
                await showAlert({ tone: 'error', title: t('rooms.loadFailTitle'), message: t('rooms.loadFailMessage') });
            }
        };
        void load();
    }, [sessionStatus, isAdmin, showAlert, withLoading, t]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async () => {
        if (!image) return '';
        const formData = new FormData();
        formData.append('file', image);
        const response = await apiFetch('/api/upload', { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || t('rooms.uploadFailMessage'));
        return data.url as string;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await withLoading(t('rooms.creatingRoom'), async () => {
                const imageUrl = await uploadImage();
                const response = await apiFetch('/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, capacity: Number(capacity), description, image: imageUrl, placeId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || t('rooms.createFailMessage'));
                await fetchRooms();
            });
            setName('');
            setCapacity('');
            setDescription('');
            setPlaceId('');
            setImage(null);
            setPreview(null);
            setLoading(false);
            await showAlert({ tone: 'success', title: t('rooms.createdTitle'), message: t('rooms.createdMessage', { name }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('rooms.createFailMessage');
            setError(message);
            setLoading(false);
            await showAlert({ tone: 'error', title: t('rooms.createFailTitle'), message });
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (room: Room) => {
        setEditingRoom(room);
        setEditName(room.name);
        setEditCapacity(String(room.capacity));
        setEditDescription(room.description || '');
        setEditPlaceId(room.placeId || '');
    };

    const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingRoom) return;
        setLoading(true);
        setError('');
        try {
            await withLoading(t('rooms.updatingRoom'), async () => {
                const response = await apiFetch(`/api/rooms/${editingRoom.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editName, capacity: Number(editCapacity), description: editDescription, placeId: editPlaceId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || t('rooms.updateFailMessage'));
                await fetchRooms();
            });
            setEditingRoom(null);
            setLoading(false);
            await showAlert({ tone: 'success', title: t('rooms.updatedTitle'), message: t('rooms.updatedMessage', { name: editName }) });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : t('rooms.updateFailMessage');
            setError(message);
            setLoading(false);
            await showAlert({ tone: 'error', title: t('rooms.updateFailTitle'), message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (room: Room) => {
        const confirmed = await showConfirm({
            title: t('rooms.deleteTitle'),
            message: t('rooms.deleteMessage', { name: room.name, place: room.place?.key || t('common.unassigned') }),
            confirmLabel: t('rooms.deleteConfirm'),
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await withLoading(t('rooms.deletingRoom'), async () => {
                const response = await apiFetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || t('rooms.deleteFailMessage'));
                await fetchRooms();
            });
            await showAlert({ tone: 'success', title: t('rooms.deletedTitle'), message: t('rooms.deletedMessage', { name: room.name }) });
        } catch (caughtError) {
            await showAlert({ tone: 'error', title: t('rooms.deleteFailTitle'), message: caughtError instanceof Error ? caughtError.message : t('rooms.deleteFailMessage') });
        }
    };

    if (sessionStatus !== 'ready') {
        return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" /></div>;
    }

    if (!isAdmin) {
        return <div className="glass-card mx-auto max-w-xl p-8 text-center text-white/70"><ShieldMessage /></div>;
    }

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4">
            <div className="glass-card p-8">
                <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold text-white">
                    <DoorOpen className="h-8 w-8 text-sky-400" /> {t('rooms.title')}
                </h1>
                {error ? <p className="mb-5 rounded-lg bg-red-500/10 p-3 text-red-200">{error}</p> : null}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <FieldLabel text={t('place.label')}>
                            <select value={placeId} onChange={(event) => setPlaceId(event.target.value)} className="glass-input w-full rounded-lg bg-slate-900 p-3" required>
                                <option value="">{t('rooms.selectPlace')}</option>
                                {places.map((place) => <option key={place.id} value={place.id}>{place.key}</option>)}
                            </select>
                        </FieldLabel>
                        <FieldLabel text={t('rooms.roomName')}><input value={name} onChange={(event) => setName(event.target.value)} className="glass-input w-full rounded-lg p-3" placeholder={t('rooms.roomNamePlaceholder')} required /></FieldLabel>
                        <FieldLabel text={t('rooms.capacity')}><input type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="glass-input w-full rounded-lg p-3" placeholder={t('rooms.capacityPlaceholder')} required /></FieldLabel>
                        <FieldLabel text={t('rooms.description')}><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="glass-input h-24 w-full rounded-lg p-3" /></FieldLabel>
                    </div>
                    <div className="flex flex-col space-y-4">
                        <span className="font-medium text-white/80">{t('rooms.roomImage')}</span>
                        <div className="dropzone-field relative flex min-h-[200px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/20">
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob preview and authenticated /api/uploads images */}
                            {preview ? <img src={preview} alt="Room preview" className="h-full w-full object-cover" /> : <><Upload className="mb-2 h-12 w-12 text-white/40" /><p className="text-white/40">{t('rooms.chooseImage')}</p></>}
                            <input type="file" onChange={handleImageChange} className="absolute inset-0 cursor-pointer opacity-0" accept="image/*" />
                        </div>
                        <button type="submit" disabled={loading} className="glass-button button-success flex items-center justify-center gap-2 rounded-xl p-4 font-bold disabled:opacity-50">
                            <Plus className="h-5 w-5" /> {loading ? t('rooms.creating') : t('rooms.create')}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {rooms.map((room) => (
                    <article key={room.id} className="glass-card group overflow-hidden">
                        <div className="relative h-44">
                            {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated /api/uploads route */}
                            {room.image ? <img src={assetPath(room.image)} alt={room.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-white/5"><DoorOpen className="h-12 w-12 text-white/20" /></div>}
                            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-sm"><Users className="h-4 w-4" /> {room.capacity}</div>
                            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition group-hover:opacity-100">
                                <button type="button" title={t('rooms.editTooltip')} onClick={() => startEditing(room)} className="rounded-lg bg-violet-500/40 p-3 text-violet-100 transition hover:bg-violet-500/60"><Edit2 className="h-5 w-5" /></button>
                                <button type="button" title={t('rooms.deleteTooltip')} onClick={() => handleDelete(room)} className="rounded-lg bg-rose-500/40 p-3 text-rose-100 transition hover:bg-rose-500/60"><Trash2 className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="p-5">
                            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-sky-300"><Building2 className="h-3.5 w-3.5" /> {room.place?.key || t('common.unassigned')}</p>
                            <h3 className="font-bold text-white">{room.name}</h3>
                            <p className="mt-2 line-clamp-2 text-sm text-white/55">{room.description || t('rooms.noDescription')}</p>
                        </div>
                    </article>
                ))}
            </div>

            {editingRoom ? (
                <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center">
                    <div className="glass-card relative w-full max-w-md p-6 sm:p-8">
                        <button type="button" onClick={() => setEditingRoom(null)} title={t('common.close')} className="absolute right-4 top-4 text-white/50"><X className="h-6 w-6" /></button>
                        <h2 className="mb-6 text-2xl font-bold">{t('rooms.edit')}</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <FieldLabel text={t('place.label')}><select value={editPlaceId} onChange={(event) => setEditPlaceId(event.target.value)} className="glass-input w-full rounded-lg bg-slate-900 p-3" required><option value="">{t('rooms.selectPlace')}</option>{places.map((place) => <option key={place.id} value={place.id}>{place.key}</option>)}</select></FieldLabel>
                            <FieldLabel text={t('rooms.roomName')}><input value={editName} onChange={(event) => setEditName(event.target.value)} className="glass-input w-full rounded-lg p-3" required /></FieldLabel>
                            <FieldLabel text={t('rooms.capacity')}><input type="number" min="1" value={editCapacity} onChange={(event) => setEditCapacity(event.target.value)} className="glass-input w-full rounded-lg p-3" required /></FieldLabel>
                            <FieldLabel text={t('rooms.description')}><textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="glass-input h-24 w-full rounded-lg p-3" /></FieldLabel>
                            <button type="submit" disabled={loading} className="glass-button button-success flex w-full items-center justify-center gap-2 rounded-xl p-4 font-bold"><Save className="h-5 w-5" /> {loading ? t('rooms.updating') : t('rooms.save')}</button>
                        </form>
                    </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function FieldLabel({ text, children }: { text: string; children: React.ReactNode }) {
    return <label className="block space-y-2 font-medium text-white/80"><span>{text}</span>{children}</label>;
}

function ShieldMessage() {
    const { t } = useTranslation();

    return <><Building2 className="mx-auto mb-4 h-10 w-10 text-sky-400" /><h1 className="mb-2 text-xl font-bold text-white">{t('rooms.adminOnlyTitle')}</h1><p>{t('rooms.adminOnlyText')}</p></>;
}
