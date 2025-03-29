import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { adminMiddleware, authMiddleware } from '../middleware/auth.middleware'; 
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(asyncHandler(authMiddleware));
router.use(asyncHandler(adminMiddleware));

router.get('/users', asyncHandler(adminController.getUsers));
router.get('/users/:userId', asyncHandler(adminController.getUserDetails));
router.post('/users/:userId/credits', asyncHandler(adminController.addCredits));
router.get('/sessions', asyncHandler(adminController.getAllSessions));
router.get('/sessions/:sessionId', asyncHandler(adminController.getSessionDetails));
router.post('/sessions/:sessionId/terminate', asyncHandler(adminController.terminateSession));
router.get('/system/logs', asyncHandler(adminController.getSystemLogs));
router.get('/system/stats', asyncHandler(adminController.getSystemStats));

export default router;
