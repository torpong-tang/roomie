'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, Users, Trash2, Edit2, X } from 'lucide-react';

interface Room {
    id: string;
    name: string;
    capacity: number;
    description: string | null;
    image: string | null;
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Edit state
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editName, setEditName] = useState('');
    const [editCapacity, setEditCapacity] = useState('');
    const [editDescription, setEditDescription] = useState('');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        setRooms(data);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = '';
            if (image) {
                const formData = new FormData();
                formData.append('file', image);
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.url;
            }

            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    capacity: parseInt(capacity),
                    description,
                    image: imageUrl,
                }),
            });

            if (res.ok) {
                setName('');
                setCapacity('');
                setDescription('');
                setImage(null);
                setPreview(null);
                fetchRooms();
            }
        } catch (error) {
            console.error('Error creating room:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/rooms/${editingRoom.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    capacity: parseInt(editCapacity),
                    description: editDescription,
                }),
            });

            if (res.ok) {
                setEditingRoom(null);
                fetchRooms();
            }
        } catch (error) {
            console.error('Error updating room:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            const res = await fetch(`/api/rooms/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchRooms();
            }
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    };

    const startEditing = (room: Room) => {
        setEditingRoom(room);
        setEditName(room.name);
        setEditCapacity(room.capacity.toString());
        setEditDescription(room.description || '');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-4">
            <div className="glass-card p-8">
                <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                    <Plus className="w-8 h-8" />
                    Manage Meeting Rooms
                </h1>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-white/80 mb-2 font-medium">Room Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full glass-input p-3 rounded-lg outline-hidden"
                                placeholder="e.g. Conference Room A"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/80 mb-2 font-medium">Capacity</label>
                            <input
                                type="number"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                className="w-full glass-input p-3 rounded-lg outline-hidden"
                                placeholder="e.g. 10"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-white/80 mb-2 font-medium">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full glass-input p-3 rounded-lg outline-hidden h-32"
                                placeholder="Brief description..."
                            />
                        </div>
                    </div>
                    <div className="space-y-4 flex flex-col">
                        <label className="block text-white/80 mb-2 font-medium">Room Image</label>
                        <div className="relative border-2 border-dashed border-white/20 rounded-xl flex-1 flex flex-col items-center justify-center overflow-hidden hover:border-white/40 transition-colors min-h-[200px]">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 text-white/40 mb-2" />
                                    <p className="text-white/40">Click to upload image</p>
                                </>
                            )}
                            <input
                                type="file"
                                onChange={handleImageChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full glass-button p-4 rounded-xl text-white font-bold text-lg mt-4 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.map((room) => (
                    <div key={room.id} className="glass-card overflow-hidden flex flex-col group relative">
                        <div className="h-48 relative">
                            {room.image ? (
                                <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                    <Upload className="w-12 h-12 text-white/20" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {room.capacity}
                            </div>
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => startEditing(room)}
                                    className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(room.id)}
                                    className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-full text-white transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-2">{room.name}</h3>
                            <p className="text-white/60 text-sm line-clamp-2 mb-4">{room.description || 'No description provided.'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-8 relative">
                        <button
                            onClick={() => setEditingRoom(null)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-white mb-6">Edit Room: {editingRoom.name}</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">Room Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full glass-input p-3 rounded-lg outline-hidden"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">Capacity</label>
                                <input
                                    type="number"
                                    value={editCapacity}
                                    onChange={(e) => setEditCapacity(e.target.value)}
                                    className="w-full glass-input p-3 rounded-lg outline-hidden"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full glass-input p-3 rounded-lg outline-hidden h-32"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full glass-button p-4 rounded-xl text-white font-bold text-lg mt-4 disabled:opacity-50"
                            >
                                {loading ? 'Updating...' : 'Update Room'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
