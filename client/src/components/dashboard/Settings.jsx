import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import toast from "react-hot-toast";
import ConfirmationModal from "../common/ConfirmationModal";
import "../styles/settings.css";

function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [me, setMe] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadMe(), loadDevices()]);
      } catch (e) {
        setErr("Failed to load settings.");
        toast.error("Error loading profile data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function loadMe() {
    const res = await authFetch("/api/auth/me");
    if (!res.ok) throw new Error("me failed");
    const data = await res.json();
    setMe(data);
  }

  async function loadDevices() {
    const res = await authFetch("/api/auth/devices");
    if (!res.ok) throw new Error("devices failed");
    const data = await res.json();
    setDevices(data.devices || []);
  }

  // Profile update
  async function handleProfileUpdate(e) {
    e.preventDefault();
    const loadingToast = toast.loading("Updating profile...");
    const form = new FormData(e.currentTarget);
    const body = {
      first_name: form.get("first_name") || "",
      last_name: form.get("last_name") || "",
      email: form.get("email") || "",
    };
    const res = await authFetch("/api/auth/me/update", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success("Profile updated successfully! ✅", { id: loadingToast });
      await loadMe();
    } else {
      const errorData = await res.json().catch(() => ({}));
      toast.error(errorData.error || "Failed to update profile", { id: loadingToast });
    }
  }

  // Password change
  async function handlePasswordChange(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const old_password = form.get("old_password");
    const new_password = form.get("new_password");
    const confirm = form.get("confirm_password");
    if (new_password !== confirm) return toast.error("New passwords do not match.");

    const loadingToast = toast.loading("Changing password...");
    const res = await authFetch("/api/auth/change-password/", {
      method: "POST",
      body: JSON.stringify({ old_password, new_password }),
    });

    if (res.ok) {
      toast.success("Password changed successfully", { id: loadingToast });
      e.currentTarget.reset();
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j.detail || j.error || "Failed to change password", { id: loadingToast });
    }
  }

  // Notifications (⚠️ In production, backend must send actual email/SMS based on these)
  async function handleToggleNotification(key, enabled) {
    if (!me) return;
    const res = await authFetch("/api/auth/notifications", {
      method: "POST",
      body: JSON.stringify({ [key]: enabled }),
    });
    if (res.ok) {
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} alerts updated`);
      await loadMe();
    } else {
      toast.error("Failed to update notifications");
    }
  }

  // Devices
  async function handleLogoutDevice(deviceId) {
    const loadingToast = toast.loading("Logging out device...");
    const res = await authFetch("/api/auth/devices/logout", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId }),
    });
    if (res.ok) {
      toast.success("Device logged out", { id: loadingToast });
      await loadDevices();
    } else {
      toast.error("Failed to log out device", { id: loadingToast });
    }
  }

  // Delete account
  async function performDeleteAccount() {
    const loadingToast = toast.loading("Deleting account...");
    const res = await authFetch("/api/auth/delete", { method: "DELETE" });
    if (res.ok) {
      toast.success("Goodbye! Your account has been deleted.", { id: loadingToast });
      localStorage.clear();
      setTimeout(() => navigate("/"), 2000); // Redirect to home
    } else {
      toast.error("Error deleting account", { id: loadingToast });
    }
  }


  const Loading = (
    <div className="spinner-container">
      <div className="spinner" />
    </div>
  );

  return (
    <motion.div
      className="settings-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="settings-title">Settings</h2>

      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <button onClick={() => setActiveTab("profile")} className={activeTab === "profile" ? "active" : ""}>
            👤 Profile
          </button>
          <button onClick={() => setActiveTab("security")} className={activeTab === "security" ? "active" : ""}>
            🔐 Password & Security
          </button>
          <button onClick={() => setActiveTab("notifications")} className={activeTab === "notifications" ? "active" : ""}>
            🔔 Notifications
          </button>
          <button onClick={() => setActiveTab("devices")} className={activeTab === "devices" ? "active" : ""}>
            📱 Connected Devices
          </button>
          <button onClick={() => setActiveTab("delete")} className={activeTab === "delete" ? "active danger" : "danger"}>
            ❌ Delete Account
          </button>
        </div>

        {/* Main content */}
        <div className="settings-main">
          {loading ? (
            Loading
          ) : err ? (
            <p className="error-text">{err}</p>
          ) : !me ? null : (
            <>
              {activeTab === "profile" && (
                <div className="tab-content">
                  <h3>Account Information</h3>
                  <form onSubmit={handleProfileUpdate}>
                    <div className="form-group">
                      <label>First Name</label>
                      <input name="first_name" defaultValue={me.first_name || ""} />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input name="last_name" defaultValue={me.last_name || ""} />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" defaultValue={me.email || ""} />
                    </div>
                    <button className="primary-btn" type="submit">Save Changes</button>
                    <button type="button" className="secondary-btn" onClick={() => navigate("/login")}>
                      ➕ Add Another Account
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "security" && (
                <div className="tab-content">
                  <h3>Password & Security</h3>
                  <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                      <label>Current Password</label>
                      <input type="password" name="old_password" required />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input type="password" name="new_password" required />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input type="password" name="confirm_password" required />
                    </div>
                    <button className="primary-btn" type="submit">Change Password</button>
                  </form>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="tab-content">
                  <h3>Notification Settings</h3>
                  <label className="toggle-row">
                    <span>Email Alerts</span>
                    <input
                      type="checkbox"
                      checked={!!me.notifications?.email}
                      onChange={(e) => handleToggleNotification("email", e.target.checked)}
                    />
                  </label>
                  <label className="toggle-row">
                    <span>SMS Notifications</span>
                    <input
                      type="checkbox"
                      checked={!!me.notifications?.sms}
                      onChange={(e) => handleToggleNotification("sms", e.target.checked)}
                    />
                  </label>
                  <label className="toggle-row">
                    <span>System Messages</span>
                    <input
                      type="checkbox"
                      checked={!!me.notifications?.system}
                      onChange={(e) => handleToggleNotification("system", e.target.checked)}
                    />
                  </label>
                  <p className="note">
                    
                  </p>
                </div>
              )}

              {activeTab === "devices" && (
                <div className="tab-content">
                  <h3>Connected Devices</h3>
                  {devices.length === 0 ? (
                    <p>No devices yet.</p>
                  ) : (
                    <ul>
                      {devices.map((d) => (
                        <li key={d.id}>
                          {d.device_name} — {d.ip_address} (Last active: {new Date(d.last_active).toLocaleString()})
                          <button className="danger-btn" onClick={() => handleLogoutDevice(d.id)}>Log Out</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "delete" && (
                <div className="tab-content">
                  <h3>Delete Account</h3>
                  <p>This action is irreversible. Make sure you understand the consequences.</p>
                  <button className="danger-btn" onClick={() => setIsDeleteModalOpen(true)}>Delete My Account</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={performDeleteAccount}
        title="Delete Account"
        message="This action is irreversible. All your data, investments, and wallet balances will be permanently removed. Are you absolutely sure?"
        type="danger"
        confirmText="Delete Account"
      />
    </motion.div>
  );
}

export default Settings;
