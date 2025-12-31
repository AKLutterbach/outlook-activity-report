import { DateTime } from 'luxon';
import { Cadence, ReportWindow } from '../types';

/**
 * Get the previous report window based on cadence
 * 
 * All windows are Mon-Sun blocks in the specified timezone:
 * - WEEKLY: previous full Mon-Sun week
 * - BIWEEKLY: previous two full Mon-Sun weeks
 * - MONTHLY: previous four full Mon-Sun weeks
 * 
 * @param cadence - Report cadence
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param now - Current time (defaults to now)
 * @returns ReportWindow with start/end in both local and UTC
 * 
 * @example
 * ```typescript
 * // On 2024-01-15 (Monday), get previous week
 * const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York');
 * // Returns: 2024-01-08 00:00 to 2024-01-14 23:59:59.999
 * ```
 */
export function getPreviousReportWindow(
  cadence: Cadence,
  timezone: string,
  now: DateTime = DateTime.now()
): ReportWindow {
  // Convert now to the specified timezone
  const nowInZone = now.setZone(timezone);

  // Get the start of the current week (Monday at 00:00)
  const currentWeekStart = nowInZone.startOf('week');

  // Calculate how many weeks back based on cadence
  let weeksBack: number;
  switch (cadence) {
    case Cadence.WEEKLY:
      weeksBack = 1;
      break;
    case Cadence.BIWEEKLY:
      weeksBack = 2;
      break;
    case Cadence.MONTHLY:
      weeksBack = 4;
      break;
  }

  // Calculate the start of the report window (Monday 00:00)
  const startLocal = currentWeekStart.minus({ weeks: weeksBack });

  // Calculate the end of the report window (Sunday 23:59:59.999)
  const endLocal = currentWeekStart
    .minus({ weeks: 1 })
    .endOf('week')
    .set({ millisecond: 999 });

  return {
    startLocal: startLocal.toISO()!,
    endLocal: endLocal.toISO()!,
    startUtc: startLocal.toUTC().toISO()!,
    endUtc: endLocal.toUTC().toISO()!,
  };
}
