import { db } from '../db/index.js';
import { transactions, investments, profiles } from '../db/schema.js'; 
import { eq, desc, sql, and } from 'drizzle-orm';
import { mailAdmins } from '../utils/email.js';

// Get User Transactions
export const getTransactions = async (req, res) => {
    try {
        const txs = await db.select().from(transactions)
            .where(eq(transactions.userId, req.user.id))
            .orderBy(desc(transactions.createdAt));
        res.json(txs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Deposit
export const deposit = async (req, res) => {
    const { amount, method, tx_id } = req.body;
    
    if (!amount || !method || !tx_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const [txn] = await db.insert(transactions).values({
            userId: req.user.id,
            type: 'deposit',
            amount: parseFloat(amount),
            status: 'pending',
            meta: { method, tx_id }
        }).returning();

        // Return final balance
        const [newProfile] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);
        res.status(201).json({ 
            message: "Deposit initiated. Please complete payment.", 
            transaction: txn,
            balance: newProfile?.mainWallet
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Withdraw
export const withdraw = async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    try {
        const val = parseFloat(amount);
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);

        if (profile.mainWallet < val) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        const [txn] = await db.insert(transactions).values({
            userId: req.user.id,
            type: 'withdraw',
            amount: val,
            status: 'pending'
        }).returning();

        // Notify Admin
        await mailAdmins(
            `New Withdrawal Request from ${req.user.email}`,
            `User ${req.user.email} has requested a withdrawal of $${val}.`
        );

        res.status(201).json({
            message: "Withdrawal request submitted. Awaiting admin approval.",
            transaction: txn.id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Invest
export const invest = async (req, res) => {
    const { amount, plan } = req.body;
    if (!amount || !plan) return res.status(400).json({ error: "Amount and plan are required" });

    try {
        const val = parseFloat(amount);
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        if (profile.mainWallet < val) {
            return res.status(400).json({ error: "Insufficient funds" });
        }

        // Deduct balance and Create Investment Transaction
        await db.transaction(async (tx) => {
            await tx.update(profiles)
                .set({ mainWallet: profile.mainWallet - val })
                .where(eq(profiles.id, profile.id));

            const planRates = {
                "Amateur Plan": 0.05,
                "Exclusive Plan": 0.08,
                "Diamond Plan": 0.12,
            };
            const rate = planRates[plan] || 0.05;

            // Create Transaction record
            await tx.insert(transactions).values({
                userId: req.user.id,
                type: 'investment',
                amount: val,
                status: 'active',
                meta: {
                    plan,
                    rate,
                    next_payout: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
            });
        });

        const [newProfile] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);

        res.status(201).json({
            message: "Investment successful",
            // transaction: txn, // (omitted return for brevity in transaction block, but usually needed)
            new_balance: newProfile?.mainWallet
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// List Investments (Filtered Transactions)
export const getInvestments = async (req, res) => {
    try {
        const txs = await db.select().from(transactions)
            .where(and(eq(transactions.userId, req.user.id), eq(transactions.type, 'investment')))
            .orderBy(desc(transactions.createdAt));
        
        const out = txs.map(t => ({
            plan: t.meta?.plan || "",
            amount: t.amount,
            earnings: t.meta?.earnings || "0",
            status: ['active', 'pending'].includes(t.status) ? "Active" : t.status,
            created_at: t.createdAt
        }));

        res.json(out);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Dashboard Summary
export const dashboardSummary = async (req, res) => {
    try {
        const txs = await db.select().from(transactions).where(eq(transactions.userId, req.user.id));
        
        const sum = (type, statuses) => txs
            .filter(t => t.type === type && statuses.includes(t.status))
            .reduce((acc, curr) => acc + curr.amount, 0);

        const deposits = sum('deposit', ['completed', 'approved']);
        const withdrawals = sum('withdraw', ['completed', 'approved']);
        const investments = sum('investment', ['active', 'completed']);
        const earnings = sum('profit', ['completed', 'approved']);

        // Recent 10
        const recent = txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

        res.json({
            total_deposits: deposits.toFixed(2),
            total_withdrawals: withdrawals.toFixed(2),
            total_investments: investments.toFixed(2),
            total_earnings: earnings.toFixed(2),
            recent
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};
