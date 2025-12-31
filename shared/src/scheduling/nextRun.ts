import { DateTime } from 'luxon';
import { Cadence } from '../types';

/**
 * Compute the next scheduled run time in UTC
 * 
 * The next run is always strictly in the future from the reference time.
 * 
 * @param cadence - Report cadence
 * @param dayOfWeek - Day of week (1=Monday, 7=Sunday) per ISO 8601
 * @param timeLocal - Time in HH:mm format (24-hour, e.g., "09:30")
 * @param timezone - IANA timezone string
 * @param now - Reference time (defaults to now)
 * @returns ISO 8601 UTC string of next scheduled run
 * 
 * @example
 * ```typescript
 * // Schedule for every Monday at 9:00 AM EST
 * const nextRun = computeNextRunUtc(
 *   Cadence.WEEKLY,
 *   1,
 *   "09:00",
 *   "America/New_York"
 * );
 * ```
 */
export function computeNextRunUtc(
  cadence: Cadence,
  dayOfWeek: number,
  timeLocal: string,
  timezone: string,
  now: DateTime = DateTime.now()
): string {
  // Validate inputs
  if (dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error('dayOfWeek must be between 1 (Monday) and 7 (Sunday)');
  }

  // Parse time (H:mm or HH:mm format)
  const parts = timeLocal.split(':');
  if (parts.length !== 2) {
    throw new Error('timeLocal must be in HH:mm format (e.g., "09:30")');
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error('timeLocal must be in HH:mm format (e.g., "09:30")');
  }

  // Convert now to the specified timezone
  const nowInZone = now.setZone(timezone);

  // Create a candidate time for this week
  let candidate = nowInZone.set({
    weekday: dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });

  // If the candidate is in the past or now, advance by cadence
  if (candidate <= nowInZone) {
    switch (cadence) {
      case Cadence.WEEKLY:
        candidate = candidate.plus({ weeks: 1 });
        break;
      case Cadence.BIWEEKLY:
        candidate = candidate.plus({ weeks: 2 });
        break;
      case Cadence.MONTHLY:
        candidate = candidate.plus({ weeks: 4 });
        break;
    }
  }

  // Ensure the result is strictly in the future
  while (candidate <= nowInZone) {
    switch (cadence) {
      case Cadence.WEEKLY:
        candidate = candidate.plus({ weeks: 1 });
        break;
      case Cadence.BIWEEKLY:
        candidate = candidate.plus({ weeks: 2 });
        break;
      case Cadence.MONTHLY:
        candidate = candidate.plus({ weeks: 4 });
        break;
    }
  }

  return candidate.toUTC().toISO()!;
}
