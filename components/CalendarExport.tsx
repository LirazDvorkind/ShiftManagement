/**
 * @file components/CalendarExport.tsx
 * @description Add shifts to calendar using add-to-calendar-button.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { RoomMember } from '@/types';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { AddToCalendarButton } from 'add-to-calendar-button-react';
import { getWeekStart, todayStr, isoToDisplay, dateToDisplay, getRelativeWeekLabel } from '@/lib/dateUtils';

interface CalendarExportProps {
  roomId: string;
  members: RoomMember[];
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

type CalendarEvent = {
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
};

// ── Date helpers ────────────────────────────────────────────────────────────

/** "DD/MM/YYYY" → "YYYY-MM-DD" (returns null if invalid) */
function displayToIso(display: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(display);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatWeekLabel(monday: Date): string {
  return `${dateToDisplay(monday)} – ${dateToDisplay(addDays(monday, 6))}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CalendarExport({ roomId, members, weekStart, onWeekChange }: CalendarExportProps) {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [isCustomRange, setIsCustomRange] = useState(false);

  const currentWeekStart = getWeekStart(new Date());
  const isCurrentWeek = !isCustomRange && toDateStr(weekStart) === toDateStr(currentWeekStart);
  
  const [from, setFrom] = useState(toDateStr(weekStart));
  const [to, setTo]     = useState(toDateStr(addDays(weekStart, 6)));
  const [displayFrom, setDisplayFrom] = useState(isoToDisplay(toDateStr(weekStart)));
  const [displayTo,   setDisplayTo]   = useState(isoToDisplay(toDateStr(addDays(weekStart, 6))));

  // Sync internal range when weekStart changes (and not in custom mode)
  useEffect(() => {
    if (!isCustomRange) {
      const f = toDateStr(weekStart);
      const t = toDateStr(addDays(weekStart, 6));
      setFrom(f);
      setTo(t);
      setDisplayFrom(isoToDisplay(f));
      setDisplayTo(isoToDisplay(t));
    }
  }, [weekStart, isCustomRange]);

  const rangeValid = !!from && !!to && from <= to;

  const handleToday = useCallback(() => {
    onWeekChange(currentWeekStart);
    const f = todayStr();
    const t = toDateStr(addDays(currentWeekStart, 6));
    setFrom(f);
    setTo(t);
    setDisplayFrom(isoToDisplay(f));
    setDisplayTo(isoToDisplay(t));
    setIsCustomRange(true);
  }, [onWeekChange, currentWeekStart]);

  const goToFullWeek = useCallback((monday: Date) => {
    onWeekChange(monday);
    setIsCustomRange(false);
  }, [onWeekChange]);

  const goToWeek = useCallback((monday: Date) => {
    onWeekChange(monday);
    setIsCustomRange(false);
  }, [onWeekChange]);

  function handleDisplayFromChange(val: string) {
    setDisplayFrom(val);
    setIsCustomRange(true);
    const iso = displayToIso(val);
    if (iso) setFrom(iso);
  }

  function handleDisplayToChange(val: string) {
    setDisplayTo(val);
    setIsCustomRange(true);
    const iso = displayToIso(val);
    if (iso) setTo(iso);
  }

  function handlePickerFromChange(iso: string) {
    setFrom(iso);
    setDisplayFrom(isoToDisplay(iso));
    setIsCustomRange(true);
  }

  function handlePickerToChange(iso: string) {
    setTo(iso);
    setDisplayTo(isoToDisplay(iso));
    setIsCustomRange(true);
  }

  useEffect(() => {
    if (user && !selectedUserId) setSelectedUserId(user.userId);
  }, [user, selectedUserId]);

  useEffect(() => {
    setEvents([]);
    setEventsError(null);

    if (!rangeValid || !selectedUserId) {
      setLoadingEvents(false);
      return;
    }

    let cancelled = false;
    setLoadingEvents(true);
    const userId = selectedUserId !== user?.userId ? selectedUserId : null;
    api.getCalendarEvents(roomId, userId, from, to)
      .then((data) => { if (!cancelled) setEvents(data.events); })
      .catch((err) => {
        if (!cancelled) {
          setEventsError(err?.message ?? 'Failed to load events.');
        }
      })
      .finally(() => { if (!cancelled) setLoadingEvents(false); });

    return () => { cancelled = true; };
  }, [from, to, selectedUserId, roomId, user?.userId, rangeValid]);

  const fromInvalid = displayFrom.length === 10 && !displayToIso(displayFrom);
  const toInvalid   = displayTo.length === 10 && !displayToIso(displayTo);
  const orderInvalid = rangeValid === false && !!from && !!to;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-900">Add to Calendar</h3>
      </div>

      <p className="text-sm text-gray-500">
        Add your shifts directly to Google Calendar, Apple Calendar, Outlook, and more.
      </p>

      {/* Member picker */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600" htmlFor="cal-member-select">
          Show shifts for
        </label>
        <select
          id="cal-member-select"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.user?.name ?? m.user_id}
              {m.user_id === user?.userId ? ' (you)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">Date range</label>
          <div className="flex items-center gap-2">
            {!isCurrentWeek || isCustomRange ? (
              <button 
                onClick={() => goToFullWeek(currentWeekStart)} 
                className="text-xs text-blue-600 hover:underline"
              >
                {toDateStr(weekStart) === toDateStr(currentWeekStart) ? 'Full week' : 'This week'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToWeek(addDays(weekStart, -7))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          <span className="flex-1 text-center text-sm font-medium text-gray-800">
            {isCustomRange ? (
              <span className="text-gray-400 font-normal">Custom range</span>
            ) : (
              <span>
                {getRelativeWeekLabel(weekStart)}{' '}
                <span className="text-gray-400 font-normal">({formatWeekLabel(weekStart)})</span>
              </span>
            )}
          </span>

          <button onClick={handleToday} className="text-xs text-blue-600 hover:underline">
            Today
          </button>

          <button
            onClick={() => goToWeek(addDays(weekStart, 7))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Manual date inputs */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-gray-400" htmlFor="cal-from">From</label>
            <div className="relative">
              <input
                id="cal-from"
                type="text"
                placeholder="DD/MM/YYYY"
                value={displayFrom}
                onChange={(e) => handleDisplayFromChange(e.target.value)}
                className={`w-full text-sm border rounded-lg px-3 py-1.5 pr-8 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${fromInvalid ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              />
              <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={from}
                onChange={(e) => handlePickerFromChange(e.target.value)}
                className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <span className="text-gray-400 pb-2">–</span>

          <div className="flex-1 space-y-0.5">
            <label className="text-xs text-gray-400" htmlFor="cal-to">To</label>
            <div className="relative">
              <input
                id="cal-to"
                type="text"
                placeholder="DD/MM/YYYY"
                value={displayTo}
                onChange={(e) => handleDisplayToChange(e.target.value)}
                className={`w-full text-sm border rounded-lg px-3 py-1.5 pr-8 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${toInvalid ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              />
              <CalendarDays className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={to}
                onChange={(e) => handlePickerToChange(e.target.value)}
                className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {orderInvalid && !fromInvalid && !toInvalid && (
          <p className="text-xs text-red-500">"From" date must be on or before "To" date.</p>
        )}
      </div>

      {/* Calendar button / states */}
      {rangeValid && (
        <div className="pt-2">
          {(loadingEvents || !selectedUserId) ? (
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ) : eventsError ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {eventsError}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl space-y-1">
              <CalendarDays className="w-6 h-6 text-gray-300" />
              <p className="text-sm text-gray-400 font-medium">No shifts found for this range.</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full w-fit">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {events.length} {events.length === 1 ? 'shift' : 'shifts'} found
              </div>
              <AddToCalendarButton
                key={`${from}-${to}-${selectedUserId}`}
                name={
                  events.length === 1
                    ? events[0].name
                    : `${members.find(m => m.user_id === selectedUserId)?.user?.name || 'User'}'s Shifts`
                }
                description=""
                dates={events.map(e => ({ ...e, description: '' }))}
                options={['Apple', 'Google', 'iCal', 'Outlook.com', 'Yahoo']}
                timeZone="Asia/Jerusalem"
                buttonStyle="default"
                listStyle="modal"
                lightMode="system"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
