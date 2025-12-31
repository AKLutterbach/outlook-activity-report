import { OutputMode, Cadence, RunStatus, getPreviousReportWindow, computeNextRunUtc, isDue } from './index';
import { DateTime } from 'luxon';

describe('Shared module exports', () => {
  describe('Enums', () => {
    it('should export OutputMode enum', () => {
      expect(OutputMode.DRAFT_EMAIL_TO_SELF).toBe('DRAFT_EMAIL_TO_SELF');
      expect(OutputMode.SEND_EMAIL_TO_SELF).toBe('SEND_EMAIL_TO_SELF');
      expect(OutputMode.PDF_ONLY).toBe('PDF_ONLY');
      expect(OutputMode.DRAFT_PLUS_PDF).toBe('DRAFT_PLUS_PDF');
    });

    it('should export Cadence enum', () => {
      expect(Cadence.WEEKLY).toBe('WEEKLY');
      expect(Cadence.BIWEEKLY).toBe('BIWEEKLY');
      expect(Cadence.MONTHLY).toBe('MONTHLY');
    });

    it('should export RunStatus enum', () => {
      expect(RunStatus.PENDING).toBe('PENDING');
      expect(RunStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(RunStatus.SUCCESS).toBe('SUCCESS');
      expect(RunStatus.ERROR).toBe('ERROR');
    });
  });

  describe('Scheduling functions', () => {
    it('should export getPreviousReportWindow', () => {
      expect(typeof getPreviousReportWindow).toBe('function');
      
      const window = getPreviousReportWindow(
        Cadence.WEEKLY,
        'America/New_York',
        DateTime.fromISO('2024-01-15T10:00:00', { zone: 'America/New_York' })
      );
      
      expect(window).toHaveProperty('startLocal');
      expect(window).toHaveProperty('endLocal');
      expect(window).toHaveProperty('startUtc');
      expect(window).toHaveProperty('endUtc');
    });

    it('should export computeNextRunUtc', () => {
      expect(typeof computeNextRunUtc).toBe('function');
      
      const nextRun = computeNextRunUtc(
        Cadence.WEEKLY,
        1,
        '09:00',
        'America/New_York',
        DateTime.fromISO('2024-01-15T10:00:00', { zone: 'America/New_York' })
      );
      
      expect(typeof nextRun).toBe('string');
      expect(DateTime.fromISO(nextRun).isValid).toBe(true);
    });

    it('should export isDue', () => {
      expect(typeof isDue).toBe('function');
      
      const scheduled = '2024-01-15T14:00:00.000Z';
      const now = DateTime.fromISO('2024-01-15T14:00:00.000Z', { zone: 'utc' });
      
      expect(isDue(scheduled, now)).toBe(true);
    });
  });
});
