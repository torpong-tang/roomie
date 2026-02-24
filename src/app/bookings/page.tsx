'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Download, ArrowLeft, Calendar as CalendarIcon, User, DoorOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Room {
    id: string;
    name: string;
}

interface Booking {
    id: string;
    roomId: string;
    title: string;
    startTime: string;
    endTime: string;
    user: string;
    room: Room;
}

export default function BookingsListPage() {
    const [mounted, setMounted] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/bookings');
            const data = await res.json();
            setBookings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.user.toLowerCase().includes(search.toLowerCase()) ||
        b.room?.name.toLowerCase().includes(search.toLowerCase())
    );

    const exportToCSV = () => {
        const headers = ['Title', 'Room', 'User', 'Start Time', 'End Time'];
        const rows = filteredBookings.map(b => [
            b.title,
            b.room?.name || 'Unknown',
            b.user,
            format(new Date(b.startTime), 'yyyy-MM-dd HH:mm'),
            format(new Date(b.endTime), 'yyyy-MM-dd HH:mm')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `roomie_bookings_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCancelBooking = async (id: string) => {
        // Only allow canceling future bookings
        const booking = bookings.find(b => b.id === id);
        if (booking && new Date(booking.startTime) < new Date()) {
            alert('Cannot cancel past bookings');
            return;
        }

        if (!confirm('Are you sure you want to cancel this booking?')) return;
        try {
            const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (err) {
            alert('Error cancelling booking');
        }
    };

    if (!mounted) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 glass-button rounded-full text-white/60 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Booking History</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search title, room, user..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 pr-4 py-2 rounded-xl text-sm w-full md:w-64 outline-none"
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="glass-button px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 uppercase text-[10px] tracking-widest text-white/40">
                                <th className="px-6 py-4 font-bold">Meeting Info</th>
                                <th className="px-6 py-4 font-bold">Room</th>
                                <th className="px-6 py-4 font-bold">User</th>
                                <th className="px-6 py-4 font-bold">Date & Time</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{booking.title}</p>
                                    </td>
                                    <td className="px-6 py-4 text-white/60">
                                        <div className="flex items-center gap-2">
                                            <DoorOpen className="w-4 h-4 text-blue-400/60" />
                                            {booking.room?.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-white/60 text-sm">
                                            <User className="w-4 h-4" />
                                            {booking.user}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-white text-sm font-medium">{format(new Date(booking.startTime), 'MMM d, yyyy')}</p>
                                            <p className="text-white/40 text-[11px] font-mono uppercase tracking-tighter">
                                                {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {new Date(booking.startTime) >= new Date() ? (
                                            <button
                                                onClick={() => handleCancelBooking(booking.id)}
                                                className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold text-white/10">Passed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredBookings.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-white/20">
                                            <Search className="w-12 h-12" />
                                            <p>No bookings found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
