import express from 'express';
import { adminTransactionAction, getUsers, getTransactions, updateUser, getReferrals, deleteUser, deleteTransaction } from '../controllers/adminController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware to check admin status
const isAdmin = (req, res, next) => {
    // Check is_staff from token (assuming it's there, or we fetch it)
    if (req.user && (req.user.is_staff || req.user.is_superuser)) {
        next();
    } else {
        res.status(403).json({ error: "Admin access required" });
    }
};

router.use(authenticateToken);  

router.get('/users', isAdmin, getUsers);
router.put('/users/:id', isAdmin, updateUser);
router.get('/transactions', isAdmin, getTransactions);
router.get('/referrals', isAdmin, getReferrals);
router.post('/transactions/:pk/admin-action', isAdmin, adminTransactionAction);
router.delete('/users/:id', isAdmin, deleteUser);
router.delete('/transactions/:id', isAdmin, deleteTransaction);

export default router;
