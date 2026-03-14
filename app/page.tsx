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
import { PlusCircle, Calendar, LogOut, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);

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

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!roomName.trim()) return;
    setCreating(true);
    try {
      const room = await api.createRoom(roomName);
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      alert(err.message || 'Error creating room. Please try again.');
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
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
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
          <h1 className="text-3xl font-bold text-gray-900">ShiftManager</h1>
          <p className="mt-2 text-gray-600">
            Effortlessly organize your team&apos;s shifts in shared rooms.
          </p>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g., Summer Shift 2026"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={creating || !roomName.trim()}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                Creating…
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New Room
              </>
            )}
          </button>
        </form>

        <div className="pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Simple • Fast • Collaborative
          </p>
        </div>
      </div>
    </div>
  );
}
