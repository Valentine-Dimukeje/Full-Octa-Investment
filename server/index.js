import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';


dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
    origin: [
        'http://localhost:3000', 
        'https://octa-invest.vercel.app',
        'https://octa-investment.com',
        'http://127.0.0.1:3000', 
        'http://localhost:5173'
    ], 
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); 
app.use('/api', transactionRoutes);
app.use('/api', userRoutes);
app.use('/api', adminRoutes);

// Basic health check
app.get('/', (req, res) => {
    res.json({ message: 'InvestPro Backend is running' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
