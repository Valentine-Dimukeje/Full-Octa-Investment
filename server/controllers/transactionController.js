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
            console.log(`✅ Investment ${inv.id} matured. Payout: $${totalPayout}`);
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
            console.log(`❌ Withdrawal failed for ${req.user.email}. Balance: ${profile?.mainWallet}, Requested: ${val}`);
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

        const updatedInvestments = [];

        // Plan configurations
        const PLAN_CONFIG = {
            "Amateur Plan": { intervalHours: 24, rate: 0.10 },
            "Exclusive Plan": { intervalHours: 48, rate: 0.20 },
            "Diamond Plan": { intervalHours: 72, rate: 0.30 },
            "Star Plan": { intervalHours: 96, rate: 0.50 },
        };

        // Lazy Update Logic for Active Investments
        for (const inv of userInvestments) {
            if (inv.status === 'Active') {
                const config = PLAN_CONFIG[inv.plan];
                if (config) {
                    const now = new Date();
                    const created = new Date(inv.createdAt);
                    const hoursPassed = (now - created) / (1000 * 60 * 60);
                    
                    const cycles = Math.floor(hoursPassed / config.intervalHours);
                    const newEarnings = (parseFloat(inv.amount) * config.rate * cycles).toFixed(2);

                    // If earnings changed, update DB
                    if (parseFloat(newEarnings) !== parseFloat(inv.earnings)) {
                        await db.update(investments)
                            .set({ earnings: newEarnings, updatedAt: new Date() })
                            .where(eq(investments.id, inv.id));
                        inv.earnings = newEarnings; // Update local object for response
                    }
                }
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
        // Run maturity check
        await checkInvestmentMaturity(Number(req.user.id));

        const txs = await db.select().from(transactions).where(eq(transactions.userId, Number(req.user.id)));
        
        const sum = (type, statuses) => txs
            .filter(t => t.type === type && statuses.includes(t.status))
            .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

        const deposits = sum('deposit', ['completed', 'approved']);
        const withdrawals = sum('withdraw', ['completed', 'approved']);
        const investmentsTotal = sum('investment', ['active', 'completed']);
        // Earnings now come from Payout transactions (profit portion) or direct profit entries
        // Since we insert 'payout' which includes principal + profit, 'total_earnings' needs to be clearer.
        // For now, let's sum 'profit' type transactions if any, OR calculate from payouts if we store profit separately.
        // The standard logic often separates referrer bonuses (profit) from investment returns.
        // To catch investment profits, we can sum 'payout' minus 'investment principal', BUT 
        // simpler approach: sum 'profit' transactions if we had them.
        // Current implementation: 'payout' stores total.
        // Let's refine: For dashboard "Total Earnings", we can sum the 'profit' field from completed investments
        // or iterate completed investments.
        
        // Alternative: Sum transaction type 'profit' (referral bonuses) + completed investment profits.
        
        const completedInvestments = await db.select().from(investments)
            .where(and(eq(investments.userId, Number(req.user.id)), eq(investments.status, 'Completed')));
            
        const investmentProfits = completedInvestments.reduce((acc, inv) => acc + parseFloat(inv.earnings || 0), 0);
        
        const referralBonuses = sum('profit', ['completed', 'approved']); // referral earnings usually
        
        const totalEarnings = investmentProfits + referralBonuses;


        console.log(`📊 Dashboard summary for user ${req.user.email} (ID: ${req.user.id})`);

        // Recent 10 with frontend-compatible keys
        const recent = txs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(t => {
                let metaObj = {};
                try {
                    metaObj = typeof t.meta === 'string' ? JSON.parse(t.meta) : (t.meta || {});
                } catch (e) {
                    console.error("Failed to parse meta for txn", t.id, t.meta);
                }
                return {
                    ...t,
                    created_at: t.createdAt,
                    updated_at: t.updatedAt,
                    meta: metaObj
                };
            });

        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, Number(req.user.id))).limit(1);

        res.json({
            wallet: profile?.mainWallet || "0.00",
            profit_wallet: profile?.profitWallet || "0.00",
            total_deposits: deposits.toFixed(2),
            total_withdrawals: withdrawals.toFixed(2),
            total_investments: investmentsTotal.toFixed(2),
            total_earnings: totalEarnings.toFixed(2),
            recent
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};
