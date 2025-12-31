/**
 * Output modes for report delivery
 */
export enum OutputMode {
  DRAFT_EMAIL_TO_SELF = 'DRAFT_EMAIL_TO_SELF',
  SEND_EMAIL_TO_SELF = 'SEND_EMAIL_TO_SELF',
  PDF_ONLY = 'PDF_ONLY',
  DRAFT_PLUS_PDF = 'DRAFT_PLUS_PDF',
}

/**
 * Report cadence options
 */
export enum Cadence {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

/**
 * Report run status
 */
export enum RunStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
