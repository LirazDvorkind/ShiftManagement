/**
 * @file components/ScheduleView.tsx
 * @description Weekly calendar displaying shift assignments grouped by day and time block.
 */

'use client';

import { useState } from 'react';
import { FullSchedule, ShiftAssignment, RoomMember } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';

// 10 distinct user colors (bg, text, dot)
const USER_COLOR_CLASSES = [
  { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  { bg: 'bg-emerald-100',text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-100', text: 'text-violet-800',  dot: 'bg-violet-500'  },
  { bg: 'bg-orange-100', text: 'text-orange-800',  dot: 'bg-orange-500'  },
  { bg: 'bg-rose-100',   text: 'text-rose-800',    dot: 'bg-rose-500'    },
  { bg: 'bg-teal-100',   text: 'text-teal-800',    dot: 'bg-teal-500'    },
  { bg: 'bg-amber-100',  text: 'text-amber-800',   dot: 'bg-amber-500'   },
  { bg: 'bg-pink-100',   text: 'text-pink-800',    dot: 'bg-pink-500'    },
  { bg: 'bg-cyan-100',   text: 'text-cyan-800',    dot: 'bg-cyan-500'    },
  { bg: 'bg-lime-100',   text: 'text-lime-800',    dot: 'bg-lime-500'    },
];

function getUserColor(index: number) {
  return USER_COLOR_CLASSES[index % USER_COLOR_CLASSES.length];
}

/** Format "YYYY-MM-DD" to "Mon, Mar 10" */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Format "YYYY-MM-DD" to "Monday" (full weekday) */
function weekdayName(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/** Get Monday of the week containing `date` */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return 7 date strings ("YYYY-MM-DD") starting from Monday */
function weekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

/** Format week range as "Mar 10 – 16, 2026" */
function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

/** Today as "YYYY-MM-DD" */
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

interface ScheduleViewProps {
  roomId: string;
  schedule: FullSchedule;
  members: RoomMember[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export default function ScheduleView({ roomId, schedule, members, isAdmin, onRefresh }: ScheduleViewProps) {
  const { locations, time_blocks, assignments } = schedule;

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Build userId → color index map (stable, based on member order)
  const userColorMap = new Map<string, number>();
  members.forEach((m, i) => userColorMap.set(m.user_id, i));

  const dates = weekDates(weekStart);
  const today = todayStr();

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => setWeekStart(getWeekStart(new Date()));

  const handleRemove = async (assignment: ShiftAssignment) => {
    setRemovingId(assignment.id);
    try {
      await api.removeAssignment(roomId, assignment.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove shift');
    } finally {
      setRemovingId(null);
    }
  };

  if (locations.length === 0 || time_blocks.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">No shifts configured yet.</p>
        <p className="text-gray-400 text-sm mt-1">Add locations and time blocks in Admin Controls below.</p>
      </div>
    );
  }

  // Check if any assignments exist in this week
  const weekAssignments = assignments.filter(a => dates.includes(a.date));
  const hasAnyThisWeek = weekAssignments.length > 0;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-gray-800">
            {formatWeekRange(weekStart)}
          </span>
        </div>
        <button
          onClick={goToday}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const isToday = date === today;
          const dayAssignments = assignments.filter(a => a.date === date);

          return (
            <div
              key={date}
              className={`rounded-xl border p-3 min-h-[160px] ${
                isToday ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Day header */}
              <div className="mb-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {weekdayName(date).slice(0, 3)}
                </p>
                <p className={`text-lg font-bold leading-none ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {date.split('-')[2]}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short' })}
                </p>
              </div>

              {/* Assignments grouped by time block */}
              {dayAssignments.length === 0 ? (
                <p className="text-xs text-gray-300 italic">—</p>
              ) : (
                <div className="space-y-2">
                  {time_blocks.map(block => {
                    const blockAssignments = dayAssignments.filter(a => a.time_block_id === block.id);
                    if (blockAssignments.length === 0) return null;

                    return (
                      <div key={block.id}>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                          {block.name}
                          <span className="font-normal normal-case ml-1 text-gray-300">
                            {block.start_time}–{block.end_time}
                          </span>
                        </p>
                        <div className="space-y-1">
                          {blockAssignments.map(assignment => {
                            const colorIdx = userColorMap.get(assignment.user_id) ?? 0;
                            const color = getUserColor(colorIdx);
                            const isRemoving = removingId === assignment.id;

                            return (
                              <div
                                key={assignment.id}
                                className={`flex items-start justify-between gap-1 px-2 py-1 rounded-md text-xs ${color.bg} ${color.text} group`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                                    <span className="font-medium truncate">
                                      {assignment.user?.name || '—'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] opacity-70 pl-2.5 truncate">
                                    {assignment.location?.name || '—'}
                                  </div>
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleRemove(assignment)}
                                    disabled={isRemoving}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-current hover:text-red-600 disabled:opacity-50 p-0.5 rounded"
                                    title="Remove shift"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state for this week */}
      {!hasAnyThisWeek && (
        <p className="text-center text-sm text-gray-400 py-2">No shifts scheduled this week.</p>
      )}

      {/* Legend */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {members.map((member, i) => {
            const color = getUserColor(i);
            return (
              <div key={member.user_id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
                <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                {member.user?.name || member.user_id}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
