import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Apply auth middleware to all user routes
router.use(authMiddleware);

// User profile routes
router.get('/profile', asyncHandler(userController.getProfile));
router.put('/profile', asyncHandler(userController.updateProfile));
router.get('/credits', asyncHandler(userController.getCredits));
router.get('/credits/history', asyncHandler(userController.getCreditHistory));
router.get('/sessions', asyncHandler(userController.getSessionHistory));

export default router;
