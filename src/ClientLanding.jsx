import { useState, useEffect } from "react";
import Loader from "./components/Loader";

const ClientLanding = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberInfo, setMemberInfo] = useState(null);

  useEffect(() => {
    fetchCampaignData();
  }, []);

  const getAuthToken = () => localStorage.getItem("access_token");
  const getUserRole = () => localStorage.getItem("role");

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const userRole = getUserRole();
      let clientId;

      if (userRole === "client_member") {
        const employerResponse = await fetch(
          "https://api.xlitecore.xdialnetworks.com/api/v1/client/campaigns/employer",
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (employerResponse.status === 401) {
          const currentToken = localStorage.getItem("access_token");
          let isExpired = true;
          if (currentToken) {
            try {
              const payload = JSON.parse(atob(currentToken.split(".")[1]));
              if (payload.exp && Date.now() < payload.exp * 1000 - 60000) {
                isExpired = false;
              }
            } catch (e) {}
          }
          if (isExpired) {
            throw new Error("Session expired. Please login again.");
          } else {
            console.warn("Received 401 but token is still valid. Ignoring logout.");
          }
        }

        if (!employerResponse.ok) {
          throw new Error("Failed to fetch employer information");
        }

        const employerData = await employerResponse.json();
        setMemberInfo(employerData);
        clientId = employerData.client_id;

        if (!clientId) {
          throw new Error("Employer information does not contain client ID");
        }
      } else {
        clientId = localStorage.getItem("user_id");
        if (!clientId) {
          throw new Error("User ID not found. Please login again.");
        }
      }

      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/client/campaigns/${clientId}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        const currentToken = localStorage.getItem("access_token");
        let isExpired = true;
        if (currentToken) {
          try {
            const payload = JSON.parse(atob(currentToken.split(".")[1]));
            if (payload.exp && Date.now() < payload.exp * 1000 - 60000) {
              isExpired = false;
            }
          } catch (e) {}
        }
        if (isExpired) {
          throw new Error("Session expired. Please login again.");
        } else {
          console.warn("Received 401 but token is still valid. Ignoring logout.");
        }
      }

      if (response.status === 404) {
        throw new Error("Campaign data not found.");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch campaign data");
      }

      const result = await response.json();
      setData(result);
      setError("");
    } catch (err) {
      if (
        err.name === "TypeError" &&
        (err.message.includes("NetworkError") || err.message.includes("fetch"))
      ) {
        setError(
          "Unable to connect to the server. This may be due to network issues or server configuration. Please try again later."
        );
      } else {
        setError(err.message || "An error occurred while fetching data");
      }
      console.error("Fetch error:", err);

      if (err.message.includes("login")) {
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryWarning = (daysLeft) => {
    if (daysLeft === null) return null;
    if (daysLeft < 0) return { text: "Expired", tone: "red" };
    if (daysLeft === 0) return { text: "Expires Today", tone: "red" };
    if (daysLeft <= 7) return { text: `${daysLeft} days left`, tone: "red" };
    if (daysLeft <= 15) return { text: `${daysLeft} days left`, tone: "amber" };
    return { text: `${daysLeft} days left`, tone: "green" };
  };

  const formatCampaignName = (name) => {
    if (!name) return "Remote Agents";
    if (name.toUpperCase() === "FE") return "Final Expense Remote Agents";
    return `${name} Remote Agents`;
  };

  // ─── LOADING ───
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="cl-root">
          <div className="blob-wrap" aria-hidden="true">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
          </div>
          <div className="cl-loading">
            <Loader size="large" />
            <p>Loading campaign data…</p>
          </div>
        </div>
      </>
    );
  }

  // ─── ERROR ───
  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="cl-root">
          <div className="blob-wrap" aria-hidden="true">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
          </div>
          <div className="cl-error-wrap">
            <div className="cl-error-card">
              <div className="cl-error-icon">
                <i className="bi bi-exclamation-triangle-fill"></i>
              </div>
              <h2>Unable to Load Campaigns</h2>
              <p>{error}</p>
              {!error.includes("login") && (
                <div className="cl-error-actions">
                  <button className="cl-btn cl-btn-primary" onClick={fetchCampaignData}>
                    <i className="bi bi-arrow-clockwise"></i> Try Again
                  </button>
                  <button
                    className="cl-btn cl-btn-ghost"
                    onClick={() => (window.location.href = "/")}
                  >
                    Login Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const totalCampaigns = data?.total_campaigns || 0;
  const activeCampaigns = data?.active_campaigns || 0;
  const totalBots =
    data?.campaigns?.reduce((sum, c) => sum + (c.bot_count || 0), 0) || 0;

  const userRole = getUserRole();
  const isClientMember = userRole === "client_member";

  const displayName = isClientMember
    ? memberInfo?.full_name ||
      memberInfo?.username ||
      localStorage.getItem("username") ||
      "Team Member"
    : data?.client_name || "Client";

  const initials = (displayName || "C")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <style>{styles}</style>
      <div className="cl-root">
        {/* Background blobs */}
        <div className="blob-wrap" aria-hidden="true">
          <div className="blob blob1"></div>
          <div className="blob blob2"></div>
        </div>

        {/* ─── TOPBAR ─── */}
        <div className="cl-topbar">
          <div className="cl-topbar-left">
            <div className="cl-logo-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.11 2.38 2 2 0 012.11.2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.28-1.35a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <div className="cl-brand">
              Nanomight <span>AI</span>
            </div>
          </div>
          <div className="cl-topbar-right">
            {userRole === "client" && (
              <button
                className="cl-btn cl-btn-success"
                onClick={() => (window.location.href = "/request-campaign")}
              >
                <i className="bi bi-plus-lg"></i>
                Request Campaign
              </button>
            )}
            {!isClientMember && (
              <button
                className="cl-btn cl-btn-primary"
                onClick={() => (window.location.href = "/manage-team")}
              >
                <i className="bi bi-people-fill"></i>
                Manage Team
              </button>
            )}
            <button className="cl-btn cl-btn-ghost" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </div>
        </div>

        <div className="cl-content">
          {/* ─── HERO / WELCOME ─── */}
          <div className="cl-hero">
            <div className="cl-avatar">{initials}</div>
            <div className="cl-hero-text">
              <div className="cl-welcome">Welcome back</div>
              <h1 className="cl-hero-title">
                {displayName}
                {isClientMember && <span className="cl-role-badge">Team Member</span>}
              </h1>
              <div className="cl-hero-sub">
                {totalCampaigns} {totalCampaigns === 1 ? "campaign" : "campaigns"} ·{" "}
                {activeCampaigns} active · {totalBots} bots deployed
              </div>
            </div>
          </div>

          {/* ─── STAT CARDS ─── */}
          <div className="cl-stats-row">
            <div className="cl-stat-card">
              <div className="cl-stat-label">Total Campaigns</div>
              <div className="cl-stat-val">{totalCampaigns}</div>
              <div className="cl-stat-sub">
                <i className="bi bi-megaphone-fill" style={{ color: "#5E5CE6" }}></i>
                All campaigns
              </div>
            </div>
            <div className="cl-stat-card">
              <div className="cl-stat-label">Active Campaigns</div>
              <div className="cl-stat-val">{activeCampaigns}</div>
              <div className="cl-stat-sub">
                <i className="bi bi-check-circle-fill" style={{ color: "#30D158" }}></i>
                Currently running
              </div>
            </div>
            <div className="cl-stat-card">
              <div className="cl-stat-label">Total Bots</div>
              <div className="cl-stat-val">{totalBots}</div>
              <div className="cl-stat-sub">
                <i className="bi bi-cpu-fill" style={{ color: "#FF9F0A" }}></i>
                Deployed agents
              </div>
            </div>
          </div>

          {/* ─── SECTION HEADER ─── */}
          <div className="cl-section-header">
            <div>
              <h2>Your Campaigns</h2>
              <div className="cl-section-sub">
                Select a campaign to view its dashboard
              </div>
            </div>
            <span className="cl-section-count">{totalCampaigns}</span>
          </div>

          {/* ─── CAMPAIGN CARDS ─── */}
          <div className="cl-campaigns-grid">
            {data?.campaigns?.length === 0 ? (
              <div className="cl-empty">
                <i className="bi bi-inbox"></i>
                <div className="cl-empty-title">No campaigns yet</div>
                <div className="cl-empty-sub">
                  Your campaigns will appear here once they're created.
                </div>
              </div>
            ) : (
              data?.campaigns?.map((item) => {
                const campaign = item.campaign;
                const daysLeft = calculateDaysLeft(item.end_date);
                const expiryWarning = getExpiryWarning(daysLeft);
                const callStats = item.call_stats;
                const isActive = item.status?.status_name === "Enabled";

                return (
                  <div key={item.id} className="cl-campaign-card">
                    {/* Header row */}
                    <div className="cl-cc-header">
                      <div className="cl-cc-title-wrap">
                        <h3 className="cl-cc-title">
                          {formatCampaignName(campaign.name)}
                        </h3>
                        <div className="cl-cc-meta-row">
                          <span className="cl-cc-bot-chip">
                            <i className="bi bi-cpu-fill"></i>
                            {item.bot_count || 0} bots
                          </span>
                          <span className="cl-cc-model-chip">
                            {item.model?.name || "N/A"}
                          </span>
                          <span
                            className={`cl-cc-status ${isActive ? "active" : "paused"}`}
                          >
                            <span className="cl-cc-status-dot"></span>
                            {item.status?.status_name || "Unknown"}
                          </span>
                        </div>
                      </div>
                      {expiryWarning && (
                        <span className={`cl-cc-expiry cl-expiry-${expiryWarning.tone}`}>
                          <i className="bi bi-clock-fill"></i>
                          {expiryWarning.text}
                        </span>
                      )}
                    </div>

                    {/* Metrics grid */}
                    <div className="cl-cc-metrics">
                      <div className="cl-cc-metric">
                        <div className="cl-cc-metric-label">Transferred Calls</div>
                        <div className="cl-cc-metric-val">
                          {callStats?.calls_transferred?.toLocaleString() || 0}
                          <span className="cl-cc-pct">
                            {callStats?.transfer_percentage || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="cl-cc-metric">
                        <div className="cl-cc-metric-label">Total Calls</div>
                        <div className="cl-cc-metric-val">
                          {callStats?.total_calls?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="cl-cc-metric">
                        <div className="cl-cc-metric-label">
                          <i className="bi bi-calendar3"></i> Start Date
                        </div>
                        <div className="cl-cc-metric-val cl-cc-date">
                          {formatDate(item.start_date)}
                        </div>
                      </div>
                      <div className="cl-cc-metric">
                        <div className="cl-cc-metric-label">
                          <i className="bi bi-calendar-event"></i> Expiry Date
                        </div>
                        <div className="cl-cc-metric-val cl-cc-date cl-cc-date-expiry">
                          {formatDate(item.end_date)}
                        </div>
                      </div>
                    </div>

                    {/* Footer / action */}
                    <button
                      className="cl-cc-view-btn"
                      onClick={() =>
                        (window.location.href = `/dashboard?campaign_id=${item.id}&view=dashboard`)
                      }
                    >
                      View Dashboard
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const styles = `
  @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * { box-sizing: border-box; }

  .cl-root {
    --bg: #080c14;
    --bg2: #0d1220;
    --surface: rgba(255,255,255,0.05);
    --surface-hov: rgba(255,255,255,0.08);
    --surface-2: rgba(255,255,255,0.03);
    --border: rgba(255,255,255,0.08);
    --border-strong: rgba(255,255,255,0.14);
    --text: rgba(255,255,255,0.92);
    --text2: rgba(255,255,255,0.5);
    --text3: rgba(255,255,255,0.28);
    --accent: #0A84FF;
    --accent-dim: rgba(10,132,255,0.15);
    --success: #30D158;
    --success-dim: rgba(48,209,88,0.14);
    --warning: #FF9F0A;
    --warning-dim: rgba(255,159,10,0.14);
    --danger: #FF453A;
    --danger-dim: rgba(255,69,58,0.14);
    --indigo: #5E5CE6;
    --card-shadow: 0 2px 24px rgba(0,0,0,0.4);

    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: relative;
    overflow-x: hidden;
  }

  /* Background blobs */
  .cl-root .blob-wrap {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }
  .cl-root .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    animation: cl-bdrift 14s ease-in-out infinite alternate;
  }
  .cl-root .blob1 {
    width: 600px; height: 600px;
    background: rgba(10,132,255,0.12);
    top: -200px; left: -100px;
  }
  .cl-root .blob2 {
    width: 400px; height: 400px;
    background: rgba(94,92,230,0.1);
    bottom: -100px; right: -100px;
    animation-delay: -6s;
  }
  @keyframes cl-bdrift {
    0% { transform: translate(0,0); }
    100% { transform: translate(50px, 40px); }
  }

  /* Loading */
  .cl-loading {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    position: relative;
    z-index: 1;
  }
  .cl-loading p { color: var(--text2); font-size: 14px; }

  /* Error */
  .cl-error-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    z-index: 1;
  }
  .cl-error-card {
    background: var(--surface);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: 22px;
    padding: 32px;
    max-width: 480px;
    width: 100%;
    text-align: center;
    box-shadow: var(--card-shadow);
  }
  .cl-error-icon {
    width: 60px; height: 60px;
    margin: 0 auto 16px;
    border-radius: 50%;
    background: var(--danger-dim);
    color: var(--danger);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
  }
  .cl-error-card h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 8px;
  }
  .cl-error-card p {
    font-size: 13.5px;
    color: var(--text2);
    line-height: 1.55;
    margin: 0 0 20px;
  }
  .cl-error-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ─── TOPBAR ─── */
  .cl-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 64px;
    background: rgba(8,12,20,0.85);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .cl-topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cl-logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #0A84FF, #5E5CE6);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(10,132,255,0.35);
  }
  .cl-brand {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.4px;
    color: var(--text);
  }
  .cl-brand span { color: var(--accent); }
  .cl-topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ─── BUTTONS ─── */
  .cl-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.18s;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .cl-btn i { font-size: 14px; }
  .cl-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 4px 16px rgba(10,132,255,0.3);
  }
  .cl-btn-primary:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .cl-btn-success {
    background: var(--success);
    color: #0a1a0f;
    box-shadow: 0 4px 16px rgba(48,209,88,0.25);
  }
  .cl-btn-success:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .cl-btn-ghost {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text2);
  }
  .cl-btn-ghost:hover {
    background: var(--surface-hov);
    color: var(--text);
    border-color: var(--border-strong);
  }

  /* ─── CONTENT ─── */
  .cl-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px;
    position: relative;
    z-index: 1;
  }

  /* ─── HERO ─── */
  .cl-hero {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 28px;
  }
  .cl-avatar {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #0A84FF, #5E5CE6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(10,132,255,0.3);
  }
  .cl-welcome {
    font-size: 12px;
    font-weight: 500;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
  .cl-hero-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.8px;
    color: var(--text);
    margin: 0 0 6px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .cl-role-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    background: rgba(94,92,230,0.15);
    color: var(--indigo);
    border: 1px solid rgba(94,92,230,0.25);
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .cl-hero-sub {
    font-size: 13px;
    color: var(--text2);
  }

  /* ─── STAT CARDS ─── */
  .cl-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 32px;
  }
  .cl-stat-card {
    background: var(--surface);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    box-shadow: var(--card-shadow);
    transition: all 0.2s;
  }
  .cl-stat-card:hover {
    background: var(--surface-hov);
    transform: translateY(-2px);
  }
  .cl-stat-label {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text2);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .cl-stat-val {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -1.2px;
    color: var(--text);
    line-height: 1.1;
  }
  .cl-stat-sub {
    font-size: 12px;
    color: var(--text3);
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cl-stat-sub i { font-size: 13px; }

  /* ─── SECTION HEADER ─── */
  .cl-section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .cl-section-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin: 0;
    letter-spacing: -0.3px;
  }
  .cl-section-sub {
    font-size: 12.5px;
    color: var(--text3);
    margin-top: 4px;
  }
  .cl-section-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--text2);
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 4px 12px;
    border-radius: 20px;
  }

  /* ─── CAMPAIGN CARDS ─── */
  .cl-campaigns-grid {
    display: grid;
    gap: 14px;
  }

  .cl-empty {
    background: var(--surface);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px dashed var(--border-strong);
    border-radius: 18px;
    padding: 60px 24px;
    text-align: center;
  }
  .cl-empty i {
    font-size: 42px;
    color: var(--text3);
    margin-bottom: 14px;
  }
  .cl-empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
  }
  .cl-empty-sub {
    font-size: 13px;
    color: var(--text3);
  }

  .cl-campaign-card {
    background: var(--surface);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 20px;
    transition: all 0.2s;
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .cl-campaign-card:hover {
    border-color: var(--border-strong);
    background: var(--surface-hov);
    transform: translateY(-1px);
  }

  .cl-cc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .cl-cc-title-wrap {
    flex: 1;
    min-width: 0;
  }
  .cl-cc-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 8px;
    letter-spacing: -0.3px;
  }
  .cl-cc-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .cl-cc-bot-chip,
  .cl-cc-model-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text2);
  }
  .cl-cc-bot-chip i { color: var(--warning); font-size: 11px; }
  .cl-cc-model-chip { color: var(--text2); }

  .cl-cc-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 600;
  }
  .cl-cc-status.active {
    background: var(--success-dim);
    color: var(--success);
  }
  .cl-cc-status.paused {
    background: var(--danger-dim);
    color: var(--danger);
  }
  .cl-cc-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 8px currentColor;
  }

  .cl-cc-expiry {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .cl-cc-expiry i { font-size: 10px; }
  .cl-expiry-green { background: var(--success-dim); color: var(--success); }
  .cl-expiry-amber { background: var(--warning-dim); color: var(--warning); }
  .cl-expiry-red   { background: var(--danger-dim);  color: var(--danger); }

  .cl-cc-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    padding: 16px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .cl-cc-metric {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .cl-cc-metric-label {
    font-size: 11px;
    color: var(--text3);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .cl-cc-metric-label i { font-size: 11px; }
  .cl-cc-metric-val {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: baseline;
    gap: 6px;
    letter-spacing: -0.3px;
  }
  .cl-cc-pct {
    font-size: 12px;
    font-weight: 600;
    color: var(--success);
  }
  .cl-cc-date {
    font-size: 13.5px;
    font-weight: 600;
  }
  .cl-cc-date-expiry { color: var(--warning); }

  .cl-cc-view-btn {
    width: 100%;
    padding: 11px 16px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text2);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.18s;
  }
  .cl-cc-view-btn:hover {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
  }
  .cl-cc-view-btn i {
    transition: transform 0.18s;
  }
  .cl-cc-view-btn:hover i {
    transform: translateX(3px);
  }

  /* Scrollbar */
  .cl-root ::-webkit-scrollbar { width: 6px; height: 6px; }
  .cl-root ::-webkit-scrollbar-track { background: transparent; }
  .cl-root ::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 4px;
  }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 1024px) {
    .cl-stats-row { grid-template-columns: repeat(3, 1fr); }
    .cl-cc-metrics { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 768px) {
    .cl-topbar {
      padding: 0 16px;
      height: auto;
      flex-wrap: wrap;
      padding-top: 12px;
      padding-bottom: 12px;
      gap: 12px;
    }
    .cl-topbar-right {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .cl-content { padding: 20px 16px; }
    .cl-hero { flex-direction: column; align-items: flex-start; gap: 14px; }
    .cl-hero-title { font-size: 22px; }
    .cl-stats-row { grid-template-columns: 1fr; }
    .cl-cc-metrics { grid-template-columns: repeat(2, 1fr); }
    .cl-cc-header { flex-direction: column; }
  }
  @media (max-width: 480px) {
    .cl-cc-metrics { grid-template-columns: 1fr; }
    .cl-btn { padding: 7px 12px; font-size: 12.5px; }
  }
`;

export default ClientLanding;
