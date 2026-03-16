/**
 * @file components/AdminPanel.tsx
 * @description Admin controls for managing room configurations and assignments.
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { ShiftLocation, TimeBlock, RoomMember } from '@/types';
import { MapPin, Clock, UserPlus, ShieldCheck, Trash2, Plus, Users, Calendar, Check, Loader2, AlertCircle, Pencil, X } from 'lucide-react';
import { isoToDisplay } from '@/lib/dateUtils';

interface AdminPanelProps {
  roomId: string;
  currentUserId: string;
  locations: ShiftLocation[];
  timeBlocks: TimeBlock[];
  members: RoomMember[];
  onRefresh: () => void;
  onRoomDeleted: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
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

export default function AdminPanel({
  roomId,
  currentUserId,
  locations,
  timeBlocks,
  members,
  onRefresh,
  onRoomDeleted,
  selectedDate,
  onDateChange,
}: AdminPanelProps) {
  const sortedLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTimeBlocks = [...timeBlocks].sort((a, b) => a.name.localeCompare(b.name));
  const sortedMembers = [...members].sort((a, b) => (a.user?.name ?? '').localeCompare(b.user?.name ?? ''));
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

  const [displayDate, setDisplayDate] = useState(() => isoToDisplay(selectedDate));

  // Sync displayDate when selectedDate changes from prop (e.g. week navigation)
  useEffect(() => {
    setDisplayDate(isoToDisplay(selectedDate));
  }, [selectedDate]);

  // Member form
  const [newMemberName, setNewMemberName] = useState('');
  const [memberErr, setMemberErr] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');
  const [memberActionErr, setMemberActionErr] = useState('');

  // Inline rename
  const [editing, setEditing] = useState<{ type: 'location' | 'block' | 'member'; id: string; value: string } | null>(null);
  const [renameErr, setRenameErr] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  // --- Handlers ---

  const handleRename = async () => {
    if (!editing) return;
    const name = editing.value.trim();
    if (!name) return;
    setRenameErr('');
    setRenameSaving(true);
    try {
      if (editing.type === 'location') {
        await api.renameLocation(roomId, editing.id, name);
      } else if (editing.type === 'block') {
        await api.renameTimeBlock(roomId, editing.id, name);
      } else {
        const duplicate = members.some(
          m => m.user_id !== editing.id && (m.user?.name ?? '').toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
          setRenameErr(`A person named "${name}" is already in this room.`);
          setRenameSaving(false);
          return;
        }
        await api.renameMember(roomId, editing.id, name);
      }
      setEditing(null);
      onRefresh();
    } catch (err: any) {
      setRenameErr(err.message || 'Failed to rename. Please try again.');
    } finally {
      setRenameSaving(false);
    }
  };

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
    const name = newMemberName.trim();
    if (!name) return;
    setMemberErr('');
    setMemberSuccess('');
    const alreadyMember = members.some(
      m => (m.user?.name ?? '').toLowerCase() === name.toLowerCase()
    );
    if (alreadyMember) {
      setMemberErr(`${name} is already in this room.`);
      return;
    }
    memberBtn.load();
    try {
      await api.addMember(roomId, name);
      setNewMemberName('');
      onRefresh();
      memberBtn.succeed();
      setMemberSuccess(`${name} has been added to the room.`);
      setTimeout(() => setMemberSuccess(''), 4000);
    } catch (err: any) {
      memberBtn.idle();
      setMemberErr(err.message || 'Failed to add person. Please try again.');
    }
  };

  const handlePromote = async (userId: string) => {
    setMemberActionErr('');
    try {
      await api.updateMemberRole(roomId, userId, 'ADMIN');
      onRefresh();
    } catch (err: any) {
      setMemberActionErr(err.message || 'Failed to promote user. Please try again.');
    }
  };

  const handleDemote = async (userId: string) => {
    setMemberActionErr('');
    try {
      await api.updateMemberRole(roomId, userId, 'PARTICIPANT');
      onRefresh();
    } catch (err: any) {
      setMemberActionErr(err.message || 'Failed to demote user. Please try again.');
    }
  };

  const [deleteRoomErr, setDeleteRoomErr] = useState('');
  const [deletingRoom, setDeletingRoom] = useState(false);

  const handleDeleteRoom = async () => {
    if (!confirm('Delete this room? All locations, time blocks, shifts, and members will be permanently removed.')) return;
    setDeleteRoomErr('');
    setDeletingRoom(true);
    try {
      await api.deleteRoom(roomId);
      onRoomDeleted();
    } catch (err: any) {
      setDeleteRoomErr(err.message || 'Failed to delete room. Please try again.');
      setDeletingRoom(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this room?`)) return;
    setMemberActionErr('');
    try {
      await api.removeMember(roomId, userId);
      onRefresh();
    } catch (err: any) {
      setMemberActionErr(err.message || 'Failed to remove member. Please try again.');
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
            {sortedLocations.length === 0 && <li className="text-xs text-gray-400 italic py-1">No locations yet</li>}
            {sortedLocations.map(loc => (
              <li key={loc.id} className="py-1.5">
                {editing?.type === 'location' && editing.id === loc.id ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        value={editing.value}
                        onChange={e => { setEditing({ ...editing, value: e.target.value }); setRenameErr(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
                      />
                      <button onClick={handleRename} disabled={renameSaving} className="p-1 text-green-600 hover:text-green-700" title="Save"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditing(null); setRenameErr(''); }} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    {renameErr && <p className="text-[11px] text-red-500">{renameErr}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">{loc.name}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditing({ type: 'location', id: loc.id, value: loc.name }); setRenameErr(''); }} className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleRemoveLocation(loc.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
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
            <Clock className="w-4 h-4 mr-1" /> Time Slots
          </h3>
          <ul className="divide-y divide-gray-100">
            {sortedTimeBlocks.length === 0 && <li className="text-xs text-gray-400 italic py-1">No time slots yet</li>}
            {sortedTimeBlocks.map(block => (
              <li key={block.id} className="py-1.5">
                {editing?.type === 'block' && editing.id === block.id ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        value={editing.value}
                        onChange={e => { setEditing({ ...editing, value: e.target.value }); setRenameErr(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
                      />
                      <button onClick={handleRename} disabled={renameSaving} className="p-1 text-green-600 hover:text-green-700" title="Save"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditing(null); setRenameErr(''); }} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    {renameErr && <p className="text-[11px] text-red-500">{renameErr}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{block.name}</p>
                      <p className="text-xs text-gray-400">{block.start_time} – {block.end_time}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditing({ type: 'block', id: block.id, value: block.name }); setRenameErr(''); }} className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleRemoveTimeBlock(block.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded" title="Remove time slot"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
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
              idleContent={<><Plus className="w-4 h-4" /> Add Time Slot</>}
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
              {sortedMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.user?.name || m.user_id}</option>)}
            </select>
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedLocation} onChange={e => { setSelectedLocation(e.target.value); setAssignErr(''); }}>
              <option value="">Select Location</option>
              {sortedLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select className="w-full px-3 py-2 border rounded-md text-sm" value={selectedBlock} onChange={e => { setSelectedBlock(e.target.value); setAssignErr(''); }}>
              <option value="">Select Time Block</option>
              {sortedTimeBlocks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.start_time}–{b.end_time})</option>)}
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
                      onDateChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
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
                    onDateChange(iso);
                    setDateErr('');
                    setAssignErr('');
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
        {memberActionErr && (
          <div className="mb-3">
            <InlineError message={memberActionErr} />
          </div>
        )}
        <div className="divide-y divide-gray-100 mb-4">
          {sortedMembers.map(member => {
            const isSelf = member.user_id === currentUserId;
            const isEditingMember = editing?.type === 'member' && editing.id === member.user_id;
            return (
              <div key={member.user_id} className="py-3">
                {isEditingMember ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        value={editing.value}
                        onChange={e => { setEditing({ ...editing, value: e.target.value }); setRenameErr(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
                      />
                      <button onClick={handleRename} disabled={renameSaving} className="p-1 text-green-600 hover:text-green-700" title="Save"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditing(null); setRenameErr(''); }} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    {renameErr && <p className="text-[11px] text-red-500">{renameErr}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {member.user?.name || 'Anonymous'}
                        {isSelf && <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500 uppercase">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {member.role === 'PARTICIPANT' && (
                        <button
                          onClick={() => handlePromote(member.user_id)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 rounded transition-colors"
                        >
                          Make Admin
                        </button>
                      )}
                      {member.role === 'ADMIN' && !isSelf && (
                        <button
                          onClick={() => handleDemote(member.user_id)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-700 rounded transition-colors"
                        >
                          Revoke Admin
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => { setEditing({ type: 'member', id: member.user_id, value: member.user?.name || '' }); setRenameErr(''); }}
                          className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.user?.name || 'this person')}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Remove from room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            placeholder="Add person by name…"
            value={newMemberName}
            onChange={e => { setNewMemberName(e.target.value); setMemberErr(''); setMemberSuccess(''); }}
          />
          <ActionButton state={memberBtn.state} idleContent={<Plus className="w-4 h-4" />} />
        </form>
        <p className="text-xs text-gray-400 mt-1.5">Creates an account if the person hasn't registered yet.</p>
        {memberSuccess && (
          <div className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <p className="text-xs text-green-700">{memberSuccess}</p>
          </div>
        )}
        {memberErr && (
          <div className="mt-2">
            <InlineError message={memberErr} />
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
        <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">Danger Zone</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Delete this room</p>
            <p className="text-xs text-gray-500 mt-0.5">Permanently removes all locations, time blocks, shifts, and members.</p>
          </div>
          <button
            onClick={handleDeleteRoom}
            disabled={deletingRoom}
            className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {deletingRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Room
          </button>
        </div>
        <InlineError message={deleteRoomErr} />
      </section>
    </div>
  );
}
