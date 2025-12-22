// dashboard/walletContext.js
import React, { createContext, useCallback, useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [profitBalance, setProfitBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [totalInvestments, setTotalInvestments] = useState(0);

  const refreshWallet = useCallback(async () => {
    try {
      const res = await authFetch("/api/dashboard-summary/");
      if (!res.ok) return;

      const data = await res.json();

      setWalletBalance(Number(data.wallet) || 0);
      setProfitBalance(Number(data.profit_wallet) || 0);
      setTotalEarnings(Number(data.total_earnings) || 0);
      setTotalDeposits(Number(data.total_deposits) || 0);
      setTotalWithdrawals(Number(data.total_withdrawals) || 0);
      setTotalInvestments(Number(data.total_investments) || 0);
    } catch (e) {
      console.error("Failed to refresh wallet", e);
    }
  }, []);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const totalBalance = walletBalance + profitBalance;

  return (
    <WalletContext.Provider
      value={{
        walletBalance,
        profitBalance,
        totalBalance,
        totalEarnings,
        totalDeposits,
        totalWithdrawals,
        totalInvestments,
        refreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
