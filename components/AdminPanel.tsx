/**
 * @file components/AdminPanel.tsx
 * @description Admin controls for managing room configurations and assignments.
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import { ShiftLocation, TimeBlock, RoomMember } from '@/types';
import { MapPin, Clock, UserPlus, ShieldCheck, Trash2, Plus, Users } from 'lucide-react';

interface AdminPanelProps {
  roomId: string;
  locations: ShiftLocation[];
  timeBlocks: TimeBlock[];
  members: RoomMember[];
  onRefresh: () => void;
}

export default function AdminPanel({ roomId, locations, timeBlocks, members, onRefresh }: AdminPanelProps) {
  // Add member form
  const [newMemberName, setNewMemberName] = useState('');

  // Location form
  const [newLocation, setNewLocation] = useState('');

  // Time block form
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('08:00');
  const [newBlockEnd, setNewBlockEnd] = useState('16:00');

  // Assignment form
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    try {
      await api.addLocation(roomId, newLocation.trim());
      setNewLocation('');
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to add location'); }
  };

  const handleRemoveLocation = async (locationId: string) => {
    if (!confirm('Remove this location? All its shifts will also be removed.')) return;
    try {
      await api.removeLocation(roomId, locationId);
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to remove location'); }
  };

  const handleAddTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockName.trim()) return;
    try {
      await api.addTimeBlock(roomId, newBlockName.trim(), newBlockStart, newBlockEnd);
      setNewBlockName('');
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to add time block'); }
  };

  const handleRemoveTimeBlock = async (blockId: string) => {
    if (!confirm('Remove this time block? All its shifts will also be removed.')) return;
    try {
      await api.removeTimeBlock(roomId, blockId);
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to remove time block'); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedLocation || !selectedBlock || !selectedDate) return;
    try {
      await api.assignShift(roomId, {
        user_id: selectedUser,
        shift_location_id: selectedLocation,
        time_block_id: selectedBlock,
        date: selectedDate,
      });
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to assign shift'); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      await api.addMember(roomId, newMemberName.trim());
      setNewMemberName('');
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to add person'); }
  };

  const handlePromote = async (userId: string) => {
    try {
      await api.updateMemberRole(roomId, userId, 'ADMIN');
      onRefresh();
    } catch (err: any) { alert(err.message || 'Failed to promote user'); }
  };

  return (
    <div className="space-y-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 flex items-center">
        <ShieldCheck className="w-6 h-6 mr-2 text-indigo-600" />
        Admin Controls
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Locations */}
        <section className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
            <MapPin className="w-4 h-4 mr-1" /> Locations
          </h3>

          <ul className="divide-y divide-gray-100">
            {locations.length === 0 && (
              <li className="text-xs text-gray-400 italic py-1">No locations yet</li>
            )}
            {locations.map(loc => (
              <li key={loc.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-800">{loc.name}</span>
                <button
                  onClick={() => handleRemoveLocation(loc.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                  title="Remove location"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddLocation} className="flex gap-2 pt-1">
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              placeholder="e.g. Front Desk"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
            <button className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </section>

        {/* Time Blocks */}
        <section className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 mr-1" /> Time Blocks
          </h3>

          <ul className="divide-y divide-gray-100">
            {timeBlocks.length === 0 && (
              <li className="text-xs text-gray-400 italic py-1">No time blocks yet</li>
            )}
            {timeBlocks.map(block => (
              <li key={block.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{block.name}</p>
                  <p className="text-xs text-gray-400">{block.start_time} – {block.end_time}</p>
                </div>
                <button
                  onClick={() => handleRemoveTimeBlock(block.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                  title="Remove time block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddTimeBlock} className="space-y-2 pt-1">
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Name (e.g. Morning)"
              value={newBlockName}
              onChange={(e) => setNewBlockName(e.target.value)}
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-0.5 block">Start (HH:MM)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{2}:\d{2}"
                  placeholder="08:00"
                  className="w-full px-2 py-1.5 border rounded-md text-sm"
                  value={newBlockStart}
                  onChange={(e) => setNewBlockStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-0.5 block">End (HH:MM)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{2}:\d{2}"
                  placeholder="16:00"
                  className="w-full px-2 py-1.5 border rounded-md text-sm"
                  value={newBlockEnd}
                  onChange={(e) => setNewBlockEnd(e.target.value)}
                />
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Add Time Block
            </button>
          </form>
        </section>

        {/* Assign Shift */}
        <section className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
            <UserPlus className="w-4 h-4 mr-1" /> Assign Shift
          </h3>
          <form onSubmit={handleAssign} className="space-y-2">
            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="">Select Person</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.user?.name || m.user_id}</option>
              ))}
            </select>

            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
            >
              <option value="">Select Location</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            <select
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={selectedBlock}
              onChange={e => setSelectedBlock(e.target.value)}
            >
              <option value="">Select Time Block</option>
              {timeBlocks.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.start_time}–{b.end_time})</option>
              ))}
            </select>

            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />

            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium">
              Assign
            </button>
          </form>
        </section>
      </div>

      {/* Member Management */}
      <section className="bg-white p-4 rounded-lg shadow-sm overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
          <Users className="w-4 h-4 mr-1" /> People
        </h3>

        <div className="divide-y divide-gray-100 mb-4">
          {members.map((member) => (
            <div key={member.user_id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{member.user?.name || 'Anonymous'}</p>
                <p className="text-xs text-gray-500 uppercase">{member.role}</p>
              </div>
              {member.role === 'PARTICIPANT' && (
                <button
                  onClick={() => handlePromote(member.user_id)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 rounded transition-colors"
                >
                  Make Admin
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            placeholder="Add person by name…"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          />
          <button className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">
            <Plus className="w-4 h-4" />
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-1.5">Creates an account if the person hasn't registered yet.</p>
      </section>
    </div>
  );
}
