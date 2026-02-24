'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addDays, subMonths, addMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, DoorOpen, Plus, Trash2, Eye } from 'lucide-react';

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

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatCount, setRepeatCount] = useState(1);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    const [roomsRes, bookingsRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/bookings')
    ]);
    const roomsData = await roomsRes.json();
    const bookingsData = await bookingsRes.json();
    setRooms(roomsData);
    setBookings(bookingsData);
  };

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
      setLoading(false);
      return;
    }

    if (start < new Date()) {
      setError('Cannot book in the past');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          title,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          user: username,
          repeatType,
          repeatCount
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setTitle('');
        setRoomId('');
        setUsername('');
        fetchData();
      } else {
        setError(data.error || 'Failed to book room');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (new Date(booking.startTime) < new Date()) {
      alert('Cannot cancel bookings that have already started or passed');
      return;
    }
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel booking');
      }
    } catch (err) {
      alert('An error occurred while cancelling the booking');
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
            <div className="flex gap-2">
              <select
                value={filterSelectedRoom}
                onChange={(e) => setFilterSelectedRoom(e.target.value)}
                className="glass-input px-4 py-1 rounded-full text-white text-sm outline-none bg-slate-800"
              >
                <option value="all">All Rooms</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
              <button onClick={handlePrevMonth} className="p-2 glass-button rounded-full text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={handleNextMonth} className="p-2 glass-button rounded-full text-white">
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

          <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
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
                      <img src={roomData.image} alt={roomData.name} className="w-full h-full object-cover" />
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
                          className="p-1 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md text-[10px] font-bold transition-all border border-blue-500/20 flex items-center gap-1"
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
                          </div>
                        </div>
                        {new Date(booking.startTime) >= new Date() && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-lg transition-all"
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
            <button
              onClick={() => openBookingModal('', false)}
              className="w-full glass-button p-4 rounded-xl text-white font-bold text-sm mt-6 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
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
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Book for {format(selectedDate, 'MMMM d, yyyy')}</h2>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg">{error}</div>}

              {roomId && selectedRoomData?.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-white/10 shadow-inner group">
                  <img
                    src={selectedRoomData.image}
                    alt={selectedRoomData.name}
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              )}

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
                  className="glass-button p-3 rounded-xl text-white/60 font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button p-3 rounded-xl text-white font-bold bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/40"
                >
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
