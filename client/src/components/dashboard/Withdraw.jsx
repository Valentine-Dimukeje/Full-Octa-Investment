import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { WalletContext } from "./walletContext";
import "../styles/withdraw.css";
import { authFetch } from '../utils/authFetch';
import { useNotification } from '../../hooks/useNotification';

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
  
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  const { walletBalance, refreshWallet } = useContext(WalletContext);
  const { showNotification } = useNotification();

  useEffect(() => {
    refreshWallet();
    fetchHistory();
  }, [refreshWallet]);

  const fetchHistory = async () => {
      try {
          const res = await authFetch("/api/transactions");
          if (res.ok) {
              const data = await res.json();
              setHistory(data.filter(t => t.type === 'withdraw'));
          }
      } catch (err) {
          console.error("Failed to load history", err);
      } finally {
          setHistoryLoading(false);
      }
  };

  const currentBalance = Number(walletBalance) || 0;

  const charge = amount ? parseFloat(amount) * 0.00 : 0;
  const total = amount ? parseFloat(amount) - charge : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate amount is a positive number > 0
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showNotification("Please enter a valid amount greater than $0", "error");
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

          <label>Amount (USD):</label>
          <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" required />

          <label>Destination (Wallet or Bank details):</label>
          <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter destination" required />

          <button type="submit" className="primary-btn">Request Withdrawal</button>
        </form>

        <div className="review-box">
          <div className="review-item">
            <span>Charge</span>
            <span>${charge.toFixed(2)}</span>
          </div>
          <div className="review-item total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="history-section">
        <h3>Withdrawal History</h3>
        {historyLoading ? (
          <div>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={4}>No withdrawals</td></tr>
              ) : (
                history.map(h => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td>${parseFloat(h.amount).toFixed(2)}</td>
                    <td>{h.status}</td>
                    <td>{new Date(h.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

export default Withdraw;
