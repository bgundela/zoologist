import { fallbackRotation, type Schedule } from '../src/lib/today';

export const futureDays = 14;

export function backfillElapsedDays(schedule: Schedule, current: number): string[] {
  const order = [...schedule.order];
  const rotation = fallbackRotation(schedule);
  while (order.length < current) order.push(rotation[order.length % rotation.length]);
  return order;
}
