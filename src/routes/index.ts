import { Router } from 'express';
import authRoutes from './auth.routes';
import labRoutes from './lab.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/lab', labRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);

export default router;
