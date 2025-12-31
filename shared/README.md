# Shared Package

Shared TypeScript types, enums, DTOs, and utilities used across the monorepo.

## Overview

This package contains:
- **Types & Enums**: OutputMode, Cadence, RunStatus, UserSettings, ReportWindow
- **Scheduling Logic**: Timezone-aware date window calculations (Mon-Sun blocks)
- **Report Utilities**: Next-run computation and due-detection

All scheduling logic uses [Luxon](https://moment.github.io/luxon/) for robust timezone and DST handling.

## Installation

This package is part of the monorepo workspace. Install dependencies from the root:

```bash
npm install
```

## Usage

Import from other workspace packages:

```typescript
import { 
  OutputMode, 
  Cadence, 
  getPreviousReportWindow, 
  computeNextRunUtc,
  isDue 
} from '@outlook-weekly/shared';
```

## API Reference

### Enums

#### OutputMode

Report delivery options:

```typescript
enum OutputMode {
  DRAFT_EMAIL_TO_SELF = 'DRAFT_EMAIL_TO_SELF',   // Create draft email (default)
  SEND_EMAIL_TO_SELF = 'SEND_EMAIL_TO_SELF',     // Send email immediately
  PDF_ONLY = 'PDF_ONLY',                         // Generate PDF only
  DRAFT_PLUS_PDF = 'DRAFT_PLUS_PDF',             // Draft email + PDF attachment
}
```

#### Cadence

Report frequency options:

```typescript
enum Cadence {
  WEEKLY = 'WEEKLY',       // Previous full Mon-Sun week
  BIWEEKLY = 'BIWEEKLY',   // Previous two Mon-Sun weeks
  MONTHLY = 'MONTHLY',     // Previous four Mon-Sun weeks
}
```

#### RunStatus

Report run status tracking:

```typescript
enum RunStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
```

### Types

#### UserSettings

```typescript
interface UserSettings {
  userId: string;
  cadence: Cadence;
  outputMode: OutputMode;
  dayOfWeek: number;        // 1-7 (1=Monday, 7=Sunday) per ISO 8601
  timeOfDay: string;        // HH:mm format (e.g., "09:30")
  timezone: string;         // IANA timezone (e.g., "America/New_York")
  includeCalendar: boolean;
  includeSentMail: boolean;
}
```

#### ReportWindow

```typescript
interface ReportWindow {
  startLocal: string;  // ISO 8601 string in local timezone
  endLocal: string;    // ISO 8601 string in local timezone
  startUtc: string;    // ISO 8601 string in UTC
  endUtc: string;      // ISO 8601 string in UTC
}
```

### Functions

#### getPreviousReportWindow

Calculate the previous report window based on cadence. All windows are Mon-Sun blocks in the specified timezone.

```typescript
function getPreviousReportWindow(
  cadence: Cadence,
  timezone: string,
  now?: DateTime
): ReportWindow
```

**Example:**

```typescript
import { Cadence, getPreviousReportWindow } from '@outlook-weekly/shared';
import { DateTime } from 'luxon';

// Get previous week for a user in New York
const window = getPreviousReportWindow(
  Cadence.WEEKLY,
  'America/New_York',
  DateTime.fromISO('2024-01-15T10:00:00', { zone: 'America/New_York' })
);

console.log(window);
// {
//   startLocal: '2024-01-08T00:00:00.000-05:00',
//   endLocal: '2024-01-14T23:59:59.999-05:00',
//   startUtc: '2024-01-08T05:00:00.000Z',
//   endUtc: '2024-01-15T04:59:59.999Z'
// }
```

**Rules:**
- **WEEKLY**: Previous full Mon-Sun week
- **BIWEEKLY**: Previous two full Mon-Sun weeks
- **MONTHLY**: Previous four full Mon-Sun weeks
- Always returns complete Mon-Sun blocks
- Handles DST transitions automatically

#### computeNextRunUtc

Compute the next scheduled run time in UTC. The result is always strictly in the future.

```typescript
function computeNextRunUtc(
  cadence: Cadence,
  dayOfWeek: number,
  timeLocal: string,
  timezone: string,
  now?: DateTime
): string
```

**Parameters:**
- `cadence`: Report cadence (WEEKLY, BIWEEKLY, MONTHLY)
- `dayOfWeek`: 1-7 (1=Monday, 7=Sunday) per ISO 8601
- `timeLocal`: Time in HH:mm format (24-hour, e.g., "09:30")
- `timezone`: IANA timezone string (e.g., "America/New_York")
- `now`: Reference time (defaults to current time)

**Example:**

```typescript
import { Cadence, computeNextRunUtc } from '@outlook-weekly/shared';

// Schedule for every Monday at 9:00 AM EST
const nextRun = computeNextRunUtc(
  Cadence.WEEKLY,
  1,              // Monday
  "09:00",
  "America/New_York"
);

console.log(nextRun);
// '2024-01-22T14:00:00.000Z' (next Monday 9 AM EST in UTC)
```

**Behavior:**
- Returns ISO 8601 UTC string
- Result is always strictly in the future
- Advances by cadence interval (1, 2, or 4 weeks)
- Handles DST transitions correctly

#### isDue

Check if a scheduled run is due within a tolerance window.

```typescript
function isDue(
  nextRunUtc: string,
  nowUtc?: DateTime,
  windowBeforeMinutes?: number,
  windowAfterMinutes?: number
): boolean
```

**Parameters:**
- `nextRunUtc`: Scheduled run time in ISO 8601 UTC format
- `nowUtc`: Current time (defaults to now in UTC)
- `windowBeforeMinutes`: Minutes before scheduled time (default: 2)
- `windowAfterMinutes`: Minutes after scheduled time (default: 5)

**Example:**

```typescript
import { isDue } from '@outlook-weekly/shared';
import { DateTime } from 'luxon';

const scheduled = "2024-01-15T14:00:00.000Z";
const now = DateTime.fromISO("2024-01-15T14:02:00.000Z", { zone: 'utc' });

const due = isDue(scheduled, now);
console.log(due); // true (within 5-minute window)
```

**Use Case:**

Scheduler runs every 5 minutes. A job scheduled for 14:00 UTC will be detected as "due" between:
- 13:58 UTC (2 minutes before)
- 14:05 UTC (5 minutes after)

This tolerance window ensures jobs are not missed due to scheduler timing.

## Timezone Handling

All scheduling functions use **Luxon** for robust timezone support:

- ✅ Supports all IANA timezones (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`)
- ✅ Automatic DST handling (spring forward, fall back)
- ✅ Accurate UTC conversions
- ✅ ISO 8601 string formatting

**Why Luxon?**
- Modern, immutable API
- Built-in timezone database
- First-class TypeScript support
- Better DST handling than native Date
- ISO 8601 compliant

## Testing

Run tests:

```bash
npm test
```

Test coverage includes:
- ✅ Multiple IANA timezones
- ✅ DST boundary weeks (spring and fall)
- ✅ Mon-Sun alignment validation
- ✅ Next-run computation correctness
- ✅ Edge cases (year boundaries, leap years, midnight, etc.)

## Examples

### Calculate Report Window for Different Cadences

```typescript
import { Cadence, getPreviousReportWindow } from '@outlook-weekly/shared';

// Weekly report (previous Mon-Sun week)
const weekly = getPreviousReportWindow(Cadence.WEEKLY, 'America/New_York');
// Returns: Mon 00:00 to Sun 23:59:59.999 of previous week

// Biweekly report (previous two Mon-Sun weeks)
const biweekly = getPreviousReportWindow(Cadence.BIWEEKLY, 'Europe/London');
// Returns: 14 days (2 full weeks)

// Monthly report (previous four Mon-Sun weeks)
const monthly = getPreviousReportWindow(Cadence.MONTHLY, 'Asia/Tokyo');
// Returns: 28 days (4 full weeks)
```

### Schedule Next Run Across Timezones

```typescript
import { Cadence, computeNextRunUtc } from '@outlook-weekly/shared';
import { DateTime } from 'luxon';

const now = DateTime.fromISO('2024-01-15T10:00:00', { zone: 'America/New_York' });

// New York user: Monday 9 AM EST
const nyRun = computeNextRunUtc(Cadence.WEEKLY, 1, '09:00', 'America/New_York', now);

// London user: Friday 5 PM GMT
const londonRun = computeNextRunUtc(Cadence.WEEKLY, 5, '17:00', 'Europe/London', now);

// Tokyo user: Wednesday 2 PM JST
const tokyoRun = computeNextRunUtc(Cadence.BIWEEKLY, 3, '14:00', 'Asia/Tokyo', now);

// All results are in UTC for storage/scheduling
```

### Detect Due Jobs in Scheduler

```typescript
import { isDue } from '@outlook-weekly/shared';
import { DateTime } from 'luxon';

// Scheduler runs every 5 minutes
const checkDueJobs = (jobs: Array<{ nextRunUtc: string }>) => {
  const now = DateTime.now().toUTC();
  
  return jobs.filter(job => 
    isDue(job.nextRunUtc, now, 2, 5)
  );
};

// Example jobs
const jobs = [
  { nextRunUtc: '2024-01-15T14:00:00.000Z' },
  { nextRunUtc: '2024-01-15T16:00:00.000Z' },
];

// If current time is 14:02 UTC, first job is due
const dueJobs = checkDueJobs(jobs);
```

## Build

Compile TypeScript:

```bash
npm run build
```

The compiled output will be in `dist/` and can be consumed by other workspace packages.

## Dependencies

- **luxon** (^3.4.4): Timezone and date manipulation
- **@types/luxon** (^3.4.2): TypeScript definitions

## Notes

- All dates are ISO 8601 strings
- Weeks start on Monday (ISO 8601 standard)
- Timezones use IANA database names
- DST transitions are handled automatically
- All calculations preserve timezone information
