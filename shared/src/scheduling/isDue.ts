import { DateTime } from 'luxon';

/**
 * Check if a scheduled run is due
 * 
 * A run is considered due if the current time is within the window:
 * [nextRunUtc - windowBeforeMinutes, nextRunUtc + windowAfterMinutes]
 * 
 * @param nextRunUtc - Scheduled run time in ISO 8601 UTC format
 * @param nowUtc - Current time (defaults to now in UTC)
 * @param windowBeforeMinutes - Minutes before scheduled time (default: 2)
 * @param windowAfterMinutes - Minutes after scheduled time (default: 5)
 * @returns true if the run is due
 * 
 * @example
 * ```typescript
 * const scheduled = "2024-01-15T14:00:00.000Z";
 * const now = "2024-01-15T14:02:00.000Z";
 * const due = isDue(scheduled, now); // true
 * ```
 */
export function isDue(
  nextRunUtc: string,
  nowUtc: DateTime = DateTime.now().toUTC(),
  windowBeforeMinutes: number = 2,
  windowAfterMinutes: number = 5
): boolean {
  const scheduledTime = DateTime.fromISO(nextRunUtc, { zone: 'utc' });

  if (!scheduledTime.isValid) {
    throw new Error(`Invalid nextRunUtc: ${nextRunUtc}`);
  }

  const windowStart = scheduledTime.minus({ minutes: windowBeforeMinutes });
  const windowEnd = scheduledTime.plus({ minutes: windowAfterMinutes });

  return nowUtc >= windowStart && nowUtc <= windowEnd;
}
