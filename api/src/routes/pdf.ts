import { Router, Response } from 'express';
import { AuthRequest } from '../types/api';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create router for PDF-related endpoints
 */
export function createPdfRouter() {
  const router = Router();

  /**
   * GET /me/runs/:runId/pdf-link
   * Get a link to download the PDF for a specific run
   * 
   * Returns 501 Not Implemented until full storage integration is complete
   */
  router.get(
    '/:runId/pdf-link',
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { runId } = req.params;

      // TODO: Implement PDF storage integration
      // 1. Verify run exists and belongs to user
      // 2. Check if PDF has been generated
      // 3. Get public URL from storage client
      // 4. Return link with expiration

      res.status(501).json({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'PDF download links are not yet implemented',
          details: {
            runId,
            note: 'This endpoint will return a signed URL once storage integration is complete',
          },
        },
      });
    })
  );

  return router;
}
