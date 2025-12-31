import { DateTime } from 'luxon';
import { isDue } from './isDue';

describe('isDue', () => {
  describe('basic functionality', () => {
    it('should return true when current time is exactly at scheduled time', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:00:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(true);
    });

    it('should return true when current time is within default window (2 min before)', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T13:59:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(true);
    });

    it('should return true when current time is within default window (5 min after)', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:04:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(true);
    });

    it('should return false when current time is before the window', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T13:57:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(false);
    });

    it('should return false when current time is after the window', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:06:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(false);
    });
  });

  describe('custom window sizes', () => {
    it('should respect custom windowBeforeMinutes', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T13:55:00.000Z', { zone: 'utc' });

      // Default (2 min before) would be false
      expect(isDue(scheduled, now, 2, 5)).toBe(false);

      // With 5 min before, should be true
      expect(isDue(scheduled, now, 5, 5)).toBe(true);
    });

    it('should respect custom windowAfterMinutes', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:08:00.000Z', { zone: 'utc' });

      // Default (5 min after) would be false
      expect(isDue(scheduled, now, 2, 5)).toBe(false);

      // With 10 min after, should be true
      expect(isDue(scheduled, now, 2, 10)).toBe(true);
    });

    it('should handle zero window sizes', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const exactly = DateTime.fromISO('2024-01-15T14:00:00.000Z', { zone: 'utc' });
      const before = DateTime.fromISO('2024-01-15T13:59:59.000Z', { zone: 'utc' });
      const after = DateTime.fromISO('2024-01-15T14:00:01.000Z', { zone: 'utc' });

      expect(isDue(scheduled, exactly, 0, 0)).toBe(true);
      expect(isDue(scheduled, before, 0, 0)).toBe(false);
      expect(isDue(scheduled, after, 0, 0)).toBe(false);
    });

    it('should handle large window sizes', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T13:00:00.000Z', { zone: 'utc' });

      // 60 minutes before
      expect(isDue(scheduled, now, 60, 60)).toBe(true);

      const future = DateTime.fromISO('2024-01-15T15:00:00.000Z', { zone: 'utc' });
      // 60 minutes after
      expect(isDue(scheduled, future, 60, 60)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle scheduled time at window boundary (before)', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T13:58:00.000Z', { zone: 'utc' });

      // Exactly at 2 min before
      expect(isDue(scheduled, now, 2, 5)).toBe(true);
    });

    it('should handle scheduled time at window boundary (after)', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:05:00.000Z', { zone: 'utc' });

      // Exactly at 5 min after
      expect(isDue(scheduled, now, 2, 5)).toBe(true);
    });

    it('should handle milliseconds precision', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:00:00.500Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(true);
    });

    it('should throw error for invalid nextRunUtc format', () => {
      const now = DateTime.fromISO('2024-01-15T14:00:00.000Z', { zone: 'utc' });

      expect(() => isDue('invalid-date', now)).toThrow('Invalid nextRunUtc');
      expect(() => isDue('2024-13-45T99:99:99.000Z', now)).toThrow('Invalid nextRunUtc');
    });
  });

  describe('timezone handling', () => {
    it('should work correctly when nextRunUtc is in UTC format', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:02:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(true);
    });

    it('should work with ISO string without Z suffix', () => {
      const scheduled = '2024-01-15T14:00:00.000';
      const now = DateTime.fromISO('2024-01-15T14:02:00.000Z', { zone: 'utc' });

      expect(isDue(scheduled, now)).toBe(true);
    });

    it('should handle now parameter from different timezone conversion', () => {
      // Create "now" in EST, convert to UTC
      const nowEst = DateTime.fromISO('2024-01-15T09:00:00', {
        zone: 'America/New_York',
      });
      const nowUtc = nowEst.toUTC();

      // Scheduled for 14:00 UTC (same as 09:00 EST on this date)
      const scheduled = '2024-01-15T14:00:00.000Z';

      expect(isDue(scheduled, nowUtc)).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should detect due run for 5-minute scheduler window', () => {
      // Scheduler runs every 5 minutes with 2-min before, 5-min after tolerance
      const scheduled = '2024-01-15T14:00:00.000Z';

      // Scheduler run at 13:58 - should catch it
      const run1 = DateTime.fromISO('2024-01-15T13:58:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, run1)).toBe(true);

      // Scheduler run at 14:03 - should catch it
      const run2 = DateTime.fromISO('2024-01-15T14:03:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, run2)).toBe(true);

      // Scheduler run at 14:08 - should miss it
      const run3 = DateTime.fromISO('2024-01-15T14:08:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, run3)).toBe(false);
    });

    it('should handle multiple checks within same window', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';

      // First check at 14:00
      const check1 = DateTime.fromISO('2024-01-15T14:00:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, check1)).toBe(true);

      // Second check at 14:02 (within same window)
      const check2 = DateTime.fromISO('2024-01-15T14:02:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, check2)).toBe(true);

      // Both should return true
    });

    it('should not trigger for past scheduled times outside window', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T15:00:00.000Z', { zone: 'utc' });

      // 1 hour later - outside default window
      expect(isDue(scheduled, now)).toBe(false);
    });

    it('should not trigger for future scheduled times outside window', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T13:00:00.000Z', { zone: 'utc' });

      // 1 hour before - outside default window
      expect(isDue(scheduled, now)).toBe(false);
    });
  });

  describe('default parameter behavior', () => {
    it('should use current time when nowUtc is not provided', () => {
      // This test is time-sensitive and may be flaky
      // We'll schedule something very close to now
      const now = DateTime.now().toUTC();
      const scheduled = now.toISO()!;

      // Should be due since it's at the current time
      expect(isDue(scheduled)).toBe(true);
    });

    it('should use default window values (2, 5) when not provided', () => {
      const scheduled = '2024-01-15T14:00:00.000Z';

      // 1 minute before (within 2-min window)
      const before = DateTime.fromISO('2024-01-15T13:59:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, before)).toBe(true);

      // 4 minutes after (within 5-min window)
      const after = DateTime.fromISO('2024-01-15T14:04:00.000Z', { zone: 'utc' });
      expect(isDue(scheduled, after)).toBe(true);
    });
  });
});
