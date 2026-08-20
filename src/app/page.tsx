'use client';

import { useCallback, useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths, getDay } from 'date-fns';
import { Building2, ChevronLeft, ChevronRight, Clock, User, DoorOpen, Plus, Trash2, Eye, Phone, Save, X } from 'lucide-react';
import { apiFetch, assetPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';
import { PlaceSelect, usePlaceScope } from '@/components/place-scope';
import { useSession } from '@/components/session-provider';
import { useTranslation } from '@/components/translation-provider';
import { formatDate, weekdayNames } from '@/lib/i18n';

interface Room {
  id: string;
  name: string;
  image?: string | null;
  placeId?: string | null;
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

export default function CalendarPage() {
  const { showAlert, showConfirm, withLoading } = useFeedback();
  const { canBook } = useSession();
  const { t, language } = useTranslation();
  const DAYS_OF_WEEK = weekdayNames(language);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { places, placeId: selectedPlaceId, setPlaceId: setSelectedPlaceId, isAdmin, ready: placesReady } = usePlaceScope();
  const [filterSelectedRoom, setFilterSelectedRoom] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Booking Form State
  const [roomId, setRoomId] = useState('');
  const selectedRoomData = rooms.find(r => r.id === roomId);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatCount, setRepeatCount] = useState(1);

  const fetchData = useCallback(async (placeId = '', showSpinner = true) => {
    const load = async () => {
      const suffix = placeId ? `?placeId=${encodeURIComponent(placeId)}` : '';
      const [roomsRes, bookingsRes] = await Promise.all([
        apiFetch(`/api/rooms${suffix}`),
        apiFetch(`/api/bookings${suffix}`)
      ]);
      if (!roomsRes.ok || !bookingsRes.ok) throw new Error(t('calendar.loadFailMessage'));
      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();
      setRooms(roomsData);
      setBookings(bookingsData);
    };
    if (showSpinner) {
      await withLoading(t('calendar.loading'), load);
    } else {
      await load();
    }
  }, [withLoading, t]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!placesReady) return;
    void fetchData(selectedPlaceId).catch(() => {
      void showAlert({ tone: 'error', title: t('calendar.loadFailTitle'), message: t('calendar.loadFailMessage') });
    });
  }, [placesReady, selectedPlaceId, fetchData, showAlert, t]);

  useEffect(() => {
    if (filterSelectedRoom !== 'all' && !rooms.some((room) => room.id === filterSelectedRoom)) {
      setFilterSelectedRoom('all');
    }
    if (roomId && !rooms.some((room) => room.id === roomId)) {
      setRoomId('');
      setIsRoomLocked(false);
    }
  }, [filterSelectedRoom, roomId, rooms]);

  // Filter bookings and optimize lookup by date
  const filteredBookings = filterSelectedRoom === 'all'
    ? bookings
    : bookings.filter(b => b.roomId === filterSelectedRoom);

  const bookingsByDate = (filteredBookings || []).reduce((acc: Record<string, Booking[]>, booking) => {
    const dateKey = format(new Date(booking.startTime), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(booking);
    return acc;
  }, {});

  const getRoomInitial = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const openBookingModal = (rId: string = '', locked: boolean = false) => {
    setRoomId(rId);
    setIsRoomLocked(locked);
    setTitle('');
    setStartTime('');
    setEndTime('');
    setUsername('');
    setContact('');
    setRepeatType('none');
    setRepeatCount(1);
    setError('');
    setShowModal(true);
  };

  const timeOptions = Array.from({ length: 25 }, (_, i) => {
    const totalMinutes = 7 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60 === 0 ? '00' : '30';
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  });

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth))
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const start = new Date(selectedDate);
    const [startH, startM] = startTime.split(':');
    start.setHours(parseInt(startH), parseInt(startM));

    const end = new Date(selectedDate);
    const [endH, endM] = endTime.split(':');
    end.setHours(parseInt(endH), parseInt(endM));

    if (end <= start) {
      setError(t('calendar.invalidTimeMessage'));
      await showAlert({ tone: 'error', title: t('calendar.invalidTimeTitle'), message: t('calendar.invalidTimeMessage') });
      setLoading(false);
      return;
    }

    if (start < new Date()) {
      setError(t('calendar.invalidDateMessage'));
      await showAlert({ tone: 'error', title: t('calendar.invalidDateTitle'), message: t('calendar.invalidDateMessage') });
      setLoading(false);
      return;
    }

    try {
      await withLoading(t('calendar.saving'), async () => {
        const res = await apiFetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            user: username,
            contact,
            repeatType,
            repeatCount
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('calendar.failedTitle'));
        await fetchData(selectedPlaceId, false);
      });
      setLoading(false);
      setShowModal(false);
      setTitle('');
      setRoomId('');
      setUsername('');
      await showAlert({ tone: 'success', title: t('calendar.savedTitle'), message: t('calendar.savedMessage') });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t('calendar.genericError');
      setError(message);
      setLoading(false);
      await showAlert({ tone: 'error', title: t('calendar.failedTitle'), message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (new Date(booking.startTime) < new Date()) {
      await showAlert({ tone: 'error', title: t('calendar.cannotCancelTitle'), message: t('calendar.cannotCancelMessage') });
      return;
    }
    const confirmed = await showConfirm({
      title: t('calendar.cancelTitle'),
      message: t('calendar.cancelMessage', { title: booking.title }),
      confirmLabel: t('calendar.cancelConfirm'),
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await withLoading(t('calendar.cancelling'), async () => {
        const res = await apiFetch(`/api/bookings/${booking.id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || t('calendar.cancelFailedTitle'));
        }
        await fetchData(selectedPlaceId, false);
      });
      await showAlert({ tone: 'success', title: t('calendar.cancelledTitle'), message: t('calendar.cancelledMessage') });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t('calendar.genericError');
      await showAlert({ tone: 'error', title: t('calendar.cancelFailedTitle'), message });
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 p-4 md:p-8">
      {/* Calendar Section */}
      <div className="lg:col-span-3 space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white uppercase tracking-wider">
              {formatDate(language, currentMonth, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PlaceSelect
                tourId="place-selector"
                places={places}
                value={selectedPlaceId}
                disabled={!isAdmin}
                onChange={(value) => {
                  setSelectedPlaceId(value);
                  setFilterSelectedRoom('all');
                }}
              />
              <label data-tour="room-selector" className="relative">
                <DoorOpen className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
                <select
                  aria-label={t('calendar.meetingRoom')}
                  value={filterSelectedRoom}
                  onChange={(event) => setFilterSelectedRoom(event.target.value)}
                  className="glass-input min-w-[185px] rounded-full bg-slate-800 py-3 pl-11 pr-9 text-sm text-white outline-none"
                >
                  <option value="all">{t('calendar.allRooms')}</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" title={t('calendar.prevMonth')} onClick={handlePrevMonth} className="glass-button button-violet rounded-full p-3 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button type="button" title={t('calendar.nextMonth')} onClick={handleNextMonth} className="glass-button button-violet rounded-full p-3 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4">
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={day} className={`text-center font-bold text-sm uppercase ${(index === 0 || index === 6) ? 'text-red-400' : 'text-white/40'}`}>
                {day}
              </div>
            ))}
          </div>

          <div data-tour="calendar-grid" className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
            {days.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate[dateKey] || [];
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(day);
                  }}
                  className={`min-h-[140px] p-2 transition-all cursor-pointer hover:bg-white/10 flex flex-col gap-1 group/day border-b border-r border-white/5 
                    ${!isSameMonth(day, currentMonth) ? 'opacity-20' : 'opacity-100'} 
                    ${isSameDay(day, new Date()) ? 'bg-blue-500/10' : ''} 
                    ${(getDay(day) === 0 || getDay(day) === 6) ? 'bg-orange-500/[0.05]' : ''}
                    ${isSameDay(day, selectedDate) ? 'day-active ring-1 ring-blue-500/50' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold flex items-center justify-center w-7 h-7 rounded-full ${isSameDay(day, new Date())
                      ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-500/50'
                      : (getDay(day) === 0 || getDay(day) === 6)
                        ? 'text-red-400'
                        : 'text-white/80'
                      }`}>
                      {format(day, 'd')}
                    </span>
                    <Eye className="w-3 h-3 text-white/20 opacity-0 group-hover/day:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-hide mt-1">
                    {dayBookings.slice(0, 3).map(booking => (
                      <div key={booking.id} className="text-[10px] bg-slate-800 text-white px-1.5 py-1 rounded-md truncate border border-white/10 flex justify-between items-center gap-1 shadow-sm">
                        <span className="font-bold bg-blue-500 text-white px-1 rounded-[2px] text-[8px]">
                          {getRoomInitial(booking.room?.name || '??')}
                        </span>
                        <span className="flex-1 truncate font-medium">{format(new Date(booking.startTime), 'HH:mm')} {booking.title}</span>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="text-[9px] text-white/40 font-medium px-1">+{t('calendar.more', { count: dayBookings.length - 3 })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side Details Section */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-card p-6 h-full flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            {t('calendar.agendaFor', { date: formatDate(language, selectedDate, { day: 'numeric', month: 'short' }) })}
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {Object.entries((bookingsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).reduce((acc: Record<string, { name: string, image: string | null | undefined, bookings: Booking[] }>, booking) => {
              const rId = booking.roomId;
              if (!acc[rId]) {
                acc[rId] = {
                  name: booking.room?.name || t('calendar.room'),
                  image: booking.room?.image,
                  bookings: []
                };
              }
              acc[rId].bookings.push(booking);
              return acc;
            }, {})).map(([roomId, roomData]) => (
              <div key={roomId} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    {roomData.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated /api/uploads route */
                      <img src={assetPath(roomData.image)} alt={roomData.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <DoorOpen className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-400 font-bold text-xs uppercase tracking-widest block">
                        {roomData.name}
                      </span>
                      {canBook && (isSameDay(selectedDate, new Date()) || selectedDate > new Date()) && (
                        <button
                          onClick={() => openBookingModal(roomId, true)}
                          className="flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-300 transition-all hover:bg-amber-400/25"
                        >
                          <Plus className="w-3 h-3" />
                          {t('calendar.book')}
                        </button>
                      )}
                    </div>
                    <div className="h-px w-full bg-white/10 mt-1"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {roomData.bookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(booking => (
                    <div key={booking.id} className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 transition-colors group">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-2 flex-1">
                          <h4 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                            {booking.title}
                          </h4>
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-white/50 text-[11px] font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-400/70" />
                              {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                            </div>
                            <div className="flex items-center gap-2 text-white/50 text-[11px]">
                              <User className="w-3.5 h-3.5" />
                              {booking.user}
                            </div>
                            {booking.contact ? (
                              <div className="flex items-center gap-2 text-white/50 text-[11px]">
                                <Phone className="w-3.5 h-3.5" />
                                {booking.contact}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {canBook && new Date(booking.startTime) >= new Date() && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="rounded-lg bg-rose-500/10 p-1.5 text-rose-300/60 opacity-0 transition-all hover:bg-rose-500/25 hover:text-rose-200 group-hover:opacity-100"
                            title={t('calendar.cancelTooltip')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(!bookingsByDate[format(selectedDate, 'yyyy-MM-dd')] || bookingsByDate[format(selectedDate, 'yyyy-MM-dd')].length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">{t('calendar.noBookings')}</p>
              </div>
            )}
          </div>
          {canBook && (isSameDay(selectedDate, new Date()) || selectedDate > new Date()) && (
            <button type="button"
              data-tour="new-booking"
              onClick={() => openBookingModal('', false)}
              className="glass-button button-warning mt-6 flex w-full items-center justify-center gap-2 rounded-xl p-4 text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              {t('calendar.newBooking')}
            </button>
          )}
        </div>
      </div>

      {/*
        Booking Modal. The overlay scrolls, not the card: with a room image the form
        is taller than a phone screen, and a centred non-scrolling box pushes the
        confirm buttons off the bottom. z-140 keeps it above the accessibility bar.
      */}
      {showModal && canBook && (
        <div className="fixed inset-0 z-[140] overflow-y-auto p-4 bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
          <div className="glass-card w-full max-w-md p-6 sm:p-8 relative">
            <button type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
              title={t('common.close')}
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">{t('calendar.bookFor', { date: formatDate(language, selectedDate, { day: 'numeric', month: 'long', year: 'numeric' }) })}</h2>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg">{error}</div>}

              {roomId && selectedRoomData?.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-inner group">
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated /api/uploads route */}
                  <img
                    src={assetPath(selectedRoomData.image)}
                    alt={selectedRoomData.name}
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/80 mb-1 text-sm">{t('place.label')}</label>
                <div className="glass-input flex items-center gap-2 rounded-lg p-2 text-white/70">
                  <Building2 className="h-4 w-4 text-sky-400" />
                  {places.find((place) => place.id === selectedPlaceId)?.key || t('calendar.selectPlaceFirst')}
                </div>
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">{t('calendar.room')}</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className={`w-full glass-input p-2 rounded-lg outline-hidden text-white bg-slate-800 ${isRoomLocked ? 'opacity-50 cursor-not-allowed bg-slate-900' : ''}`}
                  disabled={isRoomLocked}
                  required
                >
                  <option value="" className="bg-slate-800 text-white">{t('calendar.selectRoom')}</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id} className="bg-slate-800 text-white">{room.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">{t('calendar.bookingTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input p-2 rounded-lg outline-hidden"
                  placeholder={t('calendar.bookingTitlePlaceholder')}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 mb-1 text-sm">{t('calendar.startTime')}</label>
                  <select
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setEndTime(''); // Reset end time when start time changes
                    }}
                    className="w-full glass-input p-2 rounded-lg outline-hidden bg-slate-800 text-white"
                    required
                  >
                    <option value="" className="bg-slate-800">{t('calendar.selectStart')}</option>
                    {timeOptions.map(t => (
                      <option key={t} value={t} className="bg-slate-800">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 mb-1 text-sm">{t('calendar.endTime')}</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full glass-input p-2 rounded-lg outline-hidden bg-slate-800 text-white ${!startTime ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!startTime}
                    required
                  >
                    <option value="" className="bg-slate-800">{t('calendar.selectEnd')}</option>
                    {timeOptions
                      .filter(t => !startTime || t > startTime)
                      .map(t => (
                        <option key={t} value={t} className="bg-slate-800">{t}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">{t('calendar.bookedBy')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input p-2 rounded-lg outline-hidden"
                  placeholder={t('calendar.bookedByPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">{t('calendar.contact')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    className="w-full glass-input p-2 pl-10 rounded-lg outline-hidden"
                    placeholder={t('calendar.contactPlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <label className="block text-white/80 mb-1 text-sm">{t('calendar.repeat')}</label>
                  <select
                    value={repeatType}
                    onChange={(e) => setRepeatType(e.target.value)}
                    className="w-full glass-input p-2 rounded-lg outline-hidden bg-slate-800 text-white text-sm"
                  >
                    <option value="none" className="bg-slate-800">{t('calendar.noRepeat')}</option>
                    <option value="daily" className="bg-slate-800">{t('calendar.daily')}</option>
                    <option value="weekly" className="bg-slate-800">{t('calendar.weekly')}</option>
                  </select>
                </div>
                {repeatType !== 'none' && (
                  <div className="animate-in slide-in-from-right-2 duration-300">
                    <label className="block text-white/80 mb-1 text-sm">{t('calendar.times')}</label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={repeatCount}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value, 10);
                        setRepeatCount(Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 1);
                      }}
                      className="w-full glass-input p-2 rounded-lg outline-hidden text-sm"
                    />
                  </div>
                )}
              </div>
              {/*
                Sticky so the actions stay on screen while the rest of the form
                scrolls — otherwise a tall form leaves them below the fold and the
                user has to discover the scroll before they can confirm.
              */}
              <div className="sticky bottom-0 grid grid-cols-2 gap-4 mt-6 rounded-xl bg-slate-900/85 p-2 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="glass-button button-neutral flex items-center justify-center gap-2 rounded-xl p-3 font-bold"
                >
                  <X className="h-4 w-4" />
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button button-success flex items-center justify-center gap-2 rounded-xl p-3 font-bold"
                >
                  <Save className="h-4 w-4" />
                  {loading ? t('common.processing') : t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
