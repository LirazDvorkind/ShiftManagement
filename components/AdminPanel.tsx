/**
 * @file components/AdminPanel.tsx
 * @description Admin controls for managing room configurations and assignments.
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ShiftLocation, TimeBlock, RoomMember } from '@/types';
import { MapPin, Clock, UserPlus, ShieldCheck, Trash2, Plus, Users, Calendar, Check, Loader2, AlertCircle } from 'lucide-react';

interface AdminPanelProps {
  roomId: string;
  locations: ShiftLocation[];
  timeBlocks: TimeBlock[];
  members: RoomMember[];
  onRefresh: () => void;
}

type BtnState = 'idle' | 'loading' | 'success';

function useFormState() {
  const [state, setState] = useState<BtnState>('idle');
  const succeed = useCallback(() => {
    setState('success');
    setTimeout(() => setState('idle'), 1500);
  }, []);
  const load = useCallback(() => setState('loading'), []);
  const idle = useCallback(() => setState('idle'), []);
  return { state, succeed, load, idle };
}

/** Submit button that shows a spinner while loading and a checkmark on success */
function ActionButton({
  state,
  idleContent,
  fullWidth = false,
  color = 'indigo',
}: {
  state: BtnState;
  idleContent: React.ReactNode;
  fullWidth?: boolean;
  color?: 'indigo' | 'green';
}) {
  const base = `flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fullWidth ? 'w-full' : ''}`;
  const colors = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    green:  'bg-green-600  hover:bg-green-700  text-white',
  };
  const successCls = 'bg-green-500 text-white scale-95';
  const loadingCls = `${colors[color]} opacity-75 cursor-not-allowed`;

  return (
    <button
      type="submit"
      disabled={state !== 'idle'}
      className={`${base} ${state === 'success' ? successCls : state === 'loading' ? loadingCls : colors[color]}`}
    >
      {state === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
      {state === 'success' && <Check className="w-4 h-4" />}
      {state === 'idle'    && idleContent}
    </button>
  );
}

/** Inline error message displayed below forms */
function InlineError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
      <p className="text-xs text-red-600">{message}</p>
    </div>
  );
}

// --- Validation helpers ---

