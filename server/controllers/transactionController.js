import { db } from "../db/index.js";
import { transactions, investments, profiles } from "../db/schema.js";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  calculateInvestmentPayout,
  getPayoutDate,
  hasMatured,
  isKnownInvestmentPlan,
  isLinkedToModernInvestment,
  parseTransactionMeta,
} from "../utils/investmentPlans.js";
import { mailAdmins } from "../utils/email.js";

// Helper: Check for Matured Investments
export const checkInvestmentMaturity = async (userId) => {
  const userInvestments = await db
    .select()
    .from(investments)
    .where(eq(investments.userId, userId));

  const activeInvestments = userInvestments.filter(
    (investment) => investment.status === "Active"
  );

  for (const inv of activeInvestments) {
    if (!hasMatured(inv.createdAt, inv.plan)) continue;

    const payout = calculateInvestmentPayout(inv.amount, inv.plan);
    if (!payout) continue;

    await db.transaction(async (tx) => {
      const [completedInvestment] = await tx
        .update(investments)
        .set({
          status: "Completed",
          earnings: payout.profit,
          updatedAt: new Date(),
        })
        .where(and(eq(investments.id, inv.id), eq(investments.status, "Active")))
        .returning({ id: investments.id });

      if (!completedInvestment) return;

      await tx
        .update(profiles)
        .set({ mainWallet: sql`${profiles.mainWallet} + ${payout.totalPayout}` })
        .where(eq(profiles.userId, userId));

      await tx.insert(transactions).values({
        userId,
        type: "payout",
        amount: payout.totalPayout,
        status: "completed",
        meta: JSON.stringify({
          source: "Investment Maturity",
          investmentId: inv.id,
          plan: inv.plan,
          principal: payout.principal,
          profit: payout.profit,
          rate: payout.rate,
        }),
      });
    });
  }

  const legacyInvestmentTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "investment"),
        eq(transactions.status, "active")
      )
    );

  const standaloneLegacyInvestments = legacyInvestmentTransactions.filter(
    (txInv) => !isLinkedToModernInvestment(txInv, userInvestments)
  );

  for (const txInv of standaloneLegacyInvestments) {
    const meta = parseTransactionMeta(txInv.meta);
    const plan = meta.plan || "Investment";

    if (!hasMatured(txInv.createdAt, plan)) continue;

    const payout = calculateInvestmentPayout(txInv.amount, plan);
    if (!payout) continue;

    await db.transaction(async (tx) => {
      const [completedLegacyInvestment] = await tx
        .update(transactions)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(and(eq(transactions.id, txInv.id), eq(transactions.status, "active")))
        .returning({ id: transactions.id });

      if (!completedLegacyInvestment) return;

      await tx
        .update(profiles)
        .set({ mainWallet: sql`${profiles.mainWallet} + ${payout.totalPayout}` })
        .where(eq(profiles.userId, userId));

      await tx.insert(transactions).values({
        userId,
        type: "payout",
        amount: payout.totalPayout,
        status: "completed",
        meta: JSON.stringify({
          source: "Legacy Investment Maturity",
          originalTxId: txInv.id,
          plan,
          principal: payout.principal,
          profit: payout.profit,
          rate: payout.rate,
        }),
      });
    });
  }
};

