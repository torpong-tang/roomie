'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { BarChart3, TrendingUp, Calendar as CalendarIcon, Users, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface Room {
    id: string;
    name: string;
    image?: string | null;
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

export default function AnalyticsPage() {
    const [mounted, setMounted] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [roomsRes, bookingsRes] = await Promise.all([
                fetch('/api/rooms'),
                fetch('/api/bookings')
            ]);
            const roomsData = await roomsRes.json();
            const bookingsData = await bookingsRes.json();
            setRooms(roomsData);
            setBookings(bookingsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    // Analytics Calculations
    const totalBookings = bookings.length;
    const currentMonthBookings = bookings.filter(b => isSameMonth(new Date(b.startTime), new Date())).length;

    // Room Popularity
    const roomStats = rooms.map(room => {
        const count = bookings.filter(b => b.roomId === room.id).length;
        return {
            name: room.name,
            count,
            percentage: totalBookings > 0 ? (count / totalBookings) * 100 : 0
        };
    }).sort((a, b) => b.count - a.count);

    // Time Usage (Peak Hours)
    const hourStats = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    bookings.forEach(b => {
        const startHour = new Date(b.startTime).getHours();
        hourStats[startHour].count++;
    });
    const peakHour = [...hourStats].sort((a, b) => b.count - a.count)[0];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 glass-button rounded-full text-white/60 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-blue-400" />
                        Insights & Analytics
                    </h1>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">Total Bookings</p>
                            <h2 className="text-4xl font-bold text-white mt-1">{totalBookings}</h2>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <CalendarIcon className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-blue-400/60 text-xs mt-4 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        All-time system usage
                    </p>
                </div>

                <div className="glass-card p-6 border-l-4 border-indigo-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">This Month</p>
                            <h2 className="text-4xl font-bold text-white mt-1">{currentMonthBookings}</h2>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>
                    <p className="text-indigo-400/60 text-xs mt-4">Current activity level</p>
                </div>

                <div className="glass-card p-6 border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">Most Popular Time</p>
                            <h2 className="text-4xl font-bold text-white mt-1">{peakHour.hour}:00</h2>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-purple-400/60 text-xs mt-4">Peak booking hour</p>
                </div>

                <div className="glass-card p-6 border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">Active Rooms</p>
                            <h2 className="text-4xl font-bold text-white mt-1">{rooms.length}</h2>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-emerald-400/60 text-xs mt-4">Available for booking</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Room Popularity Chart */}
                <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            Room Popularity
                        </h3>
                    </div>
                    <div className="space-y-6">
                        {roomStats.map((stat, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/80 font-medium">{stat.name}</span>
                                    <span className="text-blue-400 font-bold">{stat.count} bookings</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20"
                                        style={{ width: `${stat.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Peek Usage Hours */}
                <div className="glass-card p-8">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                        Usage by Hour (24h)
                    </h3>
                    <div className="flex items-end justify-between h-48 gap-px">
                        {hourStats.map((stat, idx) => {
                            const height = totalBookings > 0 ? (stat.count / Math.max(...hourStats.map(h => h.count))) * 100 : 0;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center group">
                                    <div
                                        className="w-full bg-indigo-500/40 group-hover:bg-indigo-400 transition-all rounded-t-sm relative"
                                        style={{ height: `${height}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {stat.count} books
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/20 mt-2 font-mono">{stat.hour}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
                        <span className="text-white/40 text-xs">00:00</span>
                        <span className="text-white/40 text-xs">Middle of Day</span>
                        <span className="text-white/40 text-xs">23:00</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
