import { DateTime } from 'luxon';
import { Cadence } from '../types';
import { getPreviousReportWindow } from './reportWindows';

describe('getPreviousReportWindow', () => {
  describe('WEEKLY cadence', () => {
    it('should return previous Mon-Sun week in America/New_York', () => {
      // Reference: Monday 2024-01-15 at 10:00 AM EST
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York', now);

      // Previous week: Mon 2024-01-08 00:00 to Sun 2024-01-14 23:59:59.999
      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-08 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-14 23:59:59');
      expect(startLocal.weekday).toBe(1); // Monday
      expect(endLocal.weekday).toBe(7); // Sunday
    });

    it('should return previous Mon-Sun week in Europe/London', () => {
      // Reference: Friday 2024-02-23 at 15:00 GMT
      const now = DateTime.fromISO('2024-02-23T15:00:00', {
        zone: 'Europe/London',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'Europe/London', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'Europe/London' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'Europe/London' });

      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-02-12 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-02-18 23:59:59');
      expect(startLocal.weekday).toBe(1); // Monday
      expect(endLocal.weekday).toBe(7); // Sunday
    });

    it('should return previous Mon-Sun week in Asia/Tokyo', () => {
      // Reference: Wednesday 2024-03-20 at 09:00 JST
      const now = DateTime.fromISO('2024-03-20T09:00:00', {
        zone: 'Asia/Tokyo',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'Asia/Tokyo', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'Asia/Tokyo' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'Asia/Tokyo' });

      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-11 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-17 23:59:59');
      expect(startLocal.weekday).toBe(1); // Monday
      expect(endLocal.weekday).toBe(7); // Sunday
    });

    it('should handle Sunday as reference (end of current week)', () => {
      // Reference: Sunday 2024-01-21 at 23:00
      const now = DateTime.fromISO('2024-01-21T23:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      expect(startLocal.toFormat('yyyy-MM-dd')).toBe('2024-01-08');
      expect(endLocal.toFormat('yyyy-MM-dd')).toBe('2024-01-14');
      expect(startLocal.weekday).toBe(1); // Monday
      expect(endLocal.weekday).toBe(7); // Sunday
    });
  });

  describe('BIWEEKLY cadence', () => {
    it('should return previous two Mon-Sun weeks', () => {
      // Reference: Monday 2024-01-15 at 10:00 AM EST
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.BIWEEKLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      // Previous two weeks: Mon 2024-01-01 00:00 to Sun 2024-01-14 23:59:59.999
      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-01 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-14 23:59:59');
      expect(startLocal.weekday).toBe(1); // Monday
      expect(endLocal.weekday).toBe(7); // Sunday

      // Verify it's exactly 2 weeks
      const daysDiff = endLocal.diff(startLocal, 'days').days;
      expect(Math.floor(daysDiff)).toBe(13); // 13 days = 2 weeks - 1 day
    });

    it('should return previous two Mon-Sun weeks in Europe/Paris', () => {
      const now = DateTime.fromISO('2024-02-20T14:00:00', {
        zone: 'Europe/Paris',
      });

      const window = getPreviousReportWindow(Cadence.BIWEEKLY, 'Europe/Paris', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'Europe/Paris' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'Europe/Paris' });

      expect(startLocal.toFormat('yyyy-MM-dd')).toBe('2024-02-05');
      expect(endLocal.toFormat('yyyy-MM-dd')).toBe('2024-02-18');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);
    });
  });

  describe('MONTHLY cadence', () => {
    it('should return previous four Mon-Sun weeks', () => {
      // Reference: Monday 2024-02-05 at 10:00 AM EST
      const now = DateTime.fromISO('2024-02-05T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.MONTHLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      // Previous four weeks: Mon 2024-01-08 00:00 to Sun 2024-02-04 23:59:59.999
      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-08 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-02-04 23:59:59');
      expect(startLocal.weekday).toBe(1); // Monday
      expect(endLocal.weekday).toBe(7); // Sunday

      // Verify it's exactly 4 weeks
      const daysDiff = endLocal.diff(startLocal, 'days').days;
      expect(Math.floor(daysDiff)).toBe(27); // 27 days = 4 weeks - 1 day
    });

    it('should return previous four Mon-Sun weeks in Australia/Sydney', () => {
      const now = DateTime.fromISO('2024-03-18T10:00:00', {
        zone: 'Australia/Sydney',
      });

      const window = getPreviousReportWindow(Cadence.MONTHLY, 'Australia/Sydney', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'Australia/Sydney' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'Australia/Sydney' });

      expect(startLocal.toFormat('yyyy-MM-dd')).toBe('2024-02-19');
      expect(endLocal.toFormat('yyyy-MM-dd')).toBe('2024-03-17');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);
    });
  });

  describe('DST boundaries', () => {
    it('should handle DST spring forward in America/New_York (March 2024)', () => {
      // DST begins: Sunday, March 10, 2024 at 2:00 AM -> 3:00 AM
      // Reference: Monday March 18, 2024
      const now = DateTime.fromISO('2024-03-18T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      // Previous week: Mon 2024-03-11 00:00 to Sun 2024-03-17 23:59:59.999
      // This week includes the DST transition
      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-11 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-17 23:59:59');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);

      // Verify UTC conversion is correct
      const startUtc = DateTime.fromISO(window.startUtc, { zone: 'utc' });
      const endUtc = DateTime.fromISO(window.endUtc, { zone: 'utc' });

      // DST started March 10 at 2:00 AM, so March 11 00:00 is already EDT (UTC-4)
      expect(startUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-11 04:00:00');
      // End is also EDT (UTC-4)
      expect(endUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-18 03:59:59');
    });

    it('should handle DST fall back in America/New_York (November 2024)', () => {
      // DST ends: Sunday, November 3, 2024 at 2:00 AM -> 1:00 AM
      // Reference: Monday November 11, 2024
      const now = DateTime.fromISO('2024-11-11T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      // Previous week: Mon 2024-11-04 00:00 to Sun 2024-11-10 23:59:59.999
      // This week is after the DST transition
      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-11-04 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-11-10 23:59:59');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);

      // Verify UTC conversion is correct (both are EST = UTC-5 after DST end)
      const startUtc = DateTime.fromISO(window.startUtc, { zone: 'utc' });
      const endUtc = DateTime.fromISO(window.endUtc, { zone: 'utc' });

      expect(startUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-11-04 05:00:00');
      expect(endUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-11-11 04:59:59');
    });

    it('should handle DST in Europe/London (March 2024)', () => {
      // BST begins: Sunday, March 31, 2024 at 1:00 AM -> 2:00 AM
      // Reference: Monday April 8, 2024
      const now = DateTime.fromISO('2024-04-08T10:00:00', {
        zone: 'Europe/London',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'Europe/London', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'Europe/London' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'Europe/London' });

      // Previous week: Mon 2024-04-01 00:00 to Sun 2024-04-07 23:59:59.999
      expect(startLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-04-01 00:00:00');
      expect(endLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-04-07 23:59:59');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);
    });
  });

  describe('UTC conversion', () => {
    it('should provide correct UTC times for America/Los_Angeles', () => {
      // Reference: Monday 2024-01-15 at 10:00 AM PST (UTC-8)
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/Los_Angeles',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/Los_Angeles', now);

      // Local: Mon 2024-01-08 00:00 PST to Sun 2024-01-14 23:59:59.999 PST
      // UTC: Mon 2024-01-08 08:00 UTC to Mon 2024-01-15 07:59:59.999 UTC
      const startUtc = DateTime.fromISO(window.startUtc, { zone: 'utc' });
      const endUtc = DateTime.fromISO(window.endUtc, { zone: 'utc' });

      expect(startUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-08 08:00:00');
      expect(endUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-15 07:59:59');
    });

    it('should provide correct UTC times for Asia/Kolkata (no DST)', () => {
      // Reference: Monday 2024-01-15 at 10:00 AM IST (UTC+5:30)
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'Asia/Kolkata',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'Asia/Kolkata', now);

      // Local: Mon 2024-01-08 00:00 IST to Sun 2024-01-14 23:59:59.999 IST
      // UTC: Sun 2024-01-07 18:30 UTC to Sun 2024-01-14 18:29:59.999 UTC
      const startUtc = DateTime.fromISO(window.startUtc, { zone: 'utc' });
      const endUtc = DateTime.fromISO(window.endUtc, { zone: 'utc' });

      expect(startUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-07 18:30:00');
      expect(endUtc.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-14 18:29:59');
    });
  });

  describe('edge cases', () => {
    it('should handle year boundary', () => {
      // Reference: Monday 2024-01-08 (first full week of 2024)
      const now = DateTime.fromISO('2024-01-08T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      // Previous week spans year boundary: Mon 2024-01-01 to Sun 2024-01-07
      expect(startLocal.toFormat('yyyy-MM-dd')).toBe('2024-01-01');
      expect(endLocal.toFormat('yyyy-MM-dd')).toBe('2024-01-07');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);
    });

    it('should handle leap year (February 2024)', () => {
      // 2024 is a leap year
      // Reference: Monday 2024-03-04
      const now = DateTime.fromISO('2024-03-04T10:00:00', {
        zone: 'America/New_York',
      });

      const window = getPreviousReportWindow(Cadence.MONTHLY, 'America/New_York', now);

      const startLocal = DateTime.fromISO(window.startLocal, { zone: 'America/New_York' });
      const endLocal = DateTime.fromISO(window.endLocal, { zone: 'America/New_York' });

      // Previous four weeks: Mon 2024-02-05 to Sun 2024-03-03
      expect(startLocal.toFormat('yyyy-MM-dd')).toBe('2024-02-05');
      expect(endLocal.toFormat('yyyy-MM-dd')).toBe('2024-03-03');
      expect(startLocal.weekday).toBe(1);
      expect(endLocal.weekday).toBe(7);
    });
  });
});
