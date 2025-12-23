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
          const res = await authFetch("/api/transactions"); // Fetches all, we filter client side for now or could use dedicated endpoint
          if (res.ok) {
              const data = await res.json();
              // Filter for withdrawals only
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

    if (parseFloat(amount) < 1) {
      showNotification("Minimum withdrawal amount is $1", "error");
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
              <label>Enter Amount (USD): <span style={{ fontSize: "12px", color: "#yellow" }}>(Min: $1)</span></label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min. $1"
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
                  <span>Charge (0%)</span>
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

          <button type="submit" className="primary-btn" disabled={!method || !amount || !walletAddress || parseFloat(amount) > currentBalance || parseFloat(amount) < 1}>
            Request Withdrawal »
          </button>
        </form>
      </div>

      {/* Withdrawal History Section */}
      <div className="withdraw-history mt-8" style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Withdrawal History</h3>
          <div className="table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                          <th style={{ padding: '12px' }}>Date</th>
                          <th style={{ padding: '12px' }}>Amount</th>
                          <th style={{ padding: '12px' }}>Method</th>
                          <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      {historyLoading ? (
                          <tr>
                              <td colSpan="4" style={{ padding: '24px', textAlign: 'center' }}>
                                  <div className="flex justify-center items-center">
                                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                      <span className="ml-2">Loading history...</span>
                                  </div>
                              </td>
                          </tr>
                      ) : history.length > 0 ? (
                          history.map(txn => (
                              <tr key={txn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '12px' }}>{new Date(txn.createdAt || txn.created_at).toLocaleDateString()}</td>
                                  <td style={{ padding: '12px' }}>${parseFloat(txn.amount).toFixed(2)}</td>
                                  <td style={{ padding: '12px' }}>
                                      {(() => {
                                          try {
                                              const m = typeof txn.meta === 'string' ? JSON.parse(txn.meta) : txn.meta;
                                              const meth = withdrawMethods.find(x => x.value === m?.method);
                                              return meth ? meth.label : (m?.method || '-');
                                          } catch { return '-'; }
                                      })()}
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                      <span style={{ 
                                          padding: '4px 8px', 
                                          borderRadius: '4px', 
                                          fontSize: '12px',
                                          background: txn.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                          color: txn.status === 'completed' ? '#34d399' : '#facc15'
                                      }}>
                                          {txn.status.toUpperCase()}
                                      </span>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>No withdrawals yet.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </motion.div>
  );
}

export default Withdraw;