'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, DoorOpen, Edit2, Plus, Save, Trash2, Upload, Users, X } from 'lucide-react';
import { apiPath, assetPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';

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
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
        const response = await fetch(apiPath('/api/rooms'));
        const data = await response.json();
        if (response.ok) setRooms(data);
    };

    useEffect(() => {
        const load = async () => {
            try {
                await withLoading('Loading meeting rooms...', async () => {
                    const sessionResponse = await fetch(apiPath('/api/auth/me'));
                    const { user } = await sessionResponse.json();
                    const admin = user?.role === 'admin';
                    setIsAdmin(admin);
                    if (!admin) return;
                    const [placesResponse] = await Promise.all([fetch(apiPath('/api/places')), fetchRooms()]);
                    const placesData = await placesResponse.json();
                    if (!placesResponse.ok) throw new Error('Unable to load places.');
                    setPlaces(placesData);
                });
            } catch {
                setError('Unable to load meeting rooms.');
                await showAlert({ tone: 'error', title: 'Unable to load rooms', message: 'Meeting room information could not be loaded.' });
            }
        };
        void load();
    }, [showAlert, withLoading]);

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
        const response = await fetch(apiPath('/api/upload'), { method: 'POST', body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to upload image.');
        return data.url as string;
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await withLoading('Creating meeting room...', async () => {
                const imageUrl = await uploadImage();
                const response = await fetch(apiPath('/api/rooms'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, capacity: Number(capacity), description, image: imageUrl, placeId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to create room.');
                await fetchRooms();
            });
            setName('');
            setCapacity('');
            setDescription('');
            setPlaceId('');
            setImage(null);
            setPreview(null);
            setLoading(false);
            await showAlert({ tone: 'success', title: 'Room created', message: `${name} is now available at the selected place.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to create room.';
            setError(message);
            setLoading(false);
            await showAlert({ tone: 'error', title: 'Unable to create room', message });
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
            await withLoading('Updating meeting room...', async () => {
                const response = await fetch(apiPath(`/api/rooms/${editingRoom.id}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editName, capacity: Number(editCapacity), description: editDescription, placeId: editPlaceId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to update room.');
                await fetchRooms();
            });
            setEditingRoom(null);
            setLoading(false);
            await showAlert({ tone: 'success', title: 'Room updated', message: `${editName} was updated successfully.` });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to update room.';
            setError(message);
            setLoading(false);
            await showAlert({ tone: 'error', title: 'Unable to update room', message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (room: Room) => {
        const confirmed = await showConfirm({
            title: 'Delete meeting room?',
            message: `Delete ${room.name} from ${room.place?.key || 'unassigned place'}?`,
            confirmLabel: 'Delete Room',
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await withLoading('Deleting meeting room...', async () => {
                const response = await fetch(apiPath(`/api/rooms/${room.id}`), { method: 'DELETE' });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Unable to delete room.');
                await fetchRooms();
            });
            await showAlert({ tone: 'success', title: 'Room deleted', message: `${room.name} has been removed.` });
        } catch (caughtError) {
            await showAlert({ tone: 'error', title: 'Unable to delete room', message: caughtError instanceof Error ? caughtError.message : 'Unable to delete room.' });
        }
    };

    if (isAdmin === null) {
        return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" /></div>;
    }

    if (isAdmin === false) {
        return <div className="glass-card mx-auto max-w-xl p-8 text-center text-white/70"><ShieldMessage /></div>;
    }

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4">
            <div className="glass-card p-8">
                <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold text-white">
                    <DoorOpen className="h-8 w-8 text-sky-400" /> Manage Meeting Rooms
                </h1>
                {error ? <p className="mb-5 rounded-lg bg-red-500/10 p-3 text-red-200">{error}</p> : null}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <FieldLabel text="Place">
                            <select value={placeId} onChange={(event) => setPlaceId(event.target.value)} className="glass-input w-full rounded-lg bg-slate-900 p-3" required>
                                <option value="">Select place</option>
                                {places.map((place) => <option key={place.id} value={place.id}>{place.key}</option>)}
                            </select>
                        </FieldLabel>
                        <FieldLabel text="Room Name"><input value={name} onChange={(event) => setName(event.target.value)} className="glass-input w-full rounded-lg p-3" placeholder="e.g. Conference Room A" required /></FieldLabel>
                        <FieldLabel text="Capacity"><input type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="glass-input w-full rounded-lg p-3" placeholder="e.g. 10" required /></FieldLabel>
                        <FieldLabel text="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="glass-input h-24 w-full rounded-lg p-3" /></FieldLabel>
                    </div>
                    <div className="flex flex-col space-y-4">
                        <span className="font-medium text-white/80">Room Image</span>
                        <div className="relative flex min-h-[200px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/20">
                            {preview ? <img src={preview} alt="Room preview" className="h-full w-full object-cover" /> : <><Upload className="mb-2 h-12 w-12 text-white/40" /><p className="text-white/40">Choose room image</p></>}
                            <input type="file" onChange={handleImageChange} className="absolute inset-0 cursor-pointer opacity-0" accept="image/*" />
                        </div>
                        <button type="submit" disabled={loading} className="glass-button button-success flex items-center justify-center gap-2 rounded-xl p-4 font-bold disabled:opacity-50">
                            <Plus className="h-5 w-5" /> {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {rooms.map((room) => (
                    <article key={room.id} className="glass-card group overflow-hidden">
                        <div className="relative h-44">
                            {room.image ? <img src={assetPath(room.image)} alt={room.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-white/5"><DoorOpen className="h-12 w-12 text-white/20" /></div>}
                            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-sm"><Users className="h-4 w-4" /> {room.capacity}</div>
                            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition group-hover:opacity-100">
                                <button type="button" title="Edit room" onClick={() => startEditing(room)} className="rounded-lg bg-violet-500/40 p-3 text-violet-100 transition hover:bg-violet-500/60"><Edit2 className="h-5 w-5" /></button>
                                <button type="button" title="Delete room" onClick={() => handleDelete(room)} className="rounded-lg bg-rose-500/40 p-3 text-rose-100 transition hover:bg-rose-500/60"><Trash2 className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="p-5">
                            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-sky-300"><Building2 className="h-3.5 w-3.5" /> {room.place?.key || 'Unassigned'}</p>
                            <h3 className="font-bold text-white">{room.name}</h3>
                            <p className="mt-2 line-clamp-2 text-sm text-white/55">{room.description || 'No description provided.'}</p>
                        </div>
                    </article>
                ))}
            </div>

            {editingRoom ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="glass-card relative w-full max-w-md p-8">
                        <button type="button" onClick={() => setEditingRoom(null)} title="Close" className="absolute right-4 top-4 text-white/50"><X className="h-6 w-6" /></button>
                        <h2 className="mb-6 text-2xl font-bold">Edit Room</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <FieldLabel text="Place"><select value={editPlaceId} onChange={(event) => setEditPlaceId(event.target.value)} className="glass-input w-full rounded-lg bg-slate-900 p-3" required><option value="">Select place</option>{places.map((place) => <option key={place.id} value={place.id}>{place.key}</option>)}</select></FieldLabel>
                            <FieldLabel text="Room Name"><input value={editName} onChange={(event) => setEditName(event.target.value)} className="glass-input w-full rounded-lg p-3" required /></FieldLabel>
                            <FieldLabel text="Capacity"><input type="number" min="1" value={editCapacity} onChange={(event) => setEditCapacity(event.target.value)} className="glass-input w-full rounded-lg p-3" required /></FieldLabel>
                            <FieldLabel text="Description"><textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="glass-input h-24 w-full rounded-lg p-3" /></FieldLabel>
                            <button type="submit" disabled={loading} className="glass-button button-success flex w-full items-center justify-center gap-2 rounded-xl p-4 font-bold"><Save className="h-5 w-5" /> {loading ? 'Updating...' : 'Save Room'}</button>
                        </form>
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
    return <><Building2 className="mx-auto mb-4 h-10 w-10 text-sky-400" /><h1 className="mb-2 text-xl font-bold text-white">Rooms are managed by administrators</h1><p>Your place can book rooms assigned to its account from the calendar.</p></>;
}
