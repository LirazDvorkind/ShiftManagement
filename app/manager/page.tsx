/**
 * @file app/manager/page.tsx
 * @description Manager dashboard — password-protected view of all rooms.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { manager } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { ShieldCheck, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface ManagerRoom {
  id: string;
  number: number;
  name: string;
  created_at: string;
  members: { user_id: string; name: string; role: string }[];
}

export default function ManagerPage() {
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loginErr, setLoginErr]   = useState('');
  const [logging, setLogging]     = useState(false);

  const [authedPw, setAuthedPw]   = useState('');
  const [rooms, setRooms]         = useState<ManagerRoom[] | null>(null);

  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState('');

  const isLoggedIn = rooms !== null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr('');
    setLogging(true);
    try {
      const data = await manager.getRooms(password);
      setRooms(data);
      setAuthedPw(password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setLoginErr('Incorrect password.');
      } else {
        setLoginErr('Could not connect to server. Please try again.');
      }
    } finally {
      setLogging(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete(room: ManagerRoom) {
    if (!confirm(`Delete room "${room.name}" and all its data? This cannot be undone.`)) return;
    setDeleting(room.id);
    setDeleteErr('');
    try {
      await manager.deleteRoom(authedPw, room.id);
      setRooms(prev => prev!.filter(r => r.id !== room.id));
    } catch (err: any) {
      setDeleteErr(err.message || 'Failed to delete room.');
    } finally {
      setDeleting(null);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mb-3">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Access</h1>
            <p className="text-sm text-gray-500 mt-1">Enter the manager password to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm pr-10 outline-none focus:ring-2 focus:ring-indigo-500 transition ${loginErr ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginErr(''); }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {loginErr && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{loginErr}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={logging || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors"
            >
              {logging && <Loader2 className="w-4 h-4 animate-spin" />}
              {logging ? 'Verifying…' : 'Enter'}
            </button>
          </form>

          <Link href="/" className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-gray-900">Manager Dashboard</span>
            <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {rooms.length} room{rooms.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {deleteErr && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{deleteErr}</p>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="text-center py-16 text-gray-400">No rooms exist yet.</div>
        )}

        {rooms.map(room => {
          const isExpanded = expanded.has(room.id);
          const admins = room.members.filter(m => m.role === 'ADMIN');
          const participants = room.members.filter(m => m.role === 'PARTICIPANT');

          return (
            <div key={room.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Room header row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(room.id)}
                    className="flex items-center gap-2 text-left group"
                  >
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                        {room.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Room #{room.number} &middot; {room.members.length} member{room.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(room)}
                  disabled={deleting === room.id}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting === room.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>

              {/* Members list (collapsible) */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                  {room.members.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No members.</p>
                  )}

                  {admins.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admins</p>
                      <div className="space-y-1">
                        {admins.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                          <div key={m.user_id} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <span className="font-medium text-gray-800">{m.name}</span>
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Admin</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {participants.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Members</p>
                      <div className="space-y-1">
                        {participants.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                          <div key={m.user_id} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                            <span className="text-gray-700">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
