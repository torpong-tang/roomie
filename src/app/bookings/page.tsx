'use client';

import { useCallback, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Download, ArrowLeft, User, DoorOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';
import { PlaceSelect, usePlaceScope } from '@/components/place-scope';
import { useSession } from '@/components/session-provider';
import { ViewerNotice } from '@/components/viewer-notice';
import { useTranslation } from '@/components/translation-provider';
import { formatDate } from '@/lib/i18n';

interface Room {
    id: string;
    name: string;
    place?: { key: string } | null;
}

interface Booking {
    id: string;
    roomId: string;
    title: string;
    startTime: string;
    endTime: string;
    user: string;
    contact?: string | null;
    room: Room;
}

export default function BookingsListPage() {
    const { showAlert, showConfirm, withLoading } = useFeedback();
    const [mounted, setMounted] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const { places, placeId, setPlaceId, isAdmin, ready: placesReady } = usePlaceScope();
    const { isViewer } = useSession();
    const { t, language } = useTranslation();

    const loadBookings = useCallback(async () => {
        const suffix = placeId ? `?placeId=${encodeURIComponent(placeId)}` : '';
        const res = await apiFetch(`/api/bookings${suffix}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('history.loadFailMessage'));
        setBookings(data);
    }, [placeId, t]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!placesReady) return;
        const load = async () => {
            try {
                await withLoading(t('history.loading'), loadBookings);
            } catch {
                await showAlert({ tone: 'error', title: t('history.loadFailTitle'), message: t('history.loadFailMessage') });
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [placesReady, loadBookings, showAlert, withLoading, t]);

    const filteredBookings = bookings.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.user.toLowerCase().includes(search.toLowerCase()) ||
        b.room?.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.room?.place?.key || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.contact || '').toLowerCase().includes(search.toLowerCase())
    );

    const exportToCSV = () => {
        const headers = [t('calendar.bookingTitle'), t('place.label'), t('calendar.room'), t('calendar.bookedBy'), t('calendar.contact'), t('calendar.startTime'), t('calendar.endTime')];
        const rows = filteredBookings.map(b => [
            b.title,
            b.room?.place?.key || '',
            b.room?.name || t('common.unassigned'),
            b.user,
            b.contact || '',
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
            await showAlert({ tone: 'error', title: t('history.cannotCancelTitle'), message: t('history.cannotCancelMessage') });
            return;
        }

        const confirmed = await showConfirm({
            title: t('history.cancelTitle'),
            message: t('history.cancelMessage', { title: booking?.title || t('history.cancelFallback') }),
            confirmLabel: t('calendar.cancelConfirm'),
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await withLoading(t('calendar.cancelling'), async () => {
                const res = await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || t('history.cancelError'));
                }
                await loadBookings();
            });
            await showAlert({ tone: 'success', title: t('history.cancelledTitle'), message: t('history.cancelledMessage') });
        } catch (caughtError) {
            await showAlert({ tone: 'error', title: t('history.cancelFailedTitle'), message: caughtError instanceof Error ? caughtError.message : t('history.cancelError') });
        }
    };

    if (!mounted) return null;
    if (isViewer) return <ViewerNotice pageKey="viewer.historyPage" />;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="glass-button button-violet rounded-full p-2 text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">{t('history.title')}</h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <PlaceSelect places={places} value={placeId} disabled={!isAdmin} onChange={setPlaceId} />
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder={t('history.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 pr-4 py-2 rounded-xl text-sm w-full md:w-64 outline-none"
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="glass-button button-success flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
                    >
                        <Download className="w-4 h-4" />
                        {t('history.exportCsv')}
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 uppercase text-[10px] tracking-widest text-white/40">
                                <th className="px-6 py-4 font-bold">{t('history.meetingInfo')}</th>
                                <th className="px-6 py-4 font-bold">{t('history.placeRoom')}</th>
                                <th className="px-6 py-4 font-bold">{t('history.bookedByContact')}</th>
                                <th className="px-6 py-4 font-bold">{t('history.dateTime')}</th>
                                <th className="px-6 py-4 font-bold text-right">{t('common.actions')}</th>
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
                                            <span>{booking.room?.place?.key || t('common.unassigned')} / {booking.room?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-white/60 text-sm">
                                            <User className="w-4 h-4" />
                                            <span>{booking.user}{booking.contact ? ` / ${booking.contact}` : ''}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-white text-sm font-medium">{formatDate(language, new Date(booking.startTime), { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            <p className="text-white/40 text-[11px] font-mono uppercase tracking-tighter">
                                                {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {new Date(booking.startTime) >= new Date() ? (
                                            <button
                                                title={t('history.cancelTooltip')}
                                                onClick={() => handleCancelBooking(booking.id)}
                                                className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold text-white/10">{t('history.passed')}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredBookings.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-white/20">
                                            <Search className="w-12 h-12" />
                                            <p>{t('history.empty')}</p>
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
