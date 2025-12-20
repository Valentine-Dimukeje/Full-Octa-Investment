// Mock authentication data for development
export const MOCK_USER = {
  username: "testuser",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  phone: "+1234567890",
  country: "United States",
  flag: "🇺🇸",
  main_wallet: 5000,
  profit_wallet: 1200,
  wallet_balance: 6200,
  notifications: {
    email: true,
    sms: false,
    system: true
  },
  devices: [
    {
      id: 1,
      device_name: "Chrome Browser",
      ip_address: "192.168.1.1",
      last_active: new Date().toISOString()
    }
  ]
};

export const MOCK_DASHBOARD_DATA = {
  wallet: 5000,
  profit_wallet: 1200,
  total_deposits: 10000,
  total_withdrawals: 3000,
  total_investments: 5000,
  total_earnings: 1200,
  recent: [
    {
      id: 1,
      type: "deposit",
      amount: "500.00",
      status: "completed",
      meta: { gateway: "Bitcoin" },
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      type: "investment",
      amount: "1000.00",
      status: "active",
      meta: { plan: "Diamond Plan" },
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      type: "withdrawal",
      amount: "300.00",
      status: "pending",
      meta: { method: "USDT" },
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ]
};

export const MOCK_INVESTMENTS = [
  {
    id: 1,
    plan: "Amateur Plan",
    amount: "500.00",
    earnings: "25.00",
    status: "Active",
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    plan: "Diamond Plan",
    amount: "5000.00",
    earnings: "600.00",
    status: "Active",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 3,
    plan: "Exclusive Plan",
    amount: "2000.00",
    earnings: "160.00",
    status: "Completed",
    created_at: new Date(Date.now() - 86400000 * 30).toISOString()
  }
];

export const MOCK_REFERRALS = {
  referrals: [
    {
      name: "John Doe",
      email: "john@example.com",
      joined: new Date().toLocaleDateString(),
      status: "Active",
      earnings: "50.00"
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      joined: new Date(Date.now() - 86400000 * 7).toLocaleDateString(),
      status: "Active",
      earnings: "75.00"
    }
  ]
};