import { API_BASE, DEV_MODE } from "./config";
import { 
  MOCK_USER, 
  MOCK_DASHBOARD_DATA, 
  MOCK_INVESTMENTS, 
  MOCK_REFERRALS 
} from "./mockAuth";

/**
 * Mock fetch for development mode
 */
function mockFetch(path) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let mockData = null;

      // Route mock responses based on path
      if (path.includes("/api/auth/me/")) {
        mockData = MOCK_USER;
      } else if (path.includes("/api/dashboard-summary/")) {
        mockData = MOCK_DASHBOARD_DATA;
      } else if (path.includes("/api/investments/")) {
        mockData = MOCK_INVESTMENTS;
      } else if (path.includes("/api/user/referrals/")) {
        mockData = MOCK_REFERRALS;
      } else if (path.includes("/api/auth/devices/")) {
        mockData = { devices: MOCK_USER.devices };
      } else if (path.includes("/api/deposit/")) {
        mockData = { success: true, message: "Deposit request submitted" };
      } else if (path.includes("/api/withdraw/")) {
        mockData = { success: true, message: "Withdrawal request submitted" };
      } else if (path.includes("/api/invest/")) {
        mockData = { success: true, message: "Investment created" };
      } else {
        mockData = { success: true };
      }

      resolve({
        ok: true,
        status: 200,
        json: async () => mockData,
        text: async () => JSON.stringify(mockData)
      });
    }, 500); // Simulate network delay
  });
}

/**
 * authFetch wraps fetch with JWT + credentials support
 * Automatically retries with refresh token if access expired
 * In DEV_MODE, returns mock data
 */
export async function authFetch(path, options = {}) {
  // If in development mode, return mock data
  if (DEV_MODE) {
    console.log("🔧 DEV MODE: Returning mock data for:", path);
    return mockFetch(path);
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  let access = localStorage.getItem("access");
  let refresh = localStorage.getItem("refresh");

  if (!access && !refresh) {
    throw new Error("No authentication tokens found");
  }

  const init = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    credentials: "include",
  };

  let res = await fetch(url, init);

  if (res.status === 401 && refresh) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        credentials: "include",
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        access = data.access;
        localStorage.setItem("access", access);

        const retryInit = {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${access}`,
          },
          credentials: "include",
        };

        res = await fetch(url, retryInit);
      } else {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
        
        throw new Error("Session expired. Please log in again.");
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
      
      throw error;
    }
  }

  return res;
}