export const INVESTMENT_PLANS = Object.freeze({
  "Amateur Plan": Object.freeze({ intervalHours: 24, rate: "0.10" }),
  "Exclusive Plan": Object.freeze({ intervalHours: 48, rate: "0.20" }),
  "Diamond Plan": Object.freeze({ intervalHours: 72, rate: "0.30" }),
  "Star Plan": Object.freeze({ intervalHours: 96, rate: "0.50" }),
});

const CENTS_PER_DOLLAR = 100n;

export const getInvestmentPlan = (planName) => INVESTMENT_PLANS[planName];

export const isKnownInvestmentPlan = (planName) => Boolean(getInvestmentPlan(planName));

export const parseTransactionMeta = (meta) => {
  if (!meta) return {};
  if (typeof meta === "object") return meta;
  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
};

const decimalStringToCents = (value) => {
  const normalized = String(value ?? "0").trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid monetary amount: ${value}`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const cents = (fraction + "00").slice(0, 2);
  return BigInt(whole) * CENTS_PER_DOLLAR + BigInt(cents);
};

const rateStringToBasisPoints = (rate) => {
  const normalized = String(rate ?? "0").trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid investment rate: ${rate}`);
  }

  const [whole, fraction = ""] = normalized.split(".");
  const fourDecimals = (fraction + "0000").slice(0, 4);
  return BigInt(whole) * 10000n + BigInt(fourDecimals);
};

const centsToMoneyString = (cents) => {
  const whole = cents / CENTS_PER_DOLLAR;
  const fraction = cents % CENTS_PER_DOLLAR;
  return `${whole}.${fraction.toString().padStart(2, "0")}`;
};

export const calculateInvestmentPayout = (principal, planName) => {
  const config = getInvestmentPlan(planName);
  if (!config) return null;

  const principalCents = decimalStringToCents(principal);
  const rateBasisPoints = rateStringToBasisPoints(config.rate);
  const profitCents = (principalCents * rateBasisPoints) / 10000n;
  const payoutCents = principalCents + profitCents;

  return {
    principal: centsToMoneyString(principalCents),
    profit: centsToMoneyString(profitCents),
    totalPayout: centsToMoneyString(payoutCents),
    rate: config.rate,
    intervalHours: config.intervalHours,
  };
};

export const hasMatured = (createdAt, planName, now = new Date()) => {
  const config = getInvestmentPlan(planName);
  if (!config) return false;

  const created = new Date(createdAt);
  const maturityTime = created.getTime() + config.intervalHours * 60 * 60 * 1000;
  return now.getTime() >= maturityTime;
};

export const getPayoutDate = (createdAt, planName) => {
  const config = getInvestmentPlan(planName);
  if (!config) return null;

  const created = new Date(createdAt);
  return new Date(created.getTime() + config.intervalHours * 60 * 60 * 1000);
};

export const isLinkedToModernInvestment = (transaction, userInvestments = []) => {
  const meta = parseTransactionMeta(transaction.meta);
  if (meta.ledgerOnly === true || meta.investmentId) return true;

  const plan = meta.plan || "Investment";
  const txCreatedAt = new Date(transaction.createdAt).getTime();

  return userInvestments.some((investment) => {
    if (investment.userId !== transaction.userId) return false;
    if (investment.plan !== plan) return false;
    if (String(investment.amount) !== String(transaction.amount)) return false;

    const invCreatedAt = new Date(investment.createdAt).getTime();
    return Math.abs(invCreatedAt - txCreatedAt) <= 5 * 60 * 1000;
  });
};
