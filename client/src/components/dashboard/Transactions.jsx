// src/pages/Transactions.jsx
import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch"; // we’ll use the helper we made


function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      const res = await authFetch("/api/transactions/");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      } else {
        alert("Failed to load transactions");
      }
      setLoading(false);
    }
    loadTransactions();
  }, []);

  if (loading) {
    return (
        <div style={{ padding: "20px", textAlign: "center" }}>
            <div className="flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading transactions...</p>
            </div>
        </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Your Transactions</h2>
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id}>
                <td>{txn.id}</td>
                <td>{txn.type}</td>
                <td>${txn.amount}</td>
                <td>{txn.status}</td>
                <td>{new Date(txn.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Transactions;
