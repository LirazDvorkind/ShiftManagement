/**
 * @file components/ScheduleView.tsx
 * @description Weekly calendar displaying shift assignments grouped by day and time block.
 */

'use client';

import { useState, useRef } from 'react';
import { FullSchedule, ShiftAssignment, RoomMember } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, AlertCircle, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { TZ, weekDates, todayStr, dateToDisplay, getWeekStart, getRelativeWeekLabel } from '@/lib/dateUtils';

// 10 distinct user colors (bg, text, dot, hex equivalents for the export div)
const USER_COLOR_CLASSES = [
  { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500',   hexBg: '#dbeafe', hexText: '#1e40af', hexDot: '#3b82f6' },
  { bg: 'bg-emerald-100',text: 'text-emerald-800', dot: 'bg-emerald-500', hexBg: '#d1fae5', hexText: '#065f46', hexDot: '#10b981' },
  { bg: 'bg-violet-100', text: 'text-violet-800',  dot: 'bg-violet-500',  hexBg: '#ede9fe', hexText: '#4c1d95', hexDot: '#8b5cf6' },
  { bg: 'bg-orange-100', text: 'text-orange-800',  dot: 'bg-orange-500',  hexBg: '#ffedd5', hexText: '#9a3412', hexDot: '#f97316' },
  { bg: 'bg-rose-100',   text: 'text-rose-800',    dot: 'bg-rose-500',    hexBg: '#ffe4e6', hexText: '#9f1239', hexDot: '#f43f5e' },
  { bg: 'bg-teal-100',   text: 'text-teal-800',    dot: 'bg-teal-500',    hexBg: '#ccfbf1', hexText: '#134e4a', hexDot: '#14b8a6' },
  { bg: 'bg-amber-100',  text: 'text-amber-800',   dot: 'bg-amber-500',   hexBg: '#fef3c7', hexText: '#92400e', hexDot: '#f59e0b' },
  { bg: 'bg-pink-100',   text: 'text-pink-800',    dot: 'bg-pink-500',    hexBg: '#fce7f3', hexText: '#9d174d', hexDot: '#ec4899' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-800',    dot: 'bg-cyan-500',    hexBg: '#cffafe', hexText: '#164e63', hexDot: '#06b6d4' },
  { bg: 'bg-lime-100',   text: 'text-lime-800',    dot: 'bg-lime-500',    hexBg: '#ecfccb', hexText: '#3f6212', hexDot: '#84cc16' },
];

function getUserColor(index: number) {
  return USER_COLOR_CLASSES[index % USER_COLOR_CLASSES.length];
}

/** Shared pill used by both the visible grid and the export div.
 *  Inline styles ensure html2canvas renders it identically to the browser. */
function AssignmentPill({ name, location, hexBg, hexText, hexDot }: {
  name: string;
  location: string;
  hexBg: string;
  hexText: string;
  hexDot: string;
}) {
  return (
    <div style={{ backgroundColor: hexBg, color: hexText, borderRadius: '6px', padding: '4px 6px', fontSize: '10px', lineHeight: '1.4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: hexDot, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }} />
        <span style={{ fontWeight: 600, lineHeight: '1.4' }}>{name}</span>
      </div>
      <div style={{ paddingLeft: '10px', opacity: 0.7, fontSize: '9px', lineHeight: '1.4' }}>{location}</div>
    </div>
  );
}

/** Format "YYYY-MM-DD" to "Mon, Mar 10" in Israel time */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IL', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ });
}

/** Format "YYYY-MM-DD" to "Monday" in Israel time */
function weekdayName(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IL', { weekday: 'long', timeZone: TZ });
}

/** Format week range as "Descriptive Label (DD/MM/YYYY – DD/MM/YYYY)" */
function formatWeekRange(weekStart: Date): React.ReactNode {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const relative = getRelativeWeekLabel(weekStart);
  return (
    <span>
      {relative} <span className="text-gray-400 font-normal ml-1">({dateToDisplay(weekStart)} – {dateToDisplay(end)})</span>
    </span>
  );
}

/** Plain-text version of the week range for the export header */
function formatWeekRangeText(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${getRelativeWeekLabel(weekStart)}  (${dateToDisplay(weekStart)} – ${dateToDisplay(end)})`;
}

interface ScheduleViewProps {
  roomId: string;
  schedule: FullSchedule;
  members: RoomMember[];
  isAdmin: boolean;
  onRefresh: () => void;
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

export default function ScheduleView({ roomId, schedule, members, isAdmin, onRefresh, weekStart, onWeekChange }: ScheduleViewProps) {
  const { locations, time_blocks, assignments } = schedule;

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Ref for the hidden export-only div
  const exportRef = useRef<HTMLDivElement>(null);

  // Build userId → color index map (stable, based on member order)
  const userColorMap = new Map<string, number>();
  members.forEach((m, i) => userColorMap.set(m.user_id, i));

  const dates = weekDates(weekStart);
  const today = todayStr();

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    onWeekChange(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    onWeekChange(d);
  };

  const goToday = () => onWeekChange(getWeekStart(new Date()));

  const handleRemove = async (assignment: ShiftAssignment) => {
    setRemovingId(assignment.id);
    setRemoveError('');
    try {
      await api.removeAssignment(roomId, assignment.id);
      onRefresh();
    } catch (err: any) {
      setRemoveError(err.message || 'Failed to remove shift. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportImage = async () => {
    if (!exportRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(exportRef.current, {
        background: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to create image'))), 'image/png')
      );

      const fileName = `schedule-${dates[0]}-to-${dates[6]}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Mobile: use Web Share API with files (Android Chrome 89+, iOS Safari 15+)
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Shift schedule' });
        } catch (err: any) {
          // User dismissed the share sheet — not an error
          if (err?.name !== 'AbortError') throw err;
        }
      } else {
        // Desktop: trigger file download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm sm:text-base font-semibold text-gray-800 truncate">
            {formatWeekRange(weekStart)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleExportImage}
            disabled={exporting}
            title="Save week as image"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{exporting ? 'Saving…' : 'Save image'}</span>
          </button>
        </div>
      </div>

      {/* Remove error */}
      {removeError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{removeError}</p>
          <button onClick={() => setRemoveError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {dates.map((date) => {
          const isToday = date === today;
          const dayAssignments = assignments.filter(a => a.date === date);

          return (
            <div
              key={date}
              className={`rounded-xl border p-3 md:min-h-[160px] ${
                isToday ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Day header — horizontal on mobile, vertical on desktop */}
              <div className="mb-2">
                {/* Mobile */}
                <div className="flex items-center gap-2 md:hidden">
                  <span className={`text-sm font-bold ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {weekdayName(date)}
                  </span>
                  <span className={`text-xs ${isToday ? 'text-indigo-500' : 'text-gray-400'}`}>
                    {`${date.split('-')[2]}/${date.split('-')[1]}`}
                  </span>
                  {isToday && (
                    <span className="ml-auto text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
                {/* Desktop */}
                <div className="hidden md:block">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {weekdayName(date).slice(0, 3)}
                  </p>
                  <p className={`text-lg font-bold leading-none ${isToday ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {date.split('-')[2]}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(date.replace(/-/g, '/')).toLocaleDateString('en-IL', { month: 'short', timeZone: TZ })}
                  </p>
                </div>
              </div>

              {/* Assignments grouped by time block */}
              {dayAssignments.length === 0 ? (
                <p className="hidden md:block text-xs text-gray-300 italic">—</p>
              ) : (
                <div className="space-y-2">
                  {time_blocks.map(block => {
                    const blockAssignments = dayAssignments.filter(a => a.time_block_id === block.id);
                    if (blockAssignments.length === 0) return null;

                    return (
                      <div key={block.id}>
                        <p className="text-xs md:text-[10px] font-semibold text-gray-500 md:text-gray-400 uppercase tracking-wide mb-1.5 md:mb-1">
                          {block.name}
                          <span className="font-normal normal-case ml-1 text-gray-400 md:text-gray-300">
                            {block.start_time}–{block.end_time}
                          </span>
                        </p>
                        <div className="space-y-1.5 md:space-y-1">
                          {blockAssignments.map(assignment => {
                            const colorIdx = userColorMap.get(assignment.user_id) ?? 0;
                            const color = getUserColor(colorIdx);
                            const isRemoving = removingId === assignment.id;

                            return (
                              <div key={assignment.id} className="relative group">
                                <AssignmentPill
                                  name={assignment.user?.name || '—'}
                                  location={assignment.location?.name || '—'}
                                  hexBg={color.hexBg}
                                  hexText={color.hexText}
                                  hexDot={color.hexDot}
                                />
                                {isAdmin && (
                                  <button
                                    onClick={() => handleRemove(assignment)}
                                    disabled={isRemoving}
                                    className="absolute top-0.5 right-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:text-red-600 disabled:opacity-50 p-0.5 rounded"
                                    style={{ color: color.hexText }}
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

      {/*
        Hidden export-only div — positioned fixed off-screen so it:
        - Is always laid out at full desktop width (html2canvas requires a laid-out element)
        - Never causes scrollbars (fixed elements don't contribute to scroll dimensions)
        - Is never interactive (pointer-events: none)
        - Is invisible and inaccessible to screen readers (aria-hidden)
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
          width: '1120px',
        }}
      >
        <div ref={exportRef} style={{ backgroundColor: '#ffffff', padding: '32px', fontFamily: 'system-ui, sans-serif' }}>
          {/* Export header */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Shift Schedule
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>
              {formatWeekRangeText(weekStart)}
            </p>
          </div>

          {/* 7-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {dates.map((date) => {
              const isToday = date === today;
              const dayAssignments = assignments.filter(a => a.date === date);

              return (
                <div
                  key={date}
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${isToday ? '#a5b4fc' : '#e5e7eb'}`,
                    backgroundColor: isToday ? '#eef2ff' : '#ffffff',
                    padding: '12px',
                    minHeight: '160px',
                  }}
                >
                  {/* Day header */}
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isToday ? '#4f46e5' : '#9ca3af', margin: 0 }}>
                      {weekdayName(date).slice(0, 3)}
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1, color: isToday ? '#4338ca' : '#1f2937', margin: '2px 0 0' }}>
                      {date.split('-')[2]}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
                      {new Date(date.replace(/-/g, '/')).toLocaleDateString('en-IL', { month: 'short', timeZone: TZ })}
                    </p>
                  </div>

                  {/* Assignments */}
                  {dayAssignments.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#d1d5db', fontStyle: 'italic' }}>—</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {time_blocks.map(block => {
                        const blockAssignments = dayAssignments.filter(a => a.time_block_id === block.id);
                        if (blockAssignments.length === 0) return null;

                        return (
                          <div key={block.id}>
                            <p style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', margin: '0 0 4px' }}>
                              {block.name}{' '}
                              <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af' }}>
                                {block.start_time}–{block.end_time}
                              </span>
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {blockAssignments.map(assignment => {
                                const colorIdx = userColorMap.get(assignment.user_id) ?? 0;
                                const color = getUserColor(colorIdx);
                                return (
                                  <AssignmentPill
                                    key={assignment.id}
                                    name={assignment.user?.name || '—'}
                                    location={assignment.location?.name || '—'}
                                    hexBg={color.hexBg}
                                    hexText={color.hexText}
                                    hexDot={color.hexDot}
                                  />
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

          {/* Legend */}
          {members.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
              {members.map((member, i) => {
                const color = getUserColor(i);
                return (
                  <div
                    key={member.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      backgroundColor: color.hexBg,
                      color: color.hexText,
                      fontSize: '11px',
                      fontWeight: 500,
                      lineHeight: '1.4',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color.hexDot, display: 'inline-block', verticalAlign: 'middle' }} />
                    {member.user?.name || member.user_id}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
