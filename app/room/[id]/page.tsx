/**
 * @file app/room/[id]/page.tsx
 * @description Room dashboard. Resolves the current user's membership and role
 * from live API data and renders the schedule grid with admin controls when applicable.
 *
 * Auth flow:
 *   - No token → redirect to /login?redirect=/room/:id
 *   - Token but not a member → show "Join Room" prompt
 *   - Token and member → show schedule (+ admin panel if ADMIN)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { RoomDetail, RoomMember, FullSchedule, UserRole } from '@/types';
import AdminPanel from '@/components/AdminPanel';
import ScheduleView from '@/components/ScheduleView';
import { Users, Layout, ShieldAlert, Loader2, LogOut, Copy, Check, AlertCircle } from 'lucide-react';

export default function RoomPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [schedule, setSchedule] = useState<FullSchedule | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Redirect unauthenticated users to login, preserving the room URL.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/room/${id}`)}`);
    }
  }, [authLoading, user, id, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [roomData, scheduleData] = await Promise.all([
        api.getRoom(id),
        api.getSchedule(id),
      ]);

      setRoom(roomData);
      setMembers(roomData.members);
      setSchedule(scheduleData);
      setIsMember(true);

      const myMembership = roomData.members.find((m) => m.user_id === user.userId);
      setCurrentUserRole((myMembership?.role as UserRole) ?? 'PARTICIPANT');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        if (err.status === 401) {
          logout();
          router.replace(`/login?redirect=${encodeURIComponent(`/room/${id}`)}`);
          return;
        }
        setIsMember(false);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load room data.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, user, logout, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, fetchData]);

  const [joinError, setJoinError] = useState('');

  async function handleJoin() {
    setLoading(true);
    setJoinError('');
    try {
      await api.joinRoom(id);
      await fetchData();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join room. Please try again.');
      setLoading(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  // Waiting for localStorage hydration or initial fetch.
  if (authLoading || (loading && !error && !room && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading room data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Join this Room</h1>
          <p className="text-gray-600">
            You are not a member of this room. Join now to see the shift schedule.
          </p>
          {joinError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{joinError}</p>
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg shadow-lg transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Join Room
          </button>
          <Link href="/" className="block text-sm text-gray-400 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <Layout className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">{room?.name}</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                title="Copy share link"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors border border-gray-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Share link'}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{members.length}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {currentUserRole}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors px-3 py-1.5 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Shift Schedule</h2>
            <p className="text-gray-500">Overview of all shift assignments for this room.</p>
          </div>
          {schedule && (
          <ScheduleView
            roomId={id}
            schedule={schedule}
            members={members}
            isAdmin={currentUserRole === 'ADMIN'}
            onRefresh={fetchData}
          />
        )}
        </section>

        {currentUserRole === 'ADMIN' && (
          <section>
            <AdminPanel
              roomId={id}
              locations={schedule?.locations ?? []}
              timeBlocks={schedule?.time_blocks ?? []}
              members={members}
              onRefresh={fetchData}
            />
          </section>
        )}
      </main>

      <footer className="py-12 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-400">ShiftManager &copy; 2026</p>
      </footer>
    </div>
  );
}
