/**
 * @file app/page.tsx
 * @description Landing page for creating a new Shift Management Room.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PlusCircle, Calendar } from 'lucide-react';

export default function LandingPage() {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setLoading(true);
    try {
      const room = await api.createRoom(roomName);
      router.push(`/room/${room.id}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Error creating room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ShiftManager</h1>
          <p className="mt-2 text-gray-600">
            Effortlessly organize your team's shifts in shared rooms.
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
              placeholder="e.g., Summer Shift 2024"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !roomName.trim()}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              <span className="flex items-center">
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New Room
              </span>
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
