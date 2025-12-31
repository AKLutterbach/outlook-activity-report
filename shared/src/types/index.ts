import { Cadence, OutputMode, RunStatus } from './enums';

/**
 * User settings for report generation
 */
export interface UserSettings {
  userId: string;
  cadence: Cadence;
  outputMode: OutputMode;
  dayOfWeek: number; // 1-7 (1=Monday, 7=Sunday) per ISO 8601
  timeOfDay: string; // HH:mm format in user's local time
  timezone: string; // IANA timezone (e.g., 'America/New_York')
  includeCalendar: boolean;
  includeSentMail: boolean;
}

/**
 * Report run record
 */
export interface ReportRun {
  id: string;
  userId: string;
  status: RunStatus;
  startedAt: Date;
  completedAt?: Date;
  draftMessageId?: string;
  pdfBlobKey?: string;
  errorMessage?: string;
}

/**
 * Report window with local and UTC times
 */
export interface ReportWindow {
  startLocal: string; // ISO 8601 string in local timezone
  endLocal: string; // ISO 8601 string in local timezone
  startUtc: string; // ISO 8601 string in UTC
  endUtc: string; // ISO 8601 string in UTC
}

export * from './enums';
export * from './cosmos';
