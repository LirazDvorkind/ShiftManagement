/**
 * @file app/page.tsx
 * @description Landing page. Requires authentication — unauthenticated users
 * are redirected to /login. Authenticated users can create a new room.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlusCircle, Calendar, LogOut, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const [roomNumber, setRoomNumber] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  async function handleGoToRoom(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(roomNumber, 10);
    if (!n || n < 1) return;
    setCreating(true);
    setCreateErr('');
    try {
      const room = await api.createRoom(n);
      router.push(`/room/${room.number}`);
    } catch (err: any) {
      setCreateErr(err.message || 'Something went wrong. Please try again.');
      setCreating(false);
    }
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Top-right user info */}
      <div className="fixed top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">
          Signed in as <span className="font-medium text-gray-900">{user.name}</span>
        </span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors px-3 py-1.5 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Manager</h1>
          <p className="mt-2 text-gray-600">
            Effortlessly organize your team&apos;s shifts in shared rooms.
          </p>
        </div>

        <form onSubmit={handleGoToRoom} className="space-y-4">
          <div>
            <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Room Number
            </label>
            <input
              id="roomNumber"
              type="number"
              min={1}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-mono"
              placeholder="e.g. 100"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Enter a number to join an existing room, or create it if it doesn&apos;t exist yet.</p>
          </div>

          {createErr && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{createErr}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={creating || !roomNumber}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                Loading…
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5 mr-2" />
                Go to Room
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <Link
          href="/manager"
          className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Manager access
        </Link>
      </div>
    </div>
  );
}
