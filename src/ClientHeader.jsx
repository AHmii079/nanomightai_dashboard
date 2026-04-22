import React from "react";
import { useNavigate } from "react-router-dom";

export default function ClientHeader({
  clientName,
  campaignId,
  activePage, // "reports" | "recordings"
  isAdminView = false,
}) {
  const routerNavigate = useNavigate();

  const navigateTo = (path, view) => {
    let url = `${path}?campaign_id=${campaignId}`;
    if (view) {
      url += `&view=${view}`;
    }
    if (isAdminView) {
      url += `&admin_view=true`;
    }
    routerNavigate(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  const userRole = localStorage.getItem("role");

  // Generate initials from client name
  const getInitials = (name) => {
    if (!name) return "CL";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <style>{sidebarStyles}</style>
      <aside className="sidebar">
        {/* Logo / Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <i className="bi bi-telephone-forward-fill"></i>
          </div>
          <span className="sidebar-brand-text">
            Funnel <span className="sidebar-brand-accent">AI</span>
          </span>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav-group">
          <div className="sidebar-label">NAVIGATION</div>

          {isAdminView && (
            <button
              className="sidebar-nav-item"
              onClick={() => routerNavigate(`/admin-dashboard?campaign_id=${campaignId}`)}
            >
              <i className="bi bi-arrow-left"></i>
              Back to Admin
            </button>
          )}

          <button
            className={`sidebar-nav-item ${activePage === "reports" ? "active" : ""}`}
            onClick={() => navigateTo("/dashboard", "dashboard")}
          >
            <i className="bi bi-file-earmark-bar-graph"></i>
            Reports
          </button>

          {userRole !== "qa" && userRole !== "onboarding" && (
            <button
              className={`sidebar-nav-item ${activePage === "recordings" ? "active" : ""}`}
              onClick={() => navigateTo("/dashboard", "recordings")}
            >
              <i className="bi bi-headset"></i>
              Recordings
            </button>
          )}
        </div>

        {/* Account section at bottom */}
        <div className="sidebar-bottom">
          <div className="sidebar-label">ACCOUNT</div>
          <button className="sidebar-nav-item sidebar-logout" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i>
            Logout
          </button>

          {/* User info */}
          <div className="sidebar-user">
            <div className="sidebar-avatar">{getInitials(clientName)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{clientName || "Client"}</div>
              <div className="sidebar-user-ext">Extension: {campaignId || "N/A"}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

const sidebarStyles = `
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 240px;
    display: flex;
    flex-direction: column;
    padding: 0;
    background: #0f172a;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    z-index: 1000;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 20px 24px 20px;
  }

  .sidebar-logo {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
  }

  .sidebar-brand-text {
    font-size: 18px;
    font-weight: 600;
    color: #f1f5f9;
    letter-spacing: -0.02em;
  }

  .sidebar-brand-accent {
    color: #60a5fa;
  }

  .sidebar-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: #475569;
    padding: 0 20px;
    margin-bottom: 8px;
  }

  .sidebar-nav-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 12px;
    flex-grow: 1;
  }

  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: transparent;
    color: #94a3b8;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    text-align: left;
    width: 100%;
  }

  .sidebar-nav-item i {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }

  .sidebar-nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
  }

  .sidebar-nav-item.active {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.10));
    color: #60a5fa;
  }

  .sidebar-logout {
    color: #94a3b8;
  }

  .sidebar-logout:hover {
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
  }

  .sidebar-bottom {
    padding: 0 12px 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    margin-top: 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
  }

  .sidebar-avatar {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .sidebar-user-info {
    overflow: hidden;
  }

  .sidebar-user-name {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-user-ext {
    font-size: 11px;
    color: #64748b;
    margin-top: 1px;
  }
`;