function isValidTime(t: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (!m) return false;
  const h = parseInt(m[1]), min = parseInt(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

function isValidDisplayDate(display: string): boolean {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(display);
  if (!m) return false;
  const [, d, mo, y] = m;
  const date = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
  return !isNaN(date.getTime());
}

// --- Component ---

export default function AdminPanel({ roomId, locations, timeBlocks, members, onRefresh }: AdminPanelProps) {
  const locationBtn  = useFormState();
  const blockBtn     = useFormState();
  const assignBtn    = useFormState();
  const memberBtn    = useFormState();

  // Location form
  const [newLocation, setNewLocation] = useState('');
  const [locationErr, setLocationErr] = useState('');

  // Time block form
  const [newBlockName,  setNewBlockName]  = useState('');
  const [newBlockStart, setNewBlockStart] = useState('08:00');
  const [newBlockEnd,   setNewBlockEnd]   = useState('16:00');
  const [startErr, setStartErr] = useState('');
  const [endErr,   setEndErr]   = useState('');
  const [blockApiErr, setBlockApiErr] = useState('');

  // Assignment form
  const [selectedUser,     setSelectedUser]     = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedBlock,    setSelectedBlock]    = useState('');
  const [dateErr, setDateErr] = useState('');
  const [assignErr, setAssignErr] = useState('');

  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [displayDate,  setDisplayDate]  = useState(() => {
    const [y, m, d] = todayIso.split('-');
    return `${d}/${m}/${y}`;
  });

  // Member form
  const [newMemberName, setNewMemberName] = useState('');
  const [memberErr, setMemberErr] = useState('');
  const [promoteErr, setPromoteErr] = useState('');

  // --- Handlers ---

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    setLocationErr('');
    locationBtn.load();
    try {
      await api.addLocation(roomId, newLocation.trim());
      setNewLocation('');
      onRefresh();
      locationBtn.succeed();
    } catch (err: any) {
      locationBtn.idle();
      setLocationErr(err.message || 'Failed to add location. Please try again.');
    }
  };

  const handleRemoveLocation = async (locationId: string) => {
    if (!confirm('Remove this location? All its shifts will also be removed.')) return;
    setLocationErr('');
    try {
      await api.removeLocation(roomId, locationId);
      onRefresh();
    } catch (err: any) {
      setLocationErr(err.message || 'Failed to remove location. Please try again.');
    }
  };

  const handleAddTimeBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!isValidTime(newBlockStart)) { setStartErr('Enter a valid time (HH:MM, 00–23)'); valid = false; } else setStartErr('');
    if (!isValidTime(newBlockEnd))   { setEndErr('Enter a valid time (HH:MM, 00–23)');   valid = false; } else setEndErr('');
    if (!newBlockName.trim() || !valid) return;
    setBlockApiErr('');
    blockBtn.load();
    try {
      await api.addTimeBlock(roomId, newBlockName.trim(), newBlockStart, newBlockEnd);
      setNewBlockName('');
      onRefresh();
      blockBtn.succeed();
    } catch (err: any) {
      blockBtn.idle();
      setBlockApiErr(err.message || 'Failed to add time block. Please try again.');
    }
  };

  const handleRemoveTimeBlock = async (blockId: string) => {
    if (!confirm('Remove this time block? All its shifts will also be removed.')) return;
    setBlockApiErr('');
    try {
      await api.removeTimeBlock(roomId, blockId);
      onRefresh();
    } catch (err: any) {
      setBlockApiErr(err.message || 'Failed to remove time block. Please try again.');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDisplayDate(displayDate)) {
      setDateErr('Enter a valid date (DD/MM/YYYY)');
      return;
    }
    setDateErr('');
    setAssignErr('');
    if (!selectedUser || !selectedLocation || !selectedBlock || !selectedDate) return;
    assignBtn.load();
    try {
      await api.assignShift(roomId, {
        user_id: selectedUser,
        shift_location_id: selectedLocation,
        time_block_id: selectedBlock,
        date: selectedDate,
      });
      onRefresh();
      assignBtn.succeed();
    } catch (err: any) {
      assignBtn.idle();
      setAssignErr(err.message || 'Failed to assign shift. Please try again.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setMemberErr('');
    memberBtn.load();
    try {
      await api.addMember(roomId, newMemberName.trim());
      setNewMemberName('');
      onRefresh();
      memberBtn.succeed();
    } catch (err: any) {
      memberBtn.idle();
      setMemberErr(err.message || 'Failed to add person. Please try again.');
    }
  };

  const handlePromote = async (userId: string) => {
    setPromoteErr('');
    try {
      await api.updateMemberRole(roomId, userId, 'ADMIN');
      onRefresh();
    } catch (err: any) {
      setPromoteErr(err.message || 'Failed to promote user. Please try again.');
    }
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
            {locations.length === 0 && <li className="text-xs text-gray-400 italic py-1">No locations yet</li>}
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
              onChange={e => { setNewLocation(e.target.value); setLocationErr(''); }}
            />
            <ActionButton state={locationBtn.state} idleContent={<Plus className="w-4 h-4" />} />
          </form>
          <InlineError message={locationErr} />
        </section>

        {/* Time Blocks */}
        <section className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
            <Clock className="w-4 h-4 mr-1" /> Time Blocks
          </h3>
          <ul className="divide-y divide-gray-100">
            {timeBlocks.length === 0 && <li className="text-xs text-gray-400 italic py-1">No time blocks yet</li>}
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
              onChange={e => { setNewBlockName(e.target.value); setBlockApiErr(''); }}
            />
            <div className="flex gap-2">
              {([
                { label: 'Start', value: newBlockStart, set: setNewBlockStart, err: startErr, clearErr: () => setStartErr('') },
                { label: 'End',   value: newBlockEnd,   set: setNewBlockEnd,   err: endErr,   clearErr: () => setEndErr('')   },
              ] as const).map(({ label, value, set, err, clearErr }) => (
                <div key={label} className="flex-1">
                  <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:MM"
                      className={`w-full px-2 py-1.5 pr-7 border rounded-md text-sm transition-colors ${err ? 'border-red-400 bg-red-50' : ''}`}
                      value={value}
                      onChange={e => { set(e.target.value); clearErr(); setBlockApiErr(''); }}
                    />
                    <Clock className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="time"
                      className="absolute right-0 top-0 h-full w-7 opacity-0 cursor-pointer"
                      value={value}
                      onChange={e => { set(e.target.value); clearErr(); setBlockApiErr(''); }}
                    />
                  </div>
                  {err && <p className="text-[11px] text-red-500 mt-0.5">{err}</p>}
                </div>
              ))}
            </div>
            <ActionButton
              state={blockBtn.state}
              idleContent={<><Plus className="w-4 h-4" /> Add Time Block</>}
              fullWidth
            />
          </form>
          <InlineError message={blockApiErr} />
        </section>

        {/* Assign Shift */}
        <section className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center">
            <UserPlus className="w-4 h-4 mr-1" /> Assign Shift
          </h3>
          <form onSubmit={handleAssign} className="space-y-2">
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedUser} onChange={e => { setSelectedUser(e.target.value); setAssignErr(''); }}>
              <option value="">Select Person</option>
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.user?.name || m.user_id}</option>)}
            </select>
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setAssignErr(''); }}>
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedBlock} onChange={e => { setSelectedBlock(e.target.value); setAssignErr(''); }}>
              <option value="">Select Time Block</option>
              {timeBlocks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.start_time}–{b.end_time})</option>)}
            </select>

            <div>
              <div className="relative w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/YYYY"
                  className={`w-full px-3 py-2 pr-8 border rounded-md text-sm bg-white transition-colors ${dateErr ? 'border-red-400 bg-red-50' : ''}`}
                  value={displayDate}
                  onChange={e => {
                    const raw = e.target.value;
                    setDisplayDate(raw);
                    setDateErr('');
                    setAssignErr('');
                    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
                    if (match) {
                      const [, d, m, y] = match;
                      setSelectedDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
                    }
                  }}
                />
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
                  value={selectedDate}
                  onChange={e => {
                    const iso = e.target.value;
                    setSelectedDate(iso);
                    setDateErr('');
                    setAssignErr('');
                    const [y, m, d] = iso.split('-');
                    setDisplayDate(`${d}/${m}/${y}`);
                  }}
                />
              </div>
              {dateErr && <p className="text-[11px] text-red-500 mt-0.5">{dateErr}</p>}
            </div>

            <ActionButton state={assignBtn.state} idleContent="Assign" fullWidth color="green" />
            <InlineError message={assignErr} />
          </form>
        </section>
      </div>

      {/* Member Management */}
      <section className="bg-white p-4 rounded-lg shadow-sm overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
          <Users className="w-4 h-4 mr-1" /> People
        </h3>
        {promoteErr && (
          <div className="mb-3">
            <InlineError message={promoteErr} />
          </div>
        )}
        <div className="divide-y divide-gray-100 mb-4">
          {members.map(member => (
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
            onChange={e => { setNewMemberName(e.target.value); setMemberErr(''); }}
          />
          <ActionButton state={memberBtn.state} idleContent={<Plus className="w-4 h-4" />} />
        </form>
        <p className="text-xs text-gray-400 mt-1.5">Creates an account if the person hasn't registered yet.</p>
        {memberErr && (
          <div className="mt-2">
            <InlineError message={memberErr} />
          </div>
        )}
      </section>
    </div>
  );
}
