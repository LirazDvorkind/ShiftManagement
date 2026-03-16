export const TZ = 'Asia/Jerusalem';

/** Get Sunday of the week containing `date`, anchored to Israel time */
export function getWeekStart(date: Date): Date {
  const israelDateStr = date.toLocaleDateString('en-CA', { timeZone: TZ }); // "YYYY-MM-DD"
  const [year, month, day] = israelDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay(); // 0=Sun, 1=Mon ...
  d.setDate(d.getDate() - dow); // roll back to Sunday
  return d;
}

/** Return 7 date strings ("YYYY-MM-DD") starting from Sunday */
export function weekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
}

/** Today as "YYYY-MM-DD" in Israel time */
export function todayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Format "YYYY-MM-DD" to "DD/MM/YYYY" */
export function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Format Date to "DD/MM/YYYY" */
export function dateToDisplay(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/** Get a relative label for a week (e.g., "This week", "Next week", "2 weeks ago") */
export function getRelativeWeekLabel(weekStart: Date): string {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  
  // Calculate difference in weeks
  const diffTime = weekStart.getTime() - currentWeekStart.getTime();
  const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));

  if (diffWeeks === 0) return 'This week';
  if (diffWeeks === 1) return 'Next week';
  if (diffWeeks === -1) return 'Last week';
  if (diffWeeks > 0) return `In ${diffWeeks} weeks`;
  return `${Math.abs(diffWeeks)} weeks ago`;
}
