import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { creditsMiddleware } from '../middleware/credits.middleware';
import { labController } from '../controllers/lab.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Apply auth middleware to all lab routes
router.use(asyncHandler(authMiddleware));

// Start a new lab session
router.post(
  '/start',
  asyncHandler(creditsMiddleware),
  asyncHandler(labController.startLabSession)
);

// Get active session for user
router.get(
  '/active',
  asyncHandler(labController.getActiveSession)
);

// Reconnect to an existing session
router.get(
  '/:sessionId/connect',
  asyncHandler(labController.connectToSession)
);

// Terminate a session
router.post(
  '/:sessionId/terminate',
  asyncHandler(labController.terminateSession)
);

// Get session status
router.get(
  '/:sessionId/status',
  asyncHandler(labController.getSessionStatus)
);

export default router;
