'use client';

import { useCallback, useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths, getDay } from 'date-fns';
import { Building2, ChevronLeft, ChevronRight, Clock, User, DoorOpen, Plus, Trash2, Eye, Phone, Save, X } from 'lucide-react';
import { apiPath, assetPath } from '@/lib/paths';
import { useFeedback } from '@/components/feedback-provider';

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

interface Place {
  id: string;
  key: string;
}

interface SessionUser {
  role: string;
  placeId?: string;
  placeName?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { showAlert, showConfirm, withLoading } = useFeedback();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
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
        fetch(`${apiPath('/api/rooms')}${suffix}`),
        fetch(`${apiPath('/api/bookings')}${suffix}`)
      ]);
      if (!roomsRes.ok || !bookingsRes.ok) throw new Error('Unable to load calendar data.');
      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();
      setRooms(roomsData);
      setBookings(bookingsData);
    };
    if (showSpinner) {
      await withLoading('Loading calendar...', load);
    } else {
      await load();
    }
  }, [withLoading]);

  useEffect(() => {
    setMounted(true);
    const initialize = async () => {
      try {
        await withLoading('Loading places...', async () => {
          const [userRes, placesRes] = await Promise.all([
            fetch(apiPath('/api/auth/me')),
            fetch(apiPath('/api/places')),
          ]);
          if (!userRes.ok || !placesRes.ok) throw new Error('Unable to load places.');
          const userData = await userRes.json();
          const placesData = await placesRes.json();
          const user = userData.user as SessionUser | null;
          setCurrentUser(user);
          setPlaces(placesData);
          if (user?.role === 'place' && user.placeId) {
            setSelectedPlaceId(user.placeId);
          } else if (placesData.length > 0) {
            setSelectedPlaceId(placesData[0].id);
          }
        });
      } catch {
        await showAlert({ tone: 'error', title: 'Unable to load places', message: 'Please refresh and try again.' });
      }
    };
    void initialize();
  }, [showAlert, withLoading]);

  useEffect(() => {
    if (currentUser && (selectedPlaceId || currentUser.role !== 'admin')) {
      void fetchData(selectedPlaceId).catch(() => {
        void showAlert({ tone: 'error', title: 'Unable to load calendar', message: 'Rooms and bookings could not be loaded.' });
      });
    }
  }, [currentUser, selectedPlaceId, fetchData, showAlert]);

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
      setError('End time must be after start time');
      await showAlert({ tone: 'error', title: 'Invalid booking time', message: 'End time must be after start time.' });
      setLoading(false);
      return;
    }

    if (start < new Date()) {
      setError('Cannot book in the past');
      await showAlert({ tone: 'error', title: 'Invalid booking date', message: 'A booking cannot be created in the past.' });
      setLoading(false);
      return;
    }

    try {
      await withLoading('Saving booking...', async () => {
        const res = await fetch(apiPath('/api/bookings'), {
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
        if (!res.ok) throw new Error(data.error || 'Failed to book room');
        await fetchData(selectedPlaceId, false);
      });
      setLoading(false);
      setShowModal(false);
      setTitle('');
      setRoomId('');
      setUsername('');
      await showAlert({ tone: 'success', title: 'Booking saved', message: 'The meeting room booking was created successfully.' });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'An error occurred';
      setError(message);
      setLoading(false);
      await showAlert({ tone: 'error', title: 'Booking failed', message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (new Date(booking.startTime) < new Date()) {
      await showAlert({ tone: 'error', title: 'Cannot cancel booking', message: 'Bookings that have already started or passed cannot be cancelled.' });
      return;
    }
    const confirmed = await showConfirm({
      title: 'Cancel this booking?',
      message: `This will remove "${booking.title}" from the schedule.`,
      confirmLabel: 'Cancel Booking',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await withLoading('Cancelling booking...', async () => {
        const res = await fetch(apiPath(`/api/bookings/${booking.id}`), {
          method: 'DELETE'
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to cancel booking');
        }
        await fetchData(selectedPlaceId, false);
      });
      await showAlert({ tone: 'success', title: 'Booking cancelled', message: 'The booking has been removed from the schedule.' });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'An error occurred while cancelling the booking';
      await showAlert({ tone: 'error', title: 'Cancellation failed', message });
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
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label data-tour="place-selector" className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300" />
                <select
                  aria-label="Place"
                  value={selectedPlaceId}
                  onChange={(event) => {
                    setSelectedPlaceId(event.target.value);
                    setFilterSelectedRoom('all');
                  }}
                  disabled={currentUser?.role !== 'admin'}
                  className="glass-input min-w-[185px] rounded-full bg-slate-800 py-3 pl-11 pr-9 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {places.length === 0 ? <option value="">No Places</option> : null}
                  {places.map((place) => <option key={place.id} value={place.id}>{place.key}</option>)}
                </select>
              </label>
              <label data-tour="room-selector" className="relative">
                <DoorOpen className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
                <select
                  aria-label="Meeting Room"
                  value={filterSelectedRoom}
                  onChange={(event) => setFilterSelectedRoom(event.target.value)}
                  className="glass-input min-w-[185px] rounded-full bg-slate-800 py-3 pl-11 pr-9 text-sm text-white outline-none"
                >
                  <option value="all">All Rooms</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" title="Previous month" onClick={handlePrevMonth} className="glass-button button-violet rounded-full p-3 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button type="button" title="Next month" onClick={handleNextMonth} className="glass-button button-violet rounded-full p-3 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className={`text-center font-bold text-sm uppercase ${(day === 'Sun' || day === 'Sat') ? 'text-red-400' : 'text-white/40'}`}>
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
                      <span className="text-[9px] text-white/40 font-medium px-1">+{dayBookings.length - 3} more</span>
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
            Agenda for {format(selectedDate, 'MMM d')}
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {Object.entries((bookingsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).reduce((acc: Record<string, { name: string, image: string | null | undefined, bookings: Booking[] }>, booking) => {
              const rId = booking.roomId;
              if (!acc[rId]) {
                acc[rId] = {
                  name: booking.room?.name || 'Unknown Room',
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
                      {(isSameDay(selectedDate, new Date()) || selectedDate > new Date()) && (
                        <button
                          onClick={() => openBookingModal(roomId, true)}
                          className="flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-300 transition-all hover:bg-amber-400/25"
                        >
                          <Plus className="w-3 h-3" />
                          Book
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
                        {new Date(booking.startTime) >= new Date() && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="rounded-lg bg-rose-500/10 p-1.5 text-rose-300/60 opacity-0 transition-all hover:bg-rose-500/25 hover:text-rose-200 group-hover:opacity-100"
                            title="Cancel Booking"
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
                <p className="text-white/40 text-sm">No bookings scheduled for today.</p>
              </div>
            )}
          </div>
          {(isSameDay(selectedDate, new Date()) || selectedDate > new Date()) && (
            <button type="button"
              data-tour="new-booking"
              onClick={() => openBookingModal('', false)}
              className="glass-button button-warning mt-6 flex w-full items-center justify-center gap-2 rounded-xl p-4 text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-8 relative">
            <button type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Book for {format(selectedDate, 'MMMM d, yyyy')}</h2>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg">{error}</div>}

              {roomId && selectedRoomData?.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-inner group">
                  <img
                    src={assetPath(selectedRoomData.image)}
                    alt={selectedRoomData.name}
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-white/80 mb-1 text-sm">Place</label>
                <div className="glass-input flex items-center gap-2 rounded-lg p-2 text-white/70">
                  <Building2 className="h-4 w-4 text-sky-400" />
                  {places.find((place) => place.id === selectedPlaceId)?.key || 'Select a place first'}
                </div>
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">Room</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className={`w-full glass-input p-2 rounded-lg outline-hidden text-white bg-slate-800 ${isRoomLocked ? 'opacity-50 cursor-not-allowed bg-slate-900' : ''}`}
                  disabled={isRoomLocked}
                  required
                >
                  <option value="" className="bg-slate-800 text-white">Select a room</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id} className="bg-slate-800 text-white">{room.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">Booking Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input p-2 rounded-lg outline-hidden"
                  placeholder="Meeting Title"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 mb-1 text-sm">Start Time (24h)</label>
                  <select
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setEndTime(''); // Reset end time when start time changes
                    }}
                    className="w-full glass-input p-2 rounded-lg outline-hidden bg-slate-800 text-white"
                    required
                  >
                    <option value="" className="bg-slate-800">Select Start</option>
                    {timeOptions.map(t => (
                      <option key={t} value={t} className="bg-slate-800">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 mb-1 text-sm">End Time (24h)</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full glass-input p-2 rounded-lg outline-hidden bg-slate-800 text-white ${!startTime ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!startTime}
                    required
                  >
                    <option value="" className="bg-slate-800">Select End</option>
                    {timeOptions
                      .filter(t => !startTime || t > startTime)
                      .map(t => (
                        <option key={t} value={t} className="bg-slate-800">{t}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">Booked By (Name)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input p-2 rounded-lg outline-hidden"
                  placeholder="Your Name"
                  required
                />
              </div>
              <div>
                <label className="block text-white/80 mb-1 text-sm">Contact</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    className="w-full glass-input p-2 pl-10 rounded-lg outline-hidden"
                    placeholder="Phone, Line ID or email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <label className="block text-white/80 mb-1 text-sm">Repeat</label>
                  <select
                    value={repeatType}
                    onChange={(e) => setRepeatType(e.target.value)}
                    className="w-full glass-input p-2 rounded-lg outline-hidden bg-slate-800 text-white text-sm"
                  >
                    <option value="none" className="bg-slate-800">No Repeat</option>
                    <option value="daily" className="bg-slate-800">Daily</option>
                    <option value="weekly" className="bg-slate-800">Weekly</option>
                  </select>
                </div>
                {repeatType !== 'none' && (
                  <div className="animate-in slide-in-from-right-2 duration-300">
                    <label className="block text-white/80 mb-1 text-sm">Times</label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                      className="w-full glass-input p-2 rounded-lg outline-hidden text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="glass-button button-neutral flex items-center justify-center gap-2 rounded-xl p-3 font-bold"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button button-success flex items-center justify-center gap-2 rounded-xl p-3 font-bold"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
