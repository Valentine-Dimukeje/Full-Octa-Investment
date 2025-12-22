import React, { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { authFetch } from "../utils/authFetch";
import { useNotification } from "./NotificationProvider";  
import { WalletContext } from "./walletContext";
import "../styles/withdraw.css";

const withdrawMethods = [
  { value: "USDT_TRX", label: "USDT (TRC-20)" },
  { value: "BTC", label: "Bitcoin" },
  { value: "ETH", label: "Ethereum" },
  { value: "BANK", label: "Bank Transfer" },
];

function Withdraw() {
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  
  const { walletBalance, refreshWallet } = useContext(WalletContext);
  const { showNotification } = useNotification();

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  const currentBalance = Number(walletBalance) || 0;

  const charge = amount ? parseFloat(amount) * 0.06 : 0;
  const total = amount ? parseFloat(amount) - charge : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseFloat(amount) < 100) {
      showNotification("Minimum withdrawal amount is $100", "error");
      return;
    }

    try {
      const res = await authFetch("/api/withdraw/", {
        method: "POST",
        body: JSON.stringify({
          method,
          amount,
          destination: walletAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal request failed");

      showNotification("✅ Withdrawal request submitted. Awaiting admin approval.", "success");

      setAmount("");
      setWalletAddress("");
      setMethod("");
      await refreshWallet();
    } catch (err) {
      showNotification("❌ " + err.message, "error");
    }
  };

  return (
    <motion.div className="withdraw-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="withdraw-card">
        <h2>Withdraw Funds</h2>
        
        <div className="balance-info" style={{ marginBottom: "20px", padding: "15px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            <h3 style={{ margin: "5px 0 0", fontSize: "24px", color: "#fff" }}>${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>

        <form onSubmit={handleSubmit} className="withdraw-form">
          <label>Withdrawal Method:</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} required>
            <option value="">--Select Method--</option>
            {withdrawMethods.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {method && (
            <>
              <label>Enter Amount (USD): <span style={{ fontSize: "12px", color: "#yellow" }}>(Min: $100)</span></label>
              <input
                type="number"
                min="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min. $100"
              />

              <label>
                {method === "BANK"
                  ? "Bank Account Info:"
                  : `${withdrawMethods.find(m => m.value === method)?.label} Wallet Address:`}
              </label>
              <input
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={method === "BANK" ? "Bank name, Account No, Account name" : "Paste wallet address here"}
              />

              <motion.div className="review-box" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <h4>Review Summary</h4>
                <div className="review-item">
                  <span>Withdraw Amount</span>
                  <span>${parseFloat(amount || 0).toFixed(2)}</span>
                </div>
                <div className="review-item">
                  <span>Charge (6%)</span>
                  <span>${charge.toFixed(2)}</span>
                </div>
                <div className="review-item total">
                  <span>You'll Receive</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </motion.div>
             
              {parseFloat(amount) > currentBalance && (
                  <p style={{ color: "red", fontSize: "13px", marginTop: "10px" }}>Insufficient Funds</p>
              )}

            </>
          )}

          <button type="submit" className="primary-btn" disabled={!method || !amount || !walletAddress || parseFloat(amount) > currentBalance || parseFloat(amount) < 100}>
            Request Withdrawal »
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default Withdraw;