// Get User Transactions
export const getTransactions = async (req, res) => {
  try {
    const txs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, Number(req.user.id)))
      .orderBy(desc(transactions.createdAt));

    const formatted = txs.map((t) => ({
      ...t,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
      meta: typeof t.meta === "string" ? JSON.parse(t.meta) : t.meta || {},
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
    const [txn] = await db
      .insert(transactions)
      .values({
        userId: req.user.id,
        type: "deposit",
        amount: parseFloat(amount),
        status: "pending",
        meta: { method, tx_id },
      })
      .returning();

    // Return final balance
    const [newProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.user.id))
      .limit(1);
    res.status(201).json({
      message: "Deposit initiated. Please complete payment.",
      transaction: txn,
      balance: newProfile?.mainWallet,
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
    if (val < 1) {
      return res.status(400).json({ error: "Minimum withdrawal amount is $1" });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, Number(req.user.id)))
      .limit(1);

    // Initial balance check (use parseFloat for reliable decimal comparison)
    const currentBalance = parseFloat(profile?.mainWallet || '0');
    if (!profile || currentBalance < val) {
      // console.log(`❌ Withdrawal failed for ${req.user.email}. Balance: ${currentBalance}, Requested: ${val}`);
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Use transaction to safely deduct and create withdrawal record
    let txnId;
    try {
      await db.transaction(async (tx) => {
        // Re-fetch balance inside transaction to prevent race conditions
        const [freshProfile] = await tx.select().from(profiles)
            .where(eq(profiles.userId, Number(req.user.id))).limit(1);
        
        const freshBalance = parseFloat(freshProfile?.mainWallet || '0');
        if (freshBalance < val) {
          throw new Error('Insufficient balance');
        }

        // Deduct from wallet
        await tx
          .update(profiles)
          .set({ mainWallet: sql`${profiles.mainWallet} - ${val}` })
          .where(eq(profiles.userId, Number(req.user.id)));

        // Create transaction record
        const [txn] = await tx
          .insert(transactions)
          .values({
            userId: req.user.id,
            type: "withdraw",
            amount: val,
            status: "pending",
            meta: JSON.stringify({ method, destination }),
          })
          .returning();
        
        txnId = txn.id;
      });
    } catch (txError) {
      if (txError.message === 'Insufficient balance') {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      throw txError;
    }

    // Notify Admin
    await mailAdmins(
      `New Withdrawal Request from ${req.user.email}`,
      `User ${req.user.email} has requested a withdrawal of $${val}.\nMethod: ${method}\nDestination: ${destination}`
    );

    res.status(201).json({
      message: "Withdrawal request submitted. Awaiting admin approval.",
      transaction: txnId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Invest
export const invest = async (req, res) => {
  const { amount, plan } = req.body;
  if (!amount || !plan)
    return res.status(400).json({ error: "Amount and plan are required" });

  try {
    const val = Number(calculateInvestmentPayout(amount, plan)?.principal);
    if (!Number.isFinite(val) || val <= 0 || !isKnownInvestmentPlan(plan)) {
      return res.status(400).json({ error: "Invalid amount or investment plan" });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.user.id))
      .limit(1);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Use parseFloat for reliable decimal comparison
    const currentBalance = parseFloat(profile?.mainWallet || '0');
    if (currentBalance < val) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    // Deduct balance from Main Wallet
    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({ mainWallet: sql`${profiles.mainWallet} - ${val}` })
        .where(eq(profiles.id, profile.id));

      // Create authoritative Investment record first.
      const [investment] = await tx.insert(investments).values({
        userId: req.user.id,
        plan,
        amount: val.toFixed(2),
        status: "Active",
      }).returning({ id: investments.id });

      // Create Transaction record for ledger/history only. It must not drive maturity payouts.
      await tx.insert(transactions).values({
        userId: req.user.id,
        type: "investment",
        amount: val.toFixed(2),
        status: "active",
        meta: JSON.stringify({ plan, investmentId: investment.id, ledgerOnly: true }),
      });
    });

    const [newProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.user.id))
      .limit(1);

    res.status(201).json({
      message: "Investment successful",
      new_balance: newProfile?.mainWallet,
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
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, Number(req.user.id)))
      .orderBy(desc(investments.createdAt));

    // Fetch Legacy Active Investments from transactions
    const legacyInvestments = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, Number(req.user.id)),
          eq(transactions.type, "investment"),
          eq(transactions.status, "active")
        )
      );

    // Map legacy to same structure if not already in investments table (simple de-dupe by plan/amount/time might be needed if migration happened, but assuming simple separation for now)
    // Check if legacy ones are already in userInvestments (simplistic check to avoid duplicates if system is mixed)
    // Since we know the issue is they are NOT in investments table, we add them.
    const formattedLegacy = legacyInvestments.map((tx) => {
      const meta = parseTransactionMeta(tx.meta);
      const plan = meta.plan || "Investment";

      return {
        id: `legacy-${tx.id}`,
        userId: tx.userId,
        meta: tx.meta,
        plan: plan,
        amount: tx.amount,
        earnings: "0.00", // Will be updated by projection logic below
        status: "Active",
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        isLegacy: true,
      };
    });

    const allInvestments = [
      ...userInvestments,
      ...formattedLegacy.filter((tx) => !isLinkedToModernInvestment(tx, userInvestments)),
    ];

    const updatedInvestments = [];

    // Lazy Update Logic for Active Investments
    for (const inv of allInvestments) {
      if (inv.status === "Active" || inv.status === "active") {
        // Handle case sensitivity
        const payout = calculateInvestmentPayout(inv.amount, inv.plan);
        if (payout) {
          // Update: User wants to see the projected earnings (Total Profit) instead of 0.00
          // Projected Profit = Amount * Rate
          const projectedProfit = payout.profit;

          // We override the earnings field for display purposes on the frontend
          // The database still holds the 'realized' earnings (which is 0 until maturity usually)
          // But for the user UI, we show what they WILL get.
          inv.earnings = projectedProfit;

          // Calculate Payout Date
          const created = new Date(inv.createdAt || inv.created_at);
          const payoutTime = new Date(
            getPayoutDate(inv.createdAt || inv.created_at, inv.plan).getTime()
          );
          inv.payoutDate = payoutTime.toISOString();

          // Server side maturity check logic...
        }
      } else if (inv.status === "Completed") {
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

    // console.log(`Starting dashboard summary for user ${userId}`);

    // Run maturity check (Must be sequential as it updates data we might read)
    await checkInvestmentMaturity(userId);

    // Execute all independent queries in parallel
    const [
      depositResResult,
      withdrawResResult,
      investResResult,
      invProfitResResult,
      refBonusResResult,
      activeInvestments,
      userInvestmentsForLegacy,
      legacyActiveInvestmentsResult,
      recentTxs,
      profileResult,
    ] = await Promise.all([
      // 1. Total Deposits
      db
        .select({ total: sql`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "deposit"),
            sql`${transactions.status} IN ('completed', 'approved')`
          )
        ),

      // 2. Total Withdrawals
      db
        .select({ total: sql`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "withdraw"),
            sql`${transactions.status} IN ('completed', 'approved')`
          )
        ),

      // 3. Total Investments
      db
        .select({ total: sql`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "investment"),
            sql`${transactions.status} IN ('active', 'completed')`
          )
        ),

      // 4. Total Profit from Completed Investments
      db
        .select({ total: sql`COALESCE(SUM(${investments.earnings}), 0)` })
        .from(investments)
        .where(
          and(
            eq(investments.userId, userId),
            eq(investments.status, "Completed")
          )
        ),

      // 5. Total Referral Bonuses
      db
        .select({ total: sql`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "profit"),
            sql`${transactions.status} IN ('completed', 'approved')`
          )
        ),

      // 6. Active Investments (for projection)
      db
        .select()
        .from(investments)
        .where(
          and(eq(investments.userId, userId), eq(investments.status, "Active"))
        ),

      // 7. All Investments (for legacy de-duplication)
      db
        .select()
        .from(investments)
        .where(eq(investments.userId, userId)),

      // 8. Legacy Active Investments
      db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "investment"),
            eq(transactions.status, "active")
          )
        ),

      // 9. Recent Transactions
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
        .limit(10),

      // 10. User Profile
      db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    ]);

    const depositRes = depositResResult[0];
    const withdrawRes = withdrawResResult[0];
    const investRes = investResResult[0];
    const invProfitRes = invProfitResResult[0];
    const refBonusRes = refBonusResResult[0];
    const profile = profileResult[0];

    const legacyActiveInvestments = legacyActiveInvestmentsResult.filter(
      (tx) => !isLinkedToModernInvestment(tx, userInvestmentsForLegacy)
    );

    const activeProjectedEarnings = activeInvestments.reduce((sum, inv) => {
      const payout = calculateInvestmentPayout(inv.amount, inv.plan);
      return sum + parseFloat(payout?.profit || 0);
    }, 0);

    const legacyProjectedEarnings = legacyActiveInvestments.reduce(
      (sum, tx) => {
        const meta = parseTransactionMeta(tx.meta);
        const plan = meta.plan || "Investment";
        const payout = calculateInvestmentPayout(tx.amount, plan);
        return sum + parseFloat(payout?.profit || 0);
      },
      0
    );

    const totalEarnings =
      parseFloat(invProfitRes?.total || 0) +
      parseFloat(refBonusRes?.total || 0) +
      activeProjectedEarnings +
      legacyProjectedEarnings;

    const recentFormatted = recentTxs.map((t) => {
      let metaObj = {};
      try {
        metaObj =
          typeof t.meta === "string" ? JSON.parse(t.meta) : t.meta || {};
      } catch (e) {
        console.error("Failed to parse meta for txn", t.id);
      }
      return {
        ...t,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        meta: metaObj,
      };
    });

    const responseData = {
      wallet: profile?.mainWallet || "0.00",
      profit_wallet: profile?.profitWallet || "0.00",
      total_deposits: parseFloat(depositRes?.total || 0).toFixed(2),
      total_withdrawals: parseFloat(withdrawRes?.total || 0).toFixed(2),
      total_investments: parseFloat(investRes?.total || 0).toFixed(2),
      total_earnings: totalEarnings.toFixed(2),
      recent: recentFormatted,
    };

    // console.log(`Dashboard data generated for user ${userId}:`, responseData);

    res.json(responseData);
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    res.status(500).json({ error: "Server error loading dashboard" });
  }
};
