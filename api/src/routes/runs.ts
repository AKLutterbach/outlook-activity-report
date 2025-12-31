import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/api';
import { ReportRunRepository } from '../db';
import { CosmosDbClient } from '../db/cosmosClient';

const QuerySchema = z.object({
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 5)),
});

export function createRunsRouter(cosmosClient: CosmosDbClient) {
  const router = Router();
  const runRepo = new ReportRunRepository(cosmosClient);

  /**
   * GET /me/runs?limit=5
   * Get user's run history
   */
  router.get(
    '/',
    asyncHandler(async (req: AuthRequest, res: Response) => {
      // Parse and validate query params
      const query = QuerySchema.parse(req.query);
      const limit = Math.min(Math.max(query.limit, 1), 50); // Cap at 50

      // Query runs by userId (partition key - efficient!)
      const runs = await runRepo.getLastRunsForUser(req.user.userId, limit);

      res.json({
        data: {
          runs: runs.map((run) => ({
            id: run.id,
            status: run.status,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            reportWindowStart: run.reportWindowStart,
            reportWindowEnd: run.reportWindowEnd,
            draftMessageId: run.draftMessageId,
            pdfBlobKey: run.pdfBlobKey,
            pdfDeleted: run.pdfDeleted,
            errorMessage: run.errorMessage,
          })),
          count: runs.length,
          limit,
        },
      });
    })
  );

  return router;
}
