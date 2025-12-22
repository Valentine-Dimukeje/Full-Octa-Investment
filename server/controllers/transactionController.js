import { db } from '../db/index.js';
import { transactions, investments, profiles } from '../db/schema.js'; 
import { eq, desc, sql, and } from 'drizzle-orm';
import { mailAdmins } from '../utils/email.js';

// Helper: Check for Matured Investments
const checkInvestmentMaturity = async (userId) => {
    // Plan configurations
    const PLAN_CONFIG = {
        "Amateur Plan": { intervalHours: 24, rate: 0.10 },
        "Exclusive Plan": { intervalHours: 48, rate: 0.20 },
        "Diamond Plan": { intervalHours: 72, rate: 0.30 },
        "Star Plan": { intervalHours: 96, rate: 0.50 },
    };

    // 1. Check Standard Investments (in 'investments' table)
    const activeInvestments = await db.select().from(investments)
        .where(and(eq(investments.userId, userId), eq(investments.status, 'Active')));

    for (const inv of activeInvestments) {
        const config = PLAN_CONFIG[inv.plan];
        if (!config) continue;

        const now = new Date();
        const created = new Date(inv.createdAt);
        const hoursPassed = (now - created) / (1000 * 60 * 60);

        // Check if maturity duration reached
        if (hoursPassed >= config.intervalHours) {
            const principal = parseFloat(inv.amount);
            const profit = principal * config.rate;
            const totalPayout = principal + profit;

            // Perform Payout Transaction
            await db.transaction(async (tx) => {
                // 1. Credit Main Wallet
                await tx.update(profiles)
                    .set({ mainWallet: sql`${profiles.mainWallet} + ${totalPayout}` })
                    .where(eq(profiles.userId, userId));

                // 2. Mark Investment as Completed
                await tx.update(investments)
                    .set({ 
                        status: 'Completed', 
                        earnings: profit.toFixed(2),
                        updatedAt: new Date()
                    })
                    .where(eq(investments.id, inv.id));

                // 3. Create Payout Transaction Record
                await tx.insert(transactions).values({
                    userId: userId,
                    type: 'payout', // identifying this as the return
                    amount: totalPayout,
                    status: 'completed',
                    meta: JSON.stringify({ 
                        source: 'Investment Maturity', 
                        plan: inv.plan,
                        principal: principal,
                        profit: profit
                    })
                });
            });
            // console.log(`✅ Investment ${inv.id} matured. Payout: $${totalPayout}`);
        }
    }

    // 2. Check Legacy Investments (Active 'investment' type in 'transactions' table)
    // These only exist in transactions table, not in investments table
    const legacyInvestments = await db.select().from(transactions)
        .where(and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'investment'),
            eq(transactions.status, 'active') // Note: Lowercase 'active' for legacy consistency
        ));

    for (const txInv of legacyInvestments) {
        let plan = "Investment";
        try {
            const meta = typeof txInv.meta === 'string' ? JSON.parse(txInv.meta) : (txInv.meta || {});
            plan = meta.plan;
        } catch (e) {}

        const config = PLAN_CONFIG[plan];
        if (!config) continue; // Skip if plan unknown

        const now = new Date();
        const created = new Date(txInv.createdAt);
        const hoursPassed = (now - created) / (1000 * 60 * 60);

        if (hoursPassed >= config.intervalHours) {
            const principal = parseFloat(txInv.amount);
            const profit = principal * config.rate;
            const totalPayout = principal + profit;

            // Perform Payout for Legacy
            await db.transaction(async (tx) => {
                // 1. Credit Main Wallet
                await tx.update(profiles)
                    .set({ mainWallet: sql`${profiles.mainWallet} + ${totalPayout}` })
                    .where(eq(profiles.userId, userId));

                // 2. Mark Legacy Transaction as 'completed' (so it stops being 'active')
                await tx.update(transactions)
                    .set({ 
                        status: 'completed', // Changed from active to completed
                        updatedAt: new Date()
                    })
                    .where(eq(transactions.id, txInv.id));

                // 3. Create Payout Transaction Record
                await tx.insert(transactions).values({
                    userId: userId,
                    type: 'payout',
                    amount: totalPayout,
                    status: 'completed',
                    meta: JSON.stringify({ 
                        source: 'Legacy Investment Maturity', 
                        plan: plan,
                        principal: principal,
                        profit: profit,
                        originalTxId: txInv.id
                    })
                });
            });
            console.log(`✅ Legacy Investment ${txInv.id} matured. Payout: $${totalPayout}`);
        }
    }
};


