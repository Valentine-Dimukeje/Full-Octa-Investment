import express from 'express';
import { getReferrals, getDevices, logoutDevice, updateNotifications } from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/user/referrals', getReferrals);
router.get('/auth/devices', getDevices);
router.post('/auth/devices/logout', logoutDevice);
router.post('/auth/notifications', updateNotifications);
router.post('/auth/notifications/update', updateNotifications); // Alias

export default router;
