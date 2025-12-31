import { Router, Response } from 'express';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/api';
import { UserSettingsRepository } from '../db';
import { CosmosDbClient } from '../db/cosmosClient';
import { Cadence, OutputMode } from '@outlook-weekly/shared';
import { computeNextRunUtc } from '@outlook-weekly/shared';

/**
 * Validation schemas
 */
const UpdateSettingsSchema = z.object({
  cadence: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  outputMode: z.enum(['DRAFT_EMAIL_TO_SELF', 'SEND_EMAIL_TO_SELF', 'PDF_ONLY', 'DRAFT_PLUS_PDF']),
  dayOfWeek: z.number().int().min(1).max(7),
  timeOfDay: z.string().regex(/^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in H:mm or HH:mm format'),
  timezone: z.string(),
  includeCalendar: z.boolean(),
  includeSentMail: z.boolean(),
});

export function createSettingsRouter(cosmosClient: CosmosDbClient) {
  const router = Router();
  const settingsRepo = new UserSettingsRepository(cosmosClient);

  /**
   * GET /me/settings
   * Get current user settings
   */
  router.get(
    '/',
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const settings = await settingsRepo.get(req.user.userId);

      if (!settings) {
        throw new AppError('SETTINGS_NOT_FOUND', 'User settings not found', 404);
      }

      res.json({
        data: {
          cadence: settings.cadence,
          outputMode: settings.outputMode,
          dayOfWeek: settings.dayOfWeek,
          timeOfDay: settings.timeOfDay,
          timezone: settings.timezone,
          includeCalendar: settings.includeCalendar,
          includeSentMail: settings.includeSentMail,
          nextRunUtc: settings.nextRunUtc,
        },
      });
    })
  );

  /**
   * PUT /me/settings
   * Update user settings
   * Computes and stores nextRunUtc based on cadence, day, time, and timezone
   */
  router.put(
    '/',
    asyncHandler(async (req: AuthRequest, res: Response) => {
      // Validate request body
      const body = UpdateSettingsSchema.parse(req.body);

      // Compute nextRunUtc using shared scheduling logic
      const now = DateTime.utc();
      const nextRunUtc = computeNextRunUtc(
        body.cadence as Cadence,
        body.dayOfWeek,
        body.timeOfDay,
        body.timezone,
        now
      );

      // Upsert settings with computed nextRunUtc
      const settings = await settingsRepo.upsert(req.user.userId, req.user.tenantId, {
        cadence: body.cadence as Cadence,
        outputMode: body.outputMode as OutputMode,
        dayOfWeek: body.dayOfWeek,
        timeOfDay: body.timeOfDay,
        timezone: body.timezone,
        includeCalendar: body.includeCalendar,
        includeSentMail: body.includeSentMail,
        nextRunUtc,
      });

      res.json({
        data: {
          cadence: settings.cadence,
          outputMode: settings.outputMode,
          dayOfWeek: settings.dayOfWeek,
          timeOfDay: settings.timeOfDay,
          timezone: settings.timezone,
          includeCalendar: settings.includeCalendar,
          includeSentMail: settings.includeSentMail,
          nextRunUtc: settings.nextRunUtc,
        },
      });
    })
  );

  return router;
}
