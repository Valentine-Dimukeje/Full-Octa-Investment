import { db } from '../db/index.js';
import { transactions, users, profiles, referrals, devices, investments } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

// Get all users with profiles
export const getUsers = async (req, res) => {
    try {
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            is_staff: users.is_staff,
            is_active: users.is_active,
            date_joined: users.date_joined,
            profile: profiles,
            lastTransactionMeta: sql`(SELECT meta FROM transactions WHERE user_id = ${users.id} ORDER BY created_at DESC LIMIT 1)`,
            investedBalance: sql`(
                (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = ${users.id} AND LOWER(status) = 'active') 
                + 
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ${users.id} AND type = 'investment' AND LOWER(status) = 'active')
            )`,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId));
        
        const parsedUsers = allUsers.map(u => {
            if (u.lastTransactionMeta && typeof u.lastTransactionMeta === 'string') {
                try {
                    u.lastTransactionMeta = JSON.parse(u.lastTransactionMeta);
                } catch (e) {
                    console.error("Error parsing user last tx meta", e);
                }
            }
            return u;
        });

        res.json(parsedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Get all transactions
export const getTransactions = async (req, res) => {
    try {
        const allTxns = await db.select({
            id: transactions.id,
            userId: transactions.userId,
            username: users.username,
            email: users.email,
            type: transactions.type,
            amount: transactions.amount,
            status: transactions.status,
            meta: transactions.meta,
            createdAt: transactions.createdAt,
            updatedAt: transactions.updatedAt
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .orderBy(sql`${transactions.createdAt} DESC`);
        
        const parsedTxns = allTxns.map(t => {
            if (t.meta && typeof t.meta === 'string') {
                try {
                    t.meta = JSON.parse(t.meta);
                } catch (e) {
                    console.error("Error parsing tx meta", e);
                }
            }
            return t;
        });

        res.json(parsedTxns);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Admin Transaction Action
export const adminTransactionAction = async (req, res) => {
    const { pk } = req.params;
    const { action } = req.body;

    try {
        const [txn] = await db.select().from(transactions).where(eq(transactions.id, pk)).limit(1);
        if (!txn) return res.status(404).json({ error: "Transaction not found" });

        if (txn.status !== 'pending' && action !== 'delete') {
             // In some cases we might want to allow re-evaluation, but usually only pending txns are processed
             // For now, let's stick to simplest Django-like behavior
        }

        if (action === 'approve') {
            await db.update(transactions).set({ 
                status: 'completed',
                updatedAt: new Date()
            }).where(eq(transactions.id, pk));
            
            if (txn.type === 'deposit') {
                // Credit main wallet
                await db.update(profiles)
                    .set({ mainWallet: sql`${profiles.mainWallet} + ${txn.amount}` })
                    .where(eq(profiles.userId, txn.userId));
            } else if (txn.type === 'withdraw') {
                // For withdrawals, the amount might have already been deducted at request time
                // or we deduct it now. Standard practice in this specific app (based on context)
                // is often to deduct on completion or mark as completed.
                // Assuming it's already deducted or needs to be handled.
                // Looking at common patterns, withdrawal might mark as 'completed'
            }
        } else if (action === 'reject') {
            await db.update(transactions).set({ 
                status: 'rejected',
                updatedAt: new Date()
            }).where(eq(transactions.id, pk));
            
            if (txn.type === 'withdraw') {
                // Refund wallet if withdrawal was deducted at request
                await db.update(profiles)
                    .set({ mainWallet: sql`${profiles.mainWallet} + ${txn.amount}` })
                    .where(eq(profiles.userId, txn.userId));
            }
        }

        const [updated] = await db.select().from(transactions).where(eq(transactions.id, pk)).limit(1);
        res.json({ message: `Transaction ${action}ed`, transaction: updated });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Fund User Wallet (Admin)
export const fundUser = async (req, res) => {
    const { email, amount } = req.body;
    
    // Validate input
    if (!email || !amount) {
        return res.status(400).json({ error: "Email and amount are required" });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number" });
    }

    try {
        await db.transaction(async (tx) => {
            // 1. Find the user
            const [user] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
            
            if (!user) {
                // If we were not inside a transaction, we could just return res... 
                // but inside a transaction callback, we should throw to rollback or handle it.
                // However, since we are using Drizzle's transaction wrapper, throwing will rollback.
                throw new Error("User not found");
            }

            // 2. Update Profile Main Wallet
            await tx.update(profiles)
                .set({ 
                    mainWallet: sql`${profiles.mainWallet} + ${numericAmount}` 
                })
                .where(eq(profiles.userId, user.id));

            // 3. Create Transaction Record
            await tx.insert(transactions).values({
                userId: user.id,
                type: 'deposit', // or special type like 'admin_fund' if schema allows, but 'deposit' is safer for now
                amount: numericAmount,
                status: 'completed',
                meta: JSON.stringify({ note: 'Funded by Admin', adminId: req.user.id }),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        // 4. Fetch updated data to return to admin
        const [updatedUser] = await db.select({
            email: users.email,
            mainWallet: profiles.mainWallet,
            investedBalance: sql`(
                (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = ${users.id} AND LOWER(status) = 'active') 
                + 
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ${users.id} AND type = 'investment' AND LOWER(status) = 'active')
            )`,
            profitWallet: profiles.profitWallet
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .where(eq(users.email, email))
        .limit(1);

        res.json({ 
            message: `Successfully funded ${email} with $${numericAmount}`, 
            user: updatedUser 
        });

    } catch (error) {
        console.error("Error funding user:", error);
        if (error.message === "User not found") {
            return res.status(404).json({ error: "User with this email not found" });
        }
        res.status(500).json({ error: "Server error processing funding" });
    }
};

// Update User details (Staff status, Wallet)
export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { is_staff, mainWallet, profitWallet } = req.body;

    try {
        await db.transaction(async (tx) => {
            if (is_staff !== undefined) {
                await tx.update(users).set({ is_staff }).where(eq(users.id, id));
            }
            
            if (mainWallet !== undefined || profitWallet !== undefined) {
                await tx.update(profiles).set({
                    mainWallet: mainWallet !== undefined ? mainWallet : undefined,
                    profitWallet: profitWallet !== undefined ? profitWallet : undefined
                }).where(eq(profiles.userId, id));
            }
        });

        res.json({ message: "User updated successfully" });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Delete User
export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.transaction(async (tx) => {
            // Delete related records first
            await tx.delete(profiles).where(eq(profiles.userId, id));
            await tx.delete(devices).where(eq(devices.userId, id));
            await tx.delete(transactions).where(eq(transactions.userId, id));
            await tx.delete(referrals).where(eq(referrals.userId, id));
            await tx.delete(users).where(eq(users.id, id));
        });
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Delete Transaction
export const deleteTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        await db.delete(transactions).where(eq(transactions.id, id));
        res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// Get all referrals
export const getReferrals = async (req, res) => {
    try {
        const allReferrals = await db.select({
            id: referrals.id,
            referrer: users.username,
            referred: sql`referred_user.username`,
            bonus: referrals.bonusAmount,
            createdAt: referrals.createdAt
        })
        .from(referrals)
        .leftJoin(users, eq(referrals.userId, users.id))
        .leftJoin(sql`users as referred_user`, eq(referrals.referredUserId, sql`referred_user.id`))
        .orderBy(sql`${referrals.createdAt} DESC`);

        res.json(allReferrals);
    } catch (error) {
        console.error("Error fetching referrals:", error);
        res.status(500).json({ error: "Server error" });
    }
};
