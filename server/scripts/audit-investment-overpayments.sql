-- Read-only audit for potentially duplicated investment maturity payouts.
-- This query does not modify data. It reports modern investments whose payout
-- transactions exceed the authoritative configured payout for one investment.
WITH plan_config(plan, rate) AS (
  VALUES
    ('Amateur Plan', 0.10::numeric),
    ('Exclusive Plan', 0.20::numeric),
    ('Diamond Plan', 0.30::numeric),
    ('Star Plan', 0.50::numeric)
), investment_expected AS (
  SELECT
    i.id AS investment_id,
    i.user_id,
    i.plan,
    i.amount::numeric(12,2) AS principal,
    i.created_at,
    pc.rate AS configured_rate,
    ROUND(i.amount::numeric * pc.rate, 2) AS expected_profit,
    ROUND(i.amount::numeric + (i.amount::numeric * pc.rate), 2) AS expected_payout
  FROM investments i
  JOIN plan_config pc ON pc.plan = i.plan
), matched_payouts AS (
  SELECT
    ie.investment_id,
    p.id AS payout_transaction_id,
    p.amount::numeric(12,2) AS payout_amount,
    p.created_at AS payout_created_at,
    p.meta AS payout_meta
  FROM investment_expected ie
  JOIN transactions p
    ON p.user_id = ie.user_id
   AND p.type = 'payout'
   AND p.status IN ('completed', 'approved')
   AND (
     (p.meta::jsonb ? 'investmentId' AND (p.meta::jsonb ->> 'investmentId')::int = ie.investment_id)
     OR (
       NOT (p.meta::jsonb ? 'investmentId')
       AND p.meta::jsonb ->> 'plan' = ie.plan
       AND ROUND((p.meta::jsonb ->> 'principal')::numeric, 2) = ie.principal
       AND p.created_at >= ie.created_at
     )
   )
), payout_totals AS (
  SELECT
    investment_id,
    COUNT(*) AS actual_payout_transactions,
    COALESCE(SUM(payout_amount), 0)::numeric(12,2) AS actual_payout_total,
    jsonb_agg(
      jsonb_build_object(
        'transaction_id', payout_transaction_id,
        'amount', payout_amount,
        'created_at', payout_created_at,
        'meta', payout_meta
      ) ORDER BY payout_created_at
    ) AS payout_evidence
  FROM matched_payouts
  GROUP BY investment_id
)
SELECT
  ie.investment_id,
  ie.user_id,
  ie.plan,
  ie.principal,
  ie.created_at,
  ie.configured_rate,
  ie.expected_profit,
  ie.expected_payout,
  COALESCE(pt.actual_payout_transactions, 0) AS actual_payout_transactions,
  COALESCE(pt.actual_payout_total, 0)::numeric(12,2) AS actual_payout_total,
  GREATEST(COALESCE(pt.actual_payout_total, 0) - ie.expected_payout, 0)::numeric(12,2) AS overpayment_amount,
  pt.payout_evidence
FROM investment_expected ie
LEFT JOIN payout_totals pt ON pt.investment_id = ie.investment_id
WHERE COALESCE(pt.actual_payout_total, 0) > ie.expected_payout
ORDER BY overpayment_amount DESC, ie.created_at DESC;
