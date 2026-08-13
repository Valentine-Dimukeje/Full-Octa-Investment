import { db } from "../db/index.js";
import { transactions, investments } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { calculateInvestmentPayout, parseTransactionMeta } from "../utils/investmentPlans.js";

const money = (value) => Number(value || 0).toFixed(2);

const audit = async () => {
  const allInvestments = await db.select().from(investments);
  const payoutTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "payout"),
        sql`${transactions.status} IN ('completed', 'approved')`
      )
    );

  const results = [];

  for (const investment of allInvestments) {
    const expected = calculateInvestmentPayout(investment.amount, investment.plan);
    if (!expected) continue;

    const matchingPayouts = payoutTransactions.filter((payout) => {
      if (payout.userId !== investment.userId) return false;

      const meta = parseTransactionMeta(payout.meta);
      if (Number(meta.investmentId) === investment.id) return true;

      return (
        !meta.investmentId &&
        meta.plan === investment.plan &&
        money(meta.principal) === money(investment.amount) &&
        new Date(payout.createdAt).getTime() >= new Date(investment.createdAt).getTime()
      );
    });

    const actualPayoutTotal = matchingPayouts.reduce(
      (sum, payout) => sum + Number(payout.amount || 0),
      0
    );
    const overpayment = actualPayoutTotal - Number(expected.totalPayout);

    if (overpayment > 0) {
      results.push({
        investmentId: investment.id,
        userId: investment.userId,
        plan: investment.plan,
        principal: expected.principal,
        createdAt: investment.createdAt,
        configuredRate: expected.rate,
        expectedProfit: expected.profit,
        expectedPayout: expected.totalPayout,
        actualPayoutTransactions: matchingPayouts.map((payout) => ({
          id: payout.id,
          amount: money(payout.amount),
          createdAt: payout.createdAt,
          meta: parseTransactionMeta(payout.meta),
        })),
        actualPayoutTotal: money(actualPayoutTotal),
        overpaymentAmount: money(overpayment),
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
};

audit()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Read-only investment overpayment audit failed:", error);
    process.exit(1);
  });
