/**
 * @file components/CalendarExport.tsx
 * @description "Add to Calendar" UI. Generates a webcal subscription link for any room member.
 */

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RoomMember } from '@/types';
import { Calendar, Copy, Check, RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CalendarExportProps {
  roomId: string;
  members: RoomMember[];
}

const API_HOST =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? window.location.origin)
    : '';

// ── Date helpers ────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → "DD/MM/YYYY" */
function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

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

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(date: Date): string {
  return isoToDisplay(toDateStr(date));
}

function formatWeekLabel(monday: Date): string {
  return `${fmtDate(monday)} – ${fmtDate(addDays(monday, 6))}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CalendarExport({ roomId, members }: CalendarExportProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekMonday = getWeekMonday(today);

  const [weekMonday, setWeekMonday] = useState<Date>(currentWeekMonday);
  const [isCustomRange, setIsCustomRange] = useState(false);

  const isCurrentWeek = !isCustomRange && toDateStr(weekMonday) === toDateStr(currentWeekMonday);
  const defaultFrom = isCurrentWeek ? toDateStr(today) : toDateStr(weekMonday);
  const defaultTo = toDateStr(addDays(weekMonday, 6));

  // ISO values used in API URLs
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo]     = useState(defaultTo);
  // Display values shown to the user (DD/MM/YYYY)
  const [displayFrom, setDisplayFrom] = useState(isoToDisplay(defaultFrom));
  const [displayTo,   setDisplayTo]   = useState(isoToDisplay(defaultTo));

  const rangeValid = !!from && !!to && from <= to;

  // Sync when week navigation changes (not when user typed custom)
  useEffect(() => {
    if (!isCustomRange) {
      const f = isCurrentWeek ? toDateStr(today) : toDateStr(weekMonday);
      const t = toDateStr(addDays(weekMonday, 6));
      setFrom(f);
      setTo(t);
      setDisplayFrom(isoToDisplay(f));
      setDisplayTo(isoToDisplay(t));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekMonday, isCustomRange]);

  function goToWeek(monday: Date) {
    setWeekMonday(monday);
    setIsCustomRange(false);
  }

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

  // Default to signed-in user
  useEffect(() => {
    if (user && !selectedUserId) setSelectedUserId(user.userId);
  }, [user, selectedUserId]);

  useEffect(() => {
    api.getCalendarToken()
      .then((res) => setToken(res.token))
      .catch((err) => setTokenError(err?.message ?? 'Failed to load calendar token'));
  }, []);

  function buildParams() {
    const params = new URLSearchParams({ roomId, from, to });
    if (selectedUserId && selectedUserId !== user?.userId) params.set('userId', selectedUserId);
    return params.toString();
  }

  function buildWebcalUrl() {
    if (!token) return '';
    return `${API_HOST.replace(/^https?/, 'webcal')}/api/calendar/${token}.ics?${buildParams()}`;
  }

  function buildHttpsUrl() {
    if (!token) return '';
    return `${API_HOST}/api/calendar/${token}.ics?${buildParams()}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildHttpsUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await api.regenerateCalendarToken();
      setToken(res.token);
    } finally {
      setRegenerating(false);
    }
  }

  if (!token) {
    if (tokenError) {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Add to Calendar</h3>
          </div>
          <p className="text-sm text-red-500">Calendar unavailable: {tokenError}</p>
        </div>
      );
    }
    return null;
  }

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
        Export shifts to your calendar app for the selected date range.
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
          {isCustomRange && (
            <button onClick={() => goToWeek(currentWeekMonday)} className="text-xs text-blue-600 hover:underline">
              Reset to this week
            </button>
          )}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToWeek(addDays(weekMonday, -7))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          <span className="flex-1 text-center text-sm font-medium text-gray-800">
            {isCustomRange ? (
              <span className="text-gray-400 font-normal">Custom range</span>
            ) : isCurrentWeek ? (
              <span>This week <span className="text-gray-400 font-normal">({formatWeekLabel(weekMonday)})</span></span>
            ) : (
              formatWeekLabel(weekMonday)
            )}
          </span>

          <button
            onClick={() => goToWeek(addDays(weekMonday, 7))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>

          {!isCurrentWeek && !isCustomRange && (
            <button onClick={() => goToWeek(currentWeekMonday)} className="text-xs text-blue-600 hover:underline">
              Today
            </button>
          )}
        </div>

        {/* Manual date inputs — DD/MM/YYYY text + hidden date picker (same pattern as AdminPanel) */}
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { window.location.href = buildWebcalUrl(); }}
          disabled={!rangeValid}
          className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink className="w-4 h-4" />
          Add to Calendar
        </button>

        <button
          onClick={handleCopy}
          disabled={!rangeValid}
          className="flex items-center gap-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          title="Regenerate link — invalidates old subscriptions"
          className="flex items-center gap-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          Regenerate link
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Google Calendar on web: paste the link into{' '}
        <span className="font-medium text-gray-500">Other calendars → From URL</span>.
      </p>
    </div>
  );
}
