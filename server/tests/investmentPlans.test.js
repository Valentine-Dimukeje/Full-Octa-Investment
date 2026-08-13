import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateInvestmentPayout,
  hasMatured,
  isLinkedToModernInvestment,
} from "../utils/investmentPlans.js";

test("normal Amateur investment pays principal plus 10% profit", () => {
  assert.deepEqual(calculateInvestmentPayout("1000.00", "Amateur Plan"), {
    principal: "1000.00",
    profit: "100.00",
    totalPayout: "1100.00",
    rate: "0.10",
    intervalHours: 24,
  });
});

test("Diamond investment pays principal plus 30% profit", () => {
  const payout = calculateInvestmentPayout("10000.00", "Diamond Plan");
  assert.equal(payout.profit, "3000.00");
  assert.equal(payout.totalPayout, "13000.00");
});

test("Star investment pays principal plus 50% profit", () => {
  const payout = calculateInvestmentPayout("20000.00", "Star Plan");
  assert.equal(payout.profit, "10000.00");
  assert.equal(payout.totalPayout, "30000.00");
});

test("maturity helper uses configured interval", () => {
  const createdAt = new Date("2026-08-10T00:00:00.000Z");
  assert.equal(hasMatured(createdAt, "Diamond Plan", new Date("2026-08-12T23:59:59.000Z")), false);
  assert.equal(hasMatured(createdAt, "Diamond Plan", new Date("2026-08-13T00:00:00.000Z")), true);
});

test("modern investment ledger transaction is linked and not eligible for legacy processing", () => {
  const createdAt = new Date("2026-08-10T00:00:00.000Z");
  const modernInvestment = {
    id: 77,
    userId: 5,
    plan: "Diamond Plan",
    amount: "10000.00",
    createdAt,
  };

  assert.equal(
    isLinkedToModernInvestment(
      {
        id: 88,
        userId: 5,
        type: "investment",
        status: "active",
        amount: "10000.00",
        createdAt,
        meta: JSON.stringify({ plan: "Diamond Plan", investmentId: 77, ledgerOnly: true }),
      },
      [modernInvestment]
    ),
    true
  );
});

const simulateAtomicMaturity = async (state) => {
  if (state.investment.status !== "Active") return false;
  state.investment.status = "Completed";
  const payout = calculateInvestmentPayout(state.investment.amount, state.investment.plan);
  state.wallet += Number(payout.totalPayout);
  state.payoutTransactions += 1;
  return true;
};

test("duplicate maturity request credits wallet once", async () => {
  const state = { investment: { amount: "1000.00", plan: "Amateur Plan", status: "Active" }, wallet: 0, payoutTransactions: 0 };

  assert.equal(await simulateAtomicMaturity(state), true);
  assert.equal(await simulateAtomicMaturity(state), false);
  assert.equal(state.wallet, 1100);
  assert.equal(state.payoutTransactions, 1);
});

test("concurrent maturity requests produce one completed investment and payout", async () => {
  const state = { investment: { amount: "10000.00", plan: "Diamond Plan", status: "Active" }, wallet: 0, payoutTransactions: 0 };
  const results = await Promise.all([simulateAtomicMaturity(state), simulateAtomicMaturity(state)]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(state.investment.status, "Completed");
  assert.equal(state.wallet, 13000);
  assert.equal(state.payoutTransactions, 1);
});

test("dashboard projection de-dupes modern investment transaction", () => {
  const investments = [{ id: 1, userId: 9, plan: "Diamond Plan", amount: "10000.00", createdAt: new Date("2026-08-10T00:00:00.000Z") }];
  const transactions = [{ id: 2, userId: 9, amount: "10000.00", createdAt: new Date("2026-08-10T00:00:01.000Z"), meta: JSON.stringify({ plan: "Diamond Plan" }) }];
  const legacy = transactions.filter((tx) => !isLinkedToModernInvestment(tx, investments));
  const projected = investments.reduce((sum, inv) => sum + Number(calculateInvestmentPayout(inv.amount, inv.plan).profit), 0) + legacy.reduce((sum, tx) => sum + Number(calculateInvestmentPayout(tx.amount, "Diamond Plan").profit), 0);

  assert.equal(legacy.length, 0);
  assert.equal(projected, 3000);
});

test("standalone legacy investment remains eligible", () => {
  const legacyTx = { id: 4, userId: 11, amount: "5000.00", createdAt: new Date("2026-08-10T00:00:00.000Z"), meta: JSON.stringify({ plan: "Exclusive Plan" }) };
  assert.equal(isLinkedToModernInvestment(legacyTx, []), false);
  assert.equal(calculateInvestmentPayout(legacyTx.amount, "Exclusive Plan").totalPayout, "6000.00");
});
