// Types copied from @outlook-weekly/shared for deployment
// TODO: Use proper package reference once monorepo is set up for deployment

export enum Cadence {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export enum OutputMode {
  EMAIL_DRAFT = 'email-draft',
  PDF = 'pdf',
  BOTH = 'both'
}

export enum RunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface UserSettings {
  userId: string;
  cadence: Cadence;
  outputMode: OutputMode;
  dayOfWeek: number;
  timeOfDay: string;
  timezone: string;
  includeCalendar: boolean;
  includeSentMail: boolean;
}

export interface ReportRun {
  id: string;
  userId: string;
  tenantId: string;
  cadence: string;
  windowStart: Date;
  windowEnd: Date;
  status: RunStatus;
  startedAt?: Date;
  completedAt?: Date;
  draftMessageId?: string;
  pdfBlobKey?: string;
  errorMessage?: string;
  createdAt: Date;
}

export interface ReportWindow {
  startLocal: string;
  endLocal: string;
  startUtc: string;
  endUtc: string;
}

export const COSMOS_CONTAINERS = [
  { id: 'users', partitionKey: '/tenantId' },
  { id: 'settings', partitionKey: '/userId' },
  { id: 'runs', partitionKey: '/userId' },
  { id: 'msal-cache', partitionKey: '/userId' },
  { id: 'tenants', partitionKey: '/id' },
  { id: 'user-tokens', partitionKey: '/userId' },
  { id: 'pkce-state', partitionKey: '/state' }
];

// Scheduling utilities placeholder
export function computeNextRunUtc(settings: UserSettings): Date {
  // Placeholder implementation
  const now = new Date();
  now.setDate(now.getDate() + 7);
  return now;
}
