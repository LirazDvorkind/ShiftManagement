/**
 * @file components/CalendarExport.tsx
 * @description "Add to Calendar" UI. Generates a webcal subscription link for any room member.
 */

'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RoomMember } from '@/types';
import { Calendar, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CalendarExportProps {
  roomId: string;
  members: RoomMember[];
}

const API_HOST =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? window.location.origin)
    : '';

export default function CalendarExport({ roomId, members }: CalendarExportProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Default to the signed-in user
  useEffect(() => {
    if (user && !selectedUserId) {
      setSelectedUserId(user.userId);
    }
  }, [user, selectedUserId]);

  useEffect(() => {
    api.getCalendarToken().then((res) => setToken(res.token)).catch(() => {});
  }, []);

  function buildWebcalUrl() {
    if (!token) return '';
    const base = API_HOST.replace(/^https?/, 'webcal');
    const params = new URLSearchParams({ roomId });
    if (selectedUserId && selectedUserId !== user?.userId) {
      params.set('userId', selectedUserId);
    }
    return `${base}/api/calendar/${token}.ics?${params.toString()}`;
  }

  function buildHttpsUrl() {
    if (!token) return '';
    const params = new URLSearchParams({ roomId });
    if (selectedUserId && selectedUserId !== user?.userId) {
      params.set('userId', selectedUserId);
    }
    return `${API_HOST}/api/calendar/${token}.ics?${params.toString()}`;
  }

  function handleAddToCalendar() {
    window.location.href = buildWebcalUrl();
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

  if (!token) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-900">Add to Calendar</h3>
      </div>

      <p className="text-sm text-gray-500">
        Subscribe to shifts in your calendar app. The feed updates automatically.
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAddToCalendar}
          className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Add to Calendar
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
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
        The feed refreshes every 12 hours.
      </p>
    </div>
  );
}
