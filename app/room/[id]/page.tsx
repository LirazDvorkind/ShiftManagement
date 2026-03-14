/**
 * @file app/room/[id]/page.tsx
 * @description Main Room Dashboard view. Handles fetching data and switching between Admin and Schedule views.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Room, RoomMember, FullSchedule } from '@/types';
import AdminPanel from '@/components/AdminPanel';
import ScheduleView from '@/components/ScheduleView';
import { Users, Layout, ShieldAlert, Loader2 } from 'lucide-react';

export default function RoomPage() {
  const { id } = useParams() as { id: string };
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [schedule, setSchedule] = useState<FullSchedule | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'PARTICIPANT' | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const roomData = await api.getRoom(id);
      const scheduleData = await api.getSchedule(id);
      
      setRoom(roomData);
      setSchedule(scheduleData);
      
      // In a real app, you would fetch current user's role here
      // Mocking for now: check if user is in members list
      // For demo, we assume the first joiner is admin, etc.
      // Usually provided via Auth context/token
      
      // Assume we can fetch members
      // const membersList = await api.getMembers(id);
      // setMembers(membersList);
      
      setIsMember(true); // Simplified for this implementation
      setCurrentUserRole('ADMIN'); // Defaulting to Admin for visibility during dev
    } catch (err: any) {
      if (err.status === 403 || err.status === 401) {
        setIsMember(false);
      } else {
        setError(err.message || 'Failed to load room data');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleJoin = async () => {
    try {
      setLoading(true);
      await api.joinRoom(id);
      fetchData();
    } catch (err: any) {
      alert('Failed to join room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading room data...</p>
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
            You are not a member of <span className="font-semibold">{room?.name || 'this room'}</span>. 
            Join now to see the shift schedule and participate.
          </p>
          <button
            onClick={handleJoin}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-colors"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white mr-3">
                <Layout className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{room?.name}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                {currentUserRole}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Schedule View */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Shift Schedule</h2>
            <p className="text-gray-500">Overview of all shift assignments for this room.</p>
          </div>
          {schedule && <ScheduleView schedule={schedule} />}
        </section>

        {/* Admin Controls - Only visible to ADMIN */}
        {currentUserRole === 'ADMIN' && (
          <section>
            <AdminPanel 
              roomId={id}
              locations={schedule?.locations || []}
              times={schedule?.times || []}
              members={members}
              onRefresh={fetchData}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-400">ShiftManager &copy; 2026</p>
      </footer>
    </div>
  );
}
