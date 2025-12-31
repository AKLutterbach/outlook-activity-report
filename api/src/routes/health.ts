import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'outlook-weekly-api',
      },
    });
  })
);

export default router;
