import { motion } from "framer-motion";
import { useState } from "react";
import "../styles/Auth.css";
import { authFetch } from "../utils/authFetch";
import { API_BASE, DEV_MODE } from "../utils/config";
import { useLoader } from "../dashboard/LoaderContext";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setLoading } = useLoader();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // DEV MODE: Skip authentication
    if (DEV_MODE) {
      console.log("🔧 DEV MODE: Bypassing authentication");
      localStorage.setItem("access", "dev_mock_token");
      localStorage.setItem("refresh", "dev_mock_refresh");
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || err.detail || "Invalid email or password.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      const meRes = await authFetch(`/api/auth/me/`);
      if (meRes.ok) {
        const profile = await meRes.json();
        console.log("Logged-in user:", profile);
      }

      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setErrorMsg(error.message || "Failed to connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-container"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h2>Login</h2>

      {DEV_MODE && (
        <div style={{
          background: "#fef3c7",
          color: "#92400e",
          padding: "10px",
          borderRadius: "6px",
          marginBottom: "15px",
          fontSize: "14px"
        }}>
          🔧 <strong>DEV MODE</strong> - Click login to bypass authentication
        </div>
      )}

      {errorMsg && <p className="error-box">❌ {errorMsg}</p>}

      <form className="auth-form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={!DEV_MODE}
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!DEV_MODE}
          />

          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        <button type="submit" className="auth-btn">
          {DEV_MODE ? "Enter Dashboard (Dev Mode)" : "Login"}
        </button>
      </form>

      <div className="auth-footer">
        <a href="/register">Register</a>
        <a href="/forgot-password">Forgot Password?</a>
      </div>
    </motion.div>
  );
}

export default Login;