/**
 * @file components/AdminPanel.tsx
 * @description Admin controls for managing room configurations and assignments.
 */

import { useState } from 'react';
import { api } from '@/lib/api';
import { 
  ShiftLocation, 
  ShiftTime, 
  User, 
  RoomMember, 
  ShiftType 
} from '@/types';
import { MapPin, Clock, UserPlus, ShieldCheck } from 'lucide-react';

interface AdminPanelProps {
  roomId: string;
  locations: ShiftLocation[];
  times: ShiftTime[];
  members: RoomMember[];
  onRefresh: () => void;
}

export default function AdminPanel({ roomId, locations, times, members, onRefresh }: AdminPanelProps) {
  const [newLocation, setNewLocation] = useState('');
  const [newShiftType, setNewShiftType] = useState<ShiftType>('MORNING');
  const [newShiftDate, setNewShiftDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Assignment form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    try {
      await api.addLocation(roomId, newLocation);
      setNewLocation('');
      onRefresh();
    } catch (err) { alert('Failed to add location'); }
  };

  const handleAddShiftTime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addShiftTime(roomId, newShiftType, newShiftDate);
      onRefresh();
    } catch (err) { alert('Failed to add shift time'); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedLocation || !selectedTime) return;
    try {
      await api.assignShift(roomId, {
        user_id: selectedUser,
        shift_location_id: selectedLocation,
        shift_time_id: selectedTime
      });
      onRefresh();
    } catch (err) { alert('Failed to assign shift'); }
  };

  const handlePromote = async (userId: string) => {
    try {
      await api.updateMemberRole(roomId, userId, 'ADMIN');
      onRefresh();
    } catch (err) { alert('Failed to promote user'); }
  };

  return (
    <div className="space-y-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 flex items-center">
        <ShieldCheck className="w-6 h-6 mr-2 text-indigo-600" />
        Admin Controls
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Locations Section */}
        <section className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <MapPin className="w-4 h-4 mr-1" /> Add Location
          </h3>
          <form onSubmit={handleAddLocation} className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              placeholder="e.g. Front Desk"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">Add</button>
          </form>
        </section>

        {/* Shift Times Section */}
        <section className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <Clock className="w-4 h-4 mr-1" /> Add Shift Time
          </h3>
          <form onSubmit={handleAddShiftTime} className="space-y-3">
            <select 
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={newShiftType}
              onChange={(e) => setNewShiftType(e.target.value as ShiftType)}
            >
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
              <option value="NIGHT">Night</option>
            </select>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={newShiftDate}
              onChange={(e) => setNewShiftDate(e.target.value)}
            />
            <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">Add Shift</button>
          </form>
        </section>

        {/* Assignments Section */}
        <section className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <UserPlus className="w-4 h-4 mr-1" /> Assign Shift
          </h3>
          <form onSubmit={handleAssign} className="space-y-3">
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">Select User</option>
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.user?.name || m.user_id}</option>)}
            </select>
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedTime} onChange={e => setSelectedTime(e.target.value)}>
              <option value="">Select Time</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.type} - {t.date}</option>)}
            </select>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium">Assign</button>
          </form>
        </section>
      </div>

      {/* Member Management */}
      <section className="bg-white p-4 rounded-lg shadow-sm overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Member Management</h3>
        <div className="divide-y divide-gray-100">
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
      </section>
    </div>
  );
}
