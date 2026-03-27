import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { stats } from './dashboard.controller';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', stats);

export default router;
