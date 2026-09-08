export const MS_PER_DAY = 86400000;

/** Local calendar day key, e.g. 2026-09-06. Used for streaks and daily sets. */
export function dayKey(date: Date | number = Date.now()): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function startOfDay(date: Date | number = Date.now()): number {
  const d = typeof date === 'number' ? new Date(date) : new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(timestamp: number, days: number): number {
  return timestamp + days * MS_PER_DAY;
}

/** Whole calendar days between two timestamps (b - a). */
export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY);
}

export function isSameDay(a: number, b: number): boolean {
  return dayKey(a) === dayKey(b);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
}

export type GreetingKey = 'morning' | 'afternoon' | 'evening' | 'night';

export function greetingKey(date: Date = new Date()): GreetingKey {
  const h = date.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
