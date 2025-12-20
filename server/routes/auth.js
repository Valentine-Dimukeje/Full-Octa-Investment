import express from 'express';
import { register, login, refreshToken, getMe, getProfile, updateProfile, updateNotifications, getDevices, logoutDevice, deleteAccount, requestPasswordReset, confirmPasswordReset } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/token/refresh', refreshToken);

router.get('/me', authenticateToken, getMe);
router.get('/profile', authenticateToken, getProfile); // /api/profile
router.post('/me/update', authenticateToken, updateProfile);
router.post('/notifications', authenticateToken, updateNotifications);
router.get('/devices', authenticateToken, getDevices);
router.post('/devices/logout', authenticateToken, logoutDevice);
router.delete('/delete', authenticateToken, deleteAccount);

router.post('/password-reset', requestPasswordReset);
router.post('/password-reset-confirm', confirmPasswordReset);

export default router;
