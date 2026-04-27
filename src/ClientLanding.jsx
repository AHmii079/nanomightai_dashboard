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

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="clv-root">
          <div className="clv-bg" aria-hidden="true">
            <div className="clv-aura clv-aura-left"></div>
            <div className="clv-aura clv-aura-right"></div>
          </div>
          <div className="clv-loading">
            <Loader size="large" />
            <p>Loading campaign data...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="clv-root">
          <div className="clv-bg" aria-hidden="true">
            <div className="clv-aura clv-aura-left"></div>
            <div className="clv-aura clv-aura-right"></div>
          </div>
          <div className="clv-error-wrap">
            <div className="clv-error-card">
              <div className="clv-error-icon">
                <i className="bi bi-exclamation-triangle-fill"></i>
              </div>
              <h2>Unable to Load Campaigns</h2>
              <p>{error}</p>
              {!error.includes("login") && (
                <div className="clv-error-actions">
                  <button className="clv-btn clv-btn-primary" onClick={fetchCampaignData}>
                    <i className="bi bi-arrow-clockwise"></i> Try Again
                  </button>
                  <button className="clv-btn clv-btn-outline" onClick={() => (window.location.href = "/")}>
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
  const totalBots = data?.campaigns?.reduce((sum, c) => sum + (c.bot_count || 0), 0) || 0;

  const userRole = getUserRole();
  const isClientMember = userRole === "client_member";

  const displayName = isClientMember
    ? memberInfo?.full_name || memberInfo?.username || localStorage.getItem("username") || "Team Member"
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
      <div className="clv-root">
        <div className="clv-bg" aria-hidden="true">
          <div className="clv-aura clv-aura-left"></div>
          <div className="clv-aura clv-aura-right"></div>
          <div className="clv-grid-overlay"></div>
        </div>

        <header className="clv-topbar">
          <div className="clv-brand-wrap">
            <div className="clv-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.11 2.38 2 2 0 012.11.2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.28-1.35a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
            <div>
              <p className="clv-brand-title">Nanomight AI</p>
              <p className="clv-brand-sub">Campaign Launch Console</p>
            </div>
          </div>

          <div className="clv-topbar-actions">
            <button className="clv-btn clv-btn-outline" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </div>
        </header>

        <main className="clv-shell">
          <aside className="clv-sidebar">
            <section className="clv-profile-card clv-reveal-delay-1">
              <div className="clv-avatar">{initials}</div>
              <div>
                <p className="clv-welcome">Welcome back</p>
                <h1 className="clv-name">{displayName}</h1>
                {isClientMember && <span className="clv-member-chip">Team Member</span>}
              </div>
            </section>

            <section className="clv-kpi-stack clv-reveal-delay-2">
              <article className="clv-kpi-card">
                <p>Total Campaigns</p>
                <h3>{totalCampaigns}</h3>
                <span>
                  <i className="bi bi-megaphone-fill"></i>
                  Portfolio size
                </span>
              </article>
              <article className="clv-kpi-card">
                <p>Active Campaigns</p>
                <h3>{activeCampaigns}</h3>
                <span>
                  <i className="bi bi-activity"></i>
                  Live right now
                </span>
              </article>
              <article className="clv-kpi-card">
                <p>Total Bots</p>
                <h3>{totalBots}</h3>
                <span>
                  <i className="bi bi-cpu-fill"></i>
                  Distributed agents
                </span>
              </article>
            </section>

            <section className="clv-side-note clv-reveal-delay-3">
              <h4>Command Center</h4>
              <p>
                Campaigns are arranged by operational urgency. Expiring campaigns are visually
                flagged to help your team act quickly.
              </p>
            </section>
          </aside>

          <section className="clv-main">
            <div className="clv-main-header clv-reveal-delay-1">
              <div>
                <p className="clv-overline">Mission Board</p>
                <h2>Your Campaign Fleet</h2>
                <p>Select a campaign to jump directly into its dashboard.</p>
              </div>
              <div className="clv-count-pill">{totalCampaigns} total</div>
            </div>

            {data?.campaigns?.length === 0 ? (
              <div className="clv-empty clv-reveal-delay-2">
                <i className="bi bi-inboxes-fill"></i>
                <h3>No campaigns yet</h3>
                <p>Your campaigns will appear here once they are created.</p>
              </div>
            ) : (
              <div className="clv-campaign-list">
                {data?.campaigns?.map((item, index) => {
                  const campaign = item.campaign;
                  const daysLeft = calculateDaysLeft(item.end_date);
                  const expiryWarning = getExpiryWarning(daysLeft);
                  const callStats = item.call_stats;
                  const isActive = item.status?.status_name === "Enabled";

                  return (
                    <article key={item.id} className="clv-campaign-card" style={{ animationDelay: `${0.12 + index * 0.07}s` }}>
                      <div className="clv-card-head">
                        <div>
                          <h3>{formatCampaignName(campaign.name)}</h3>
                          <div className="clv-head-meta">
                            <span className="clv-tag">
                              <i className="bi bi-cpu-fill"></i>
                              {item.bot_count || 0} bots
                            </span>
                            <span className="clv-tag">{item.model?.name || "N/A"}</span>
                            <span className={`clv-tag clv-status ${isActive ? "live" : "paused"}`}>
                              <span className="clv-status-dot"></span>
                              {item.status?.status_name || "Unknown"}
                            </span>
                          </div>
                        </div>

                        <div className="clv-card-head-right">
                          {expiryWarning && (
                            <span className={`clv-expiry clv-expiry-${expiryWarning.tone}`}>
                              <i className="bi bi-clock-fill"></i>
                              {expiryWarning.text}
                            </span>
                          )}
                          <button
                            className="clv-btn clv-btn-dark"
                            onClick={() => (window.location.href = `/dashboard?campaign_id=${item.id}&view=dashboard`)}
                          >
                            Open Dashboard
                            <i className="bi bi-arrow-up-right"></i>
                          </button>
                        </div>
                      </div>

                      <div className="clv-metric-grid">
                        <div className="clv-metric">
                          <p>Transferred Calls</p>
                          <h4>
                            {callStats?.calls_transferred?.toLocaleString() || 0}
                            <span>{callStats?.transfer_percentage || 0}%</span>
                          </h4>
                        </div>
                        <div className="clv-metric">
                          <p>Total Calls</p>
                          <h4>{callStats?.total_calls?.toLocaleString() || 0}</h4>
                        </div>
                        <div className="clv-metric">
                          <p>Start Date</p>
                          <h4>{formatDate(item.start_date)}</h4>
                        </div>
                        <div className="clv-metric">
                          <p>Expiry Date</p>
                          <h4>{formatDate(item.end_date)}</h4>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

const styles = `
  @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');

  * { box-sizing: border-box; }

  html,
  body,
  #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #070b13;
  }

  .clv-root {
    --surface: rgba(255, 255, 255, 0.05);
    --surface-strong: rgba(255, 255, 255, 0.08);
    --border: rgba(255, 255, 255, 0.12);
    --text: rgba(255, 255, 255, 0.94);
    --muted: rgba(255, 255, 255, 0.62);
    --brand: #0a84ff;
    --brand-2: #5e5ce6;
    --danger: #ff6b6b;
    --shadow: 0 18px 36px rgba(0, 0, 0, 0.42);

    min-height: 100vh;
    height: 100vh;
    background: radial-gradient(circle at 12% -5%, rgba(10, 132, 255, 0.22), transparent 42%),
      radial-gradient(circle at 95% 85%, rgba(94, 92, 230, 0.2), transparent 40%),
      linear-gradient(155deg, #070b13 0%, #0b1422 55%, #0a1220 100%);
    color: var(--text);
    font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
    position: relative;
    overflow-x: clip;
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .clv-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .clv-aura {
    position: absolute;
    border-radius: 50%;
    filter: blur(95px);
    opacity: 0.5;
    animation: clv-float 12s ease-in-out infinite alternate;
  }

  .clv-aura-left {
    width: 520px;
    height: 520px;
    background: rgba(10, 132, 255, 0.2);
    top: -210px;
    left: -130px;
  }

  .clv-aura-right {
    width: 460px;
    height: 460px;
    background: rgba(94, 92, 230, 0.2);
    right: -160px;
    bottom: -120px;
    animation-delay: -4s;
  }

  .clv-grid-overlay {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: radial-gradient(circle at center, black 0%, transparent 74%);
    opacity: 0.34;
  }

  @keyframes clv-float {
    from { transform: translate(0, 0) scale(1); }
    to { transform: translate(28px, 34px) scale(1.05); }
  }

  @keyframes clv-reveal {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .clv-reveal-delay-1,
  .clv-reveal-delay-2,
  .clv-reveal-delay-3,
  .clv-campaign-card {
    opacity: 0;
    animation: clv-reveal 0.55s ease forwards;
  }

  .clv-reveal-delay-1 { animation-delay: 0.08s; }
  .clv-reveal-delay-2 { animation-delay: 0.16s; }
  .clv-reveal-delay-3 { animation-delay: 0.24s; }

  .clv-loading,
  .clv-error-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    position: relative;
    z-index: 1;
  }

  .clv-loading {
    flex-direction: column;
    gap: 12px;
  }

  .clv-loading p {
    color: var(--muted);
    font-size: 14px;
    letter-spacing: 0.01em;
  }

  .clv-error-card {
    width: min(520px, 100%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    backdrop-filter: blur(8px);
    box-shadow: var(--shadow);
    padding: 30px;
    text-align: center;
  }

  .clv-error-icon {
    width: 58px;
    height: 58px;
    margin: 0 auto 16px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: rgba(255, 107, 107, 0.14);
    color: var(--danger);
    font-size: 24px;
  }

  .clv-error-card h2 {
    margin: 0 0 8px;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 22px;
    letter-spacing: -0.02em;
  }

  .clv-error-card p {
    margin: 0 0 18px;
    color: var(--muted);
    line-height: 1.55;
    font-size: 14px;
  }

  .clv-error-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .clv-topbar {
    position: relative;
    z-index: 5;
    margin: 0 auto;
    width: min(1320px, calc(100% - 28px));
    margin-top: 0;
    background: rgba(12, 18, 30, 0.72);
    border: 1px solid var(--border);
    backdrop-filter: blur(12px);
    border-radius: 18px;
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
  }

  .clv-brand-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .clv-brand-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(140deg, var(--brand), var(--brand-2));
    color: #fff;
    display: grid;
    place-items: center;
    box-shadow: 0 8px 18px rgba(10, 132, 255, 0.28);
  }

  .clv-brand-title {
    margin: 0;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .clv-brand-sub {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .clv-topbar-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .clv-btn {
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    border-radius: 12px;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clv-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .clv-btn-primary {
    background: linear-gradient(130deg, var(--brand), #0e9380);
    color: #f4fff9;
    box-shadow: 0 12px 22px rgba(15, 118, 110, 0.24);
  }

  .clv-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: saturate(1.08);
  }

  .clv-btn-outline {
    border-color: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.88);
    background: rgba(255, 255, 255, 0.06);
  }

  .clv-btn-outline:hover {
    background: rgba(255, 255, 255, 0.11);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .clv-btn-dark {
    background: #1e2b25;
    color: #f6fbf8;
    border-color: rgba(255, 255, 255, 0.06);
  }

  .clv-btn-dark:hover {
    background: #13211b;
    transform: translateY(-1px);
  }

  .clv-shell {
    width: min(1320px, calc(100% - 28px));
    margin: 14px auto 0;
    display: grid;
    grid-template-columns: 310px minmax(0, 1fr);
    gap: 16px;
    position: relative;
    z-index: 1;
  }

  .clv-sidebar,
  .clv-main {
    border: 1px solid var(--border);
    border-radius: 24px;
    background: rgba(11, 17, 29, 0.64);
    backdrop-filter: blur(12px);
    box-shadow: var(--shadow);
  }

  .clv-sidebar {
    padding: 18px;
    display: grid;
    align-content: start;
    gap: 12px;
  }

  .clv-profile-card {
    border-radius: 18px;
    border: 1px solid var(--border);
    background: var(--surface-strong);
    padding: 14px;
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .clv-avatar {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(140deg, #0a84ff, #5e5ce6);
    color: #fff;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 18px;
    font-weight: 800;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .clv-welcome {
    margin: 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  .clv-name {
    margin: 4px 0 0;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 20px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .clv-member-chip {
    display: inline-flex;
    align-items: center;
    margin-top: 8px;
    border-radius: 999px;
    border: 1px solid rgba(94, 92, 230, 0.38);
    background: rgba(94, 92, 230, 0.2);
    color: #d3d2ff;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .clv-kpi-stack {
    display: grid;
    gap: 10px;
  }

  .clv-kpi-card {
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 13px;
    background: var(--surface);
  }

  .clv-kpi-card p {
    margin: 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  .clv-kpi-card h3 {
    margin: 6px 0 4px;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 29px;
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .clv-kpi-card span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
  }

  .clv-kpi-card i {
    color: var(--brand);
  }

  .clv-side-note {
    border-radius: 16px;
    border: 1px solid rgba(10, 132, 255, 0.22);
    background: linear-gradient(140deg, rgba(10, 132, 255, 0.12), rgba(94, 92, 230, 0.1));
    padding: 14px;
  }

  .clv-side-note h4 {
    margin: 0;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    letter-spacing: -0.01em;
    font-size: 15px;
  }

  .clv-side-note p {
    margin: 8px 0 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.55;
  }

  .clv-main {
    padding: 18px;
  }

  .clv-main-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    padding: 2px 4px 16px;
  }

  .clv-overline {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
  }

  .clv-main-header h2 {
    margin: 6px 0 6px;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 31px;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }

  .clv-main-header p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }

  .clv-count-pill {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.86);
    background: rgba(255, 255, 255, 0.08);
    white-space: nowrap;
  }

  .clv-empty {
    border: 1px dashed rgba(255, 255, 255, 0.24);
    border-radius: 18px;
    padding: 68px 20px;
    text-align: center;
    background: rgba(255, 255, 255, 0.03);
  }

  .clv-empty i {
    font-size: 40px;
    color: rgba(255, 255, 255, 0.48);
  }

  .clv-empty h3 {
    margin: 12px 0 6px;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
  }

  .clv-empty p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }

  .clv-campaign-list {
    display: grid;
    gap: 12px;
  }

  .clv-campaign-card {
    border: 1px solid var(--border);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.05);
    padding: 14px;
  }

  .clv-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .clv-card-head h3 {
    margin: 0;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 19px;
    letter-spacing: -0.02em;
  }

  .clv-head-meta {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .clv-tag {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.83);
    background: rgba(255, 255, 255, 0.07);
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .clv-status {
    border-color: transparent;
  }

  .clv-status.live {
    background: rgba(48, 209, 88, 0.2);
    color: #89f7ab;
  }

  .clv-status.paused {
    background: rgba(255, 107, 107, 0.22);
    color: #ffb4b4;
  }

  .clv-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .clv-card-head-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .clv-expiry {
    border-radius: 999px;
    padding: 5px 11px;
    font-size: 11.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .clv-expiry-green { background: rgba(31, 157, 85, 0.14); color: #1e7f4a; }
  .clv-expiry-green { background: rgba(48, 209, 88, 0.2); color: #9ef5b9; }
  .clv-expiry-amber { background: rgba(255, 159, 10, 0.2); color: #ffd697; }
  .clv-expiry-red { background: rgba(255, 107, 107, 0.22); color: #ffc4c4; }

  .clv-metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .clv-metric {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    padding: 10px;
    min-width: 0;
  }

  .clv-metric p {
    margin: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.58);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .clv-metric h4 {
    margin: 7px 0 0;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
    font-size: 16px;
    letter-spacing: -0.02em;
    line-height: 1.25;
    display: flex;
    gap: 6px;
    align-items: baseline;
    flex-wrap: wrap;
  }

  .clv-metric h4 span {
    font-size: 12px;
    color: #86f1ad;
  }

  .clv-root ::-webkit-scrollbar { width: 7px; height: 7px; }
  .clv-root ::-webkit-scrollbar-thumb {
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.24);
  }

  @media (max-width: 1080px) {
    .clv-shell {
      grid-template-columns: 1fr;
    }

    .clv-sidebar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
    }

    .clv-profile-card,
    .clv-side-note {
      grid-column: 1 / -1;
    }

    .clv-kpi-stack {
      grid-column: 1 / -1;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .clv-metric-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .clv-topbar {
      position: static;
      width: calc(100% - 20px);
      margin-top: 10px;
      border-radius: 14px;
      padding: 10px 12px;
    }

    .clv-brand-sub {
      display: none;
    }

    .clv-shell {
      width: calc(100% - 20px);
      margin-top: 10px;
      margin-bottom: 0;
    }

    .clv-main,
    .clv-sidebar {
      border-radius: 16px;
      padding: 12px;
    }

    .clv-main-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding-bottom: 10px;
    }

    .clv-main-header h2 {
      font-size: 24px;
    }

    .clv-kpi-stack {
      grid-template-columns: 1fr;
    }

    .clv-card-head {
      flex-direction: column;
    }

    .clv-card-head-right {
      width: 100%;
      justify-content: space-between;
    }

    .clv-btn {
      padding: 8px 12px;
      font-size: 12.5px;
    }
  }

  @media (max-width: 520px) {
    .clv-topbar-actions {
      width: 100%;
      justify-content: stretch;
    }

    .clv-topbar-actions .clv-btn {
      flex: 1;
      justify-content: center;
    }

    .clv-metric-grid {
      grid-template-columns: 1fr;
    }

    .clv-card-head-right {
      flex-direction: column;
      align-items: stretch;
    }

    .clv-card-head-right .clv-btn {
      justify-content: center;
    }
  }
`;

export default ClientLanding;
