import { DateTime } from 'luxon';
import { Cadence } from '../types';
import { computeNextRunUtc } from './nextRun';

describe('computeNextRunUtc', () => {
  describe('input validation', () => {
    it('should throw error for invalid dayOfWeek', () => {
      expect(() =>
        computeNextRunUtc(Cadence.WEEKLY, 0, '09:00', 'America/New_York')
      ).toThrow('dayOfWeek must be between 1 (Monday) and 7 (Sunday)');

      expect(() =>
        computeNextRunUtc(Cadence.WEEKLY, 8, '09:00', 'America/New_York')
      ).toThrow('dayOfWeek must be between 1 (Monday) and 7 (Sunday)');
    });

    it('should throw error for invalid timeLocal format', () => {
      expect(() =>
        computeNextRunUtc(Cadence.WEEKLY, 1, '25:00', 'America/New_York')
      ).toThrow('timeLocal must be in HH:mm format');

      expect(() =>
        computeNextRunUtc(Cadence.WEEKLY, 1, '09:60', 'America/New_York')
      ).toThrow('timeLocal must be in HH:mm format');
    });
  });

  describe('WEEKLY cadence', () => {
    it('should return next Monday 9:00 AM when current time is before scheduled', () => {
      // Current: Monday 2024-01-15 at 08:00 AM EST
      // Scheduled: Monday at 09:00 AM
      const now = DateTime.fromISO('2024-01-15T08:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be today at 09:00 AM EST = 14:00 UTC
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-15 14:00:00');
      expect(nextRunDt.zoneName).toBe('UTC');
    });

    it('should return next week when current time is after scheduled', () => {
      // Current: Monday 2024-01-15 at 10:00 AM EST
      // Scheduled: Monday at 09:00 AM
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday at 09:00 AM EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-22 09:00:00');
      expect(nextRunLocal.weekday).toBe(1); // Monday
    });

    it('should return next Friday when current is Monday', () => {
      // Current: Monday 2024-01-15 at 10:00 AM EST
      // Scheduled: Friday at 17:00 (5 PM)
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 5, '17:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be Friday 2024-01-19 at 17:00 EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-19 17:00:00');
      expect(nextRunLocal.weekday).toBe(5); // Friday
    });

    it('should be strictly in the future', () => {
      // Current: Monday 2024-01-15 at 09:00:00.000 AM EST (exact scheduled time)
      const now = DateTime.fromISO('2024-01-15T09:00:00.000', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday, not this Monday
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-22 09:00:00');
    });
  });

  describe('BIWEEKLY cadence', () => {
    it('should return 2 weeks from scheduled day when in the past', () => {
      // Current: Monday 2024-01-15 at 10:00 AM EST
      // Scheduled: Monday at 09:00 AM (already passed today)
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.BIWEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be 2 weeks later: Monday 2024-01-29 at 09:00 AM EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-29 09:00:00');
      expect(nextRunLocal.weekday).toBe(1);
    });

    it('should return this week if scheduled time is in the future', () => {
      // Current: Monday 2024-01-15 at 08:00 AM EST
      // Scheduled: Friday at 17:00
      const now = DateTime.fromISO('2024-01-15T08:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.BIWEEKLY, 5, '17:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be this Friday 2024-01-19 at 17:00 EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-19 17:00:00');
      expect(nextRunLocal.weekday).toBe(5);
    });
  });

  describe('MONTHLY cadence', () => {
    it('should return 4 weeks from scheduled day when in the past', () => {
      // Current: Monday 2024-01-15 at 10:00 AM EST
      // Scheduled: Monday at 09:00 AM
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.MONTHLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be 4 weeks later: Monday 2024-02-12 at 09:00 AM EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-02-12 09:00:00');
      expect(nextRunLocal.weekday).toBe(1);
    });

    it('should return this week if scheduled time is in the future', () => {
      // Current: Monday 2024-01-15 at 08:00 AM EST
      // Scheduled: Wednesday at 14:00
      const now = DateTime.fromISO('2024-01-15T08:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.MONTHLY, 3, '14:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be this Wednesday 2024-01-17 at 14:00 EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-17 14:00:00');
      expect(nextRunLocal.weekday).toBe(3);
    });
  });

  describe('timezone handling', () => {
    it('should handle Europe/London timezone', () => {
      // Current: Tuesday 2024-01-16 at 10:00 GMT
      // Scheduled: Monday at 09:00 GMT
      const now = DateTime.fromISO('2024-01-16T10:00:00', {
        zone: 'Europe/London',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'Europe/London', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday 2024-01-22 at 09:00 GMT = 09:00 UTC
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-22 09:00:00');
    });

    it('should handle Asia/Tokyo timezone', () => {
      // Current: Monday 2024-01-15 at 10:00 JST
      // Scheduled: Monday at 09:00 JST
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'Asia/Tokyo',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'Asia/Tokyo', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday 2024-01-22 at 09:00 JST = 00:00 UTC
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-22 00:00:00');
    });

    it('should handle America/Los_Angeles timezone', () => {
      // Current: Friday 2024-01-19 at 18:00 PST
      // Scheduled: Monday at 09:00 PST
      const now = DateTime.fromISO('2024-01-19T18:00:00', {
        zone: 'America/Los_Angeles',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/Los_Angeles', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday 2024-01-22 at 09:00 PST = 17:00 UTC
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-22 17:00:00');
    });

    it('should handle Australia/Sydney timezone', () => {
      // Current: Monday 2024-01-15 at 10:00 AEDT (UTC+11)
      // Scheduled: Monday at 09:00 AEDT
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'Australia/Sydney',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'Australia/Sydney', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday 2024-01-22 at 09:00 AEDT = 22:00 UTC (prev day)
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-21 22:00:00');
    });
  });

  describe('DST boundaries', () => {
    it('should handle DST spring forward correctly', () => {
      // DST begins: Sunday, March 10, 2024 at 2:00 AM -> 3:00 AM EST -> EDT
      // Current: Saturday March 9, 2024 at 10:00 AM EST
      // Scheduled: Monday at 09:00
      const now = DateTime.fromISO('2024-03-09T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be Monday March 11, 2024 at 09:00 EDT (after DST transition)
      // 09:00 EDT = 13:00 UTC (EDT is UTC-4)
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-11 13:00:00');

      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-03-11 09:00:00');
    });

    it('should handle DST fall back correctly', () => {
      // DST ends: Sunday, November 3, 2024 at 2:00 AM -> 1:00 AM EDT -> EST
      // Current: Saturday November 2, 2024 at 10:00 AM EDT
      // Scheduled: Monday at 09:00
      const now = DateTime.fromISO('2024-11-02T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be Monday November 4, 2024 at 09:00 EST (after DST transition)
      // 09:00 EST = 14:00 UTC (EST is UTC-5)
      expect(nextRunDt.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-11-04 14:00:00');

      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-11-04 09:00:00');
    });
  });

  describe('edge cases', () => {
    it('should handle end of year transition', () => {
      // Current: Friday December 29, 2023 at 10:00 AM EST
      // Scheduled: Monday at 09:00
      const now = DateTime.fromISO('2023-12-29T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be Monday January 1, 2024 at 09:00 EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-01 09:00:00');
    });

    it('should handle Sunday (day 7) correctly', () => {
      // Current: Saturday 2024-01-20 at 10:00 AM EST
      // Scheduled: Sunday at 09:00
      const now = DateTime.fromISO('2024-01-20T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 7, '09:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be Sunday 2024-01-21 at 09:00 EST (tomorrow)
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-21 09:00:00');
      expect(nextRunLocal.weekday).toBe(7); // Sunday
    });

    it('should handle midnight (00:00)', () => {
      // Current: Monday 2024-01-15 at 10:00 AM EST
      // Scheduled: Monday at 00:00 (midnight)
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '00:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be next Monday 2024-01-22 at 00:00 EST
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-22 00:00:00');
    });

    it('should handle late evening (23:30)', () => {
      // Current: Monday 2024-01-15 at 10:00 AM EST
      // Scheduled: Monday at 23:30
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '23:30', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      // Should be today 2024-01-15 at 23:30 EST (later today)
      const nextRunLocal = nextRunDt.setZone('America/New_York');
      expect(nextRunLocal.toFormat('yyyy-MM-dd HH:mm:ss')).toBe('2024-01-15 23:30:00');
    });
  });

  describe('consistency checks', () => {
    it('should always return a time in the future', () => {
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const nextRun = computeNextRunUtc(Cadence.WEEKLY, 1, '10:00', 'America/New_York', now);
      const nextRunDt = DateTime.fromISO(nextRun, { zone: 'utc' });

      expect(nextRunDt > now.toUTC()).toBe(true);
    });

    it('should return consistent results for multiple calls', () => {
      const now = DateTime.fromISO('2024-01-15T10:00:00', {
        zone: 'America/New_York',
      });

      const run1 = computeNextRunUtc(Cadence.WEEKLY, 3, '14:00', 'America/New_York', now);
      const run2 = computeNextRunUtc(Cadence.WEEKLY, 3, '14:00', 'America/New_York', now);

      expect(run1).toBe(run2);
    });
  });
});
