export type Schedule = { launch: string; order: string[]; fallback: string; fixture?: boolean };
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
}
export function dayIndex(date: string, launch: string): number {
  return Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse(launch+'T00:00:00Z'))/86400000);
}
export function selectDay(schedule: Schedule, requested: string | null, now = new Date()) {
  const today = localDate(now);
  const index = requested && validDate(requested) && requested <= today ? dayIndex(requested,schedule.launch) : -1;
  const date = index >= 0 && index < schedule.order.length ? requested! : today;
  const id = schedule.order[dayIndex(date,schedule.launch)] || schedule.fallback;
  return { date, id, archived: date !== today, fallback: !schedule.order[dayIndex(date,schedule.launch)] };
}
export function untilMidnight(now = new Date()): number {
  return new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime()-now.getTime();
}