// Get User Transactions
export const getTransactions = async (req, res) => {
    try {
        const txs = await db.select().from(transactions)
            .where(eq(transactions.userId, Number(req.user.id)))
            .orderBy(desc(transactions.createdAt));
            
        const formatted = txs.map(t => ({
            ...t,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
            meta: typeof t.meta === 'string' ? JSON.parse(t.meta) : (t.meta || {})
        }));
        
        res.json(formatted);
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
    const { amount, method, destination } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    try {
        const val = parseFloat(amount);
        
        // Minimum Withdrawal Check
        if (val < 100) {
            return res.status(400).json({ error: "Minimum withdrawal amount is $100" });
        }

        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, Number(req.user.id))).limit(1);

        if (!profile || Number(profile.mainWallet) < val) {
            // console.log(`❌ Withdrawal failed for ${req.user.email}. Balance: ${profile?.mainWallet}, Requested: ${val}`);
            return res.status(400).json({ error: "Insufficient balance" });
        }

        // Deduct from wallet immediately to "lock" funds
        await db.update(profiles)
            .set({ mainWallet: sql`${profiles.mainWallet} - ${val}` })
            .where(eq(profiles.userId, Number(req.user.id)));

        const [txn] = await db.insert(transactions).values({
            userId: req.user.id,
            type: 'withdraw',
            amount: val,
            status: 'pending',
            meta: JSON.stringify({ method, destination })
        }).returning();

        // Notify Admin
        await mailAdmins(
            `New Withdrawal Request from ${req.user.email}`,
            `User ${req.user.email} has requested a withdrawal of $${val}.\nMethod: ${method}\nDestination: ${destination}`
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

        // Deduct balance from Main Wallet
        await db.transaction(async (tx) => {
            await tx.update(profiles)
                .set({ mainWallet: sql`${profiles.mainWallet} - ${val}` })
                .where(eq(profiles.id, profile.id));

            // Create Transaction record for history
            await tx.insert(transactions).values({
                userId: req.user.id,
                type: 'investment',
                amount: val,
                status: 'active',
                meta: JSON.stringify({ plan })
            });

            // Create Investment record
            await tx.insert(investments).values({
                userId: req.user.id,
                plan: plan,
                amount: val,
                status: 'Active'
            });
        });

        const [newProfile] = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);

        res.status(201).json({
            message: "Investment successful",
            new_balance: newProfile?.mainWallet
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// List Investments (with Lazy Earnings Update and Maturity Check)
export const getInvestments = async (req, res) => {
    try {
        // Run maturity check first
        await checkInvestmentMaturity(Number(req.user.id));

        // Fetch all investments
        const userInvestments = await db.select().from(investments)
            .where(eq(investments.userId, Number(req.user.id)))
            .orderBy(desc(investments.createdAt));

        // Fetch Legacy Active Investments from transactions
        const legacyInvestments = await db.select().from(transactions).where(
            and(
                eq(transactions.userId, Number(req.user.id)),
                eq(transactions.type, 'investment'),
                eq(transactions.status, 'active')
            )
        );

        // Map legacy to same structure if not already in investments table (simple de-dupe by plan/amount/time might be needed if migration happened, but assuming simple separation for now)
        // Check if legacy ones are already in userInvestments (simplistic check to avoid duplicates if system is mixed)
        // Since we know the issue is they are NOT in investments table, we add them.
        const formattedLegacy = legacyInvestments.map(tx => {
            let plan = "Investment";
            try {
                const meta = typeof tx.meta === 'string' ? JSON.parse(tx.meta) : (tx.meta || {});
                plan = meta.plan || "Investment";
            } catch(e) {}

            return {
                id: `legacy-${tx.id}`,
                plan: plan,
                amount: tx.amount,
                earnings: "0.00", // Will be updated by projection logic below
                status: "Active",
                createdAt: tx.createdAt,
                updatedAt: tx.updatedAt,
                isLegacy: true
            };
        });

        const allInvestments = [...userInvestments, ...formattedLegacy];

        const updatedInvestments = [];

        // Plan configurations
        const PLAN_CONFIG = {
            "Amateur Plan": { intervalHours: 24, rate: 0.10 },
            "Exclusive Plan": { intervalHours: 48, rate: 0.20 },
            "Diamond Plan": { intervalHours: 72, rate: 0.30 },
            "Star Plan": { intervalHours: 96, rate: 0.50 },
        };

        // Lazy Update Logic for Active Investments
        for (const inv of allInvestments) {
            if (inv.status === 'Active' || inv.status === 'active') { // Handle case sensitivity
                const config = PLAN_CONFIG[inv.plan];
                if (config) {
                    // Update: User wants to see the projected earnings (Total Profit) instead of 0.00
                    // Projected Profit = Amount * Rate
                    const projectedProfit = (parseFloat(inv.amount) * config.rate).toFixed(2);
                    
                    // We override the earnings field for display purposes on the frontend
                    // The database still holds the 'realized' earnings (which is 0 until maturity usually)
                    // But for the user UI, we show what they WILL get.
                    inv.earnings = projectedProfit;

                    // Calculate Payout Date
                    const created = new Date(inv.createdAt || inv.created_at);
                    const payoutTime = new Date(created.getTime() + config.intervalHours * 60 * 60 * 1000);
                    inv.payoutDate = payoutTime.toISOString();

                    // Server side maturity check logic...
                }
            } else if (inv.status === 'Completed') {
                 // For completed investments, payout date is effectively the updatedAt (or close to it)
                 inv.payoutDate = inv.updatedAt;
            }
            updatedInvestments.push(inv);
        }
        
        res.json(updatedInvestments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Dashboard Summary
export const dashboardSummary = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        
        // Run maturity check
        await checkInvestmentMaturity(userId);

        // 1. Calculate Totals using SQL Aggregations
        // Total Deposits (completed/approved)
        const [depositRes] = await db.select({ 
            total: sql`COALESCE(SUM(${transactions.amount}), 0)` 
        })
        .from(transactions)
        .where(and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'deposit'),
            sql`${transactions.status} IN ('completed', 'approved')`
        ));

        // Total Withdrawals (completed/approved)
        const [withdrawRes] = await db.select({ 
            total: sql`COALESCE(SUM(${transactions.amount}), 0)` 
        })
        .from(transactions)
        .where(and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'withdraw'),
            sql`${transactions.status} IN ('completed', 'approved')`
        ));

        // Total Investments (active/completed)
        const [investRes] = await db.select({ 
            total: sql`COALESCE(SUM(${transactions.amount}), 0)` 
        })
        .from(transactions)
        .where(and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'investment'),
            sql`${transactions.status} IN ('active', 'completed')`
        ));

        // Total Earnings
        // 1. From Completed Investments (profit field)
        const [invProfitRes] = await db.select({
            total: sql`COALESCE(SUM(${investments.earnings}), 0)`
        })
        .from(investments)
        .where(and(
            eq(investments.userId, userId),
            eq(investments.status, 'Completed')
        ));
        
        // 2. From Referral Bonuses (transaction type 'profit')
        const [refBonusRes] = await db.select({
            total: sql`COALESCE(SUM(${transactions.amount}), 0)`
        })
        .from(transactions)
        .where(and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'profit'),
            sql`${transactions.status} IN ('completed', 'approved')`
        ));

        // 3. From Active Investments (Projected Earnings)
        // Since we want to show "Potential" earnings for active ones too
        const activeInvestments = await db.select().from(investments)
            .where(and(eq(investments.userId, userId), eq(investments.status, 'Active')));

        // Also fetch Legacy Active Investments from transactions
        const legacyActiveInvestments = await db.select().from(transactions).where(
            and(
                eq(transactions.userId, userId),
                eq(transactions.type, 'investment'),
                eq(transactions.status, 'active')
            )
        );

        const PLAN_CONFIG = {
            "Amateur Plan": { intervalHours: 24, rate: 0.10 },
            "Exclusive Plan": { intervalHours: 48, rate: 0.20 },
            "Diamond Plan": { intervalHours: 72, rate: 0.30 },
            "Star Plan": { intervalHours: 96, rate: 0.50 },
        };

        const activeProjectedEarnings = activeInvestments.reduce((sum, inv) => {
            const config = PLAN_CONFIG[inv.plan];
            const profit = config ? parseFloat(inv.amount) * config.rate : 0;
            return sum + profit;
        }, 0);

        const legacyProjectedEarnings = legacyActiveInvestments.reduce((sum, tx) => {
            let plan = "Investment";
            try {
                const meta = typeof tx.meta === 'string' ? JSON.parse(tx.meta) : (tx.meta || {});
                plan = meta.plan || "Investment";
            } catch(e) {}
            
            const config = PLAN_CONFIG[plan];
            // If plan string doesn't match perfectly, it might be 0, but usually legacy has correct plan string in meta.
            const profit = config ? parseFloat(tx.amount) * config.rate : 0;
            return sum + profit;
        }, 0);

        const totalEarnings = parseFloat(invProfitRes?.total || 0) + parseFloat(refBonusRes?.total || 0) + activeProjectedEarnings + legacyProjectedEarnings;


        // 2. Fetch Recent Transactions (Limit 10)
        const recentTxs = await db.select().from(transactions)
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.createdAt))
            .limit(10);
            
        const recentFormatted = recentTxs.map(t => {
            let metaObj = {};
            try {
                metaObj = typeof t.meta === 'string' ? JSON.parse(t.meta) : (t.meta || {});
            } catch (e) {
                console.error("Failed to parse meta for txn", t.id);
            }
            return {
                ...t,
                created_at: t.createdAt,
                updated_at: t.updatedAt,
                meta: metaObj
            };
        });

        // 3. Get Wallet Balance
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

        // console.log(`📊 Fast Dashboard summary for user ${req.user.email} (ID: ${userId})`);

        res.json({
            wallet: profile?.mainWallet || "0.00",
            profit_wallet: profile?.profitWallet || "0.00",
            total_deposits: parseFloat(depositRes?.total || 0).toFixed(2),
            total_withdrawals: parseFloat(withdrawRes?.total || 0).toFixed(2),
            total_investments: parseFloat(investRes?.total || 0).toFixed(2),
            total_earnings: totalEarnings.toFixed(2),
            recent: recentFormatted
        });

    } catch (error) {
        console.error("Dashboard Summary Error:", error);
        res.status(500).json({ error: "Server error loading dashboard" });
    }
};
