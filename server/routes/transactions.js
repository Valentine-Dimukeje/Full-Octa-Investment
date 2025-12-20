import express from 'express';
import { getTransactions, deposit, withdraw, invest, getInvestments, dashboardSummary } from '../controllers/transactionController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/transactions', getTransactions);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/invest', invest);
router.get('/investments', getInvestments); // investments_list
router.get('/dashboard-summary', dashboardSummary);

export default router;
