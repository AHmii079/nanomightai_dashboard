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

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const getUserRole = () => {
    return localStorage.getItem("role");
  };

  // Updated fetchCampaignData function to handle both client and client_member roles
  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const userRole = getUserRole();
      let clientId;

      // Check if user is client_member
      if (userRole === "client_member") {
        // Step 1: Fetch employer information to get the client_id
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
              const payload = JSON.parse(atob(currentToken.split('.')[1]));
              if (payload.exp && Date.now() < (payload.exp * 1000) - 60000) {
                isExpired = false;
              }
            } catch(e) {}
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
        console.log("Employer data:", employerData);

        // Store member info for display
        setMemberInfo(employerData);

        // Extract client_id from employer response
        clientId = employerData.client_id;

        if (!clientId) {
          throw new Error("Employer information does not contain client ID");
        }
      } else {
        // For regular client role, get client_id from localStorage
        clientId = localStorage.getItem("user_id");

        if (!clientId) {
          throw new Error("User ID not found. Please login again.");
        }
      }

      // Step 2: Fetch campaigns using the client_id
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
            const payload = JSON.parse(atob(currentToken.split('.')[1]));
            if (payload.exp && Date.now() < (payload.exp * 1000) - 60000) {
              isExpired = false;
            }
          } catch(e) {}
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
      // Handle network errors (CORS, connection issues, etc.)
      if (err.name === 'TypeError' && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
        setError('Unable to connect to the server. This may be due to network issues or server configuration. Please try again later.');
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
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
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
    if (daysLeft < 0) return { text: "Expired", color: "#DC2626" };
    if (daysLeft === 0) return { text: "Expires Today", color: "#DC2626" };
    if (daysLeft <= 7)
      return { text: `${daysLeft} days left`, color: "#DC2626" };
    if (daysLeft <= 15)
      return { text: `${daysLeft} days left`, color: "#F59E0B" };
    return { text: `${daysLeft} days left`, color: "#10B981" };
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
        <div className="loading-container">
          <Loader size="large" />
          <p>Loading campaign data...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div style={{
          padding: '40px',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '24px',
            width: '100%'
          }}>
            <h2 style={{
              color: '#DC2626',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              Unable to Load Campaigns
            </h2>
            <p style={{
              color: '#991B1B',
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '20px'
            }}>
              {error}
            </p>
            {!error.includes("login") && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={fetchCampaignData}
                  style={{
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Login Again
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  const totalCampaigns = data?.total_campaigns || 0;
  const activeCampaigns = data?.active_campaigns || 0;
  const totalBots =
    data?.campaigns?.reduce((sum, c) => sum + (c.bot_count || 0), 0) || 0;

  // Get user role for display
  const userRole = getUserRole();
  const isClientMember = userRole === "client_member";

  // Determine the display name
  const displayName = isClientMember
    ? (memberInfo?.full_name || memberInfo?.username || localStorage.getItem("username") || "Team Member")
    : (data?.client_name || "Client");

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>
            Welcome,{" "}
            <span className="company-name">
              {displayName}
            </span>
            {isClientMember && (
              <span className="role-badge">Team Member</span>
            )}
          </h1>
          <div className="header-buttons">
            {userRole === "client" && (
              <button
                className="request-campaign-btn"
                onClick={() => window.location.href = '/request-campaign'}
              >
                <i className="bi bi-plus-circle-fill"></i>
                Request Campaign
              </button>
            )}
            {!isClientMember && (
              <button
                className="manage-team-btn"
                onClick={() => window.location.href = '/manage-team'}
              >
                <i className="bi bi-people-fill"></i>
                Manage Team
              </button>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </div>
        </div>



        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-title">Total Campaigns</div>
              <div className="stat-icon-wrapper purple">
                <i className="bi bi-megaphone-fill"></i>
              </div>
            </div>
            <div className="stat-card-value">{totalCampaigns}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-title">Active Campaigns</div>
              <div className="stat-icon-wrapper green">
                <i className="bi bi-check-circle-fill"></i>
              </div>
            </div>
            <div className="stat-card-value">{activeCampaigns}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-title">Total Bots</div>
              <div className="stat-icon-wrapper yellow">
                <i className="bi bi-cpu-fill"></i>
              </div>
            </div>
            <div className="stat-card-value">{totalBots}</div>
          </div>
        </div>

        {/* Campaigns Section */}
        <div className="section-header">
          <h2>Your Campaigns</h2>
        </div>

        <div className="campaigns-grid">
          {data?.campaigns?.map((item) => {
            const campaign = item.campaign;
            const daysLeft = calculateDaysLeft(item.end_date);
            const expiryWarning = getExpiryWarning(daysLeft);
            const callStats = item.call_stats;

            return (
              <div key={item.id} className="campaign-card">
                {expiryWarning && (
                  <div
                    className="expiry-warning-bar"
                    style={{ backgroundColor: expiryWarning.color }}
                  >
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{expiryWarning.text}</span>
                  </div>
                )}

                {/* Row 1: Campaign Title with Count and Status */}
                <div className="campaign-title-row">
                  <div className="campaign-title-left">
                    <h3 className="campaign-name-large">
                      {formatCampaignName(campaign.name)}
                    </h3>
                    <span className="bot-count">{item.bot_count || 0}</span>
                  </div>
                  <span
                    className={`status-badge-large ${item.status?.status_name === "Enabled"
                      ? "active"
                      : "paused"
                      }`}
                  >
                    <i className="bi bi-circle-fill"></i>
                    {item.status?.status_name || "Unknown"}
                  </span>
                </div>

                {/* Row 2: Model */}
                <div className="campaign-model-row">
                  <span className="model-label">Model</span>
                  <span className="model-value">
                    {item.model?.name || "N/A"}
                  </span>
                </div>

                {/* Row 3: Calls and Dates */}
                <div className="campaign-metrics-row">
                  <div className="metrics-left">
                    <div className="metric-compact">
                      <span className="metric-label-compact">
                        Transferred Calls
                      </span>
                      <span className="metric-value-compact">
                        {callStats?.calls_transferred?.toLocaleString() || 0}
                        <span className="percentage-compact">
                          ({callStats?.transfer_percentage || 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="metric-compact">
                      <span className="metric-label-compact">Total Calls</span>
                      <span className="metric-value-compact">
                        {callStats?.total_calls?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                  <div className="dates-right">
                    <div className="date-compact">
                      <span className="date-label-compact">
                        <i className="bi bi-calendar3"></i>
                        Start Date
                      </span>
                      <span className="date-value-compact">
                        {formatDate(item.start_date)}
                      </span>
                    </div>
                    <div className="date-compact expiry">
                      <span className="date-label-compact">
                        <i className="bi bi-calendar3"></i>
                        Expiry Date
                      </span>
                      <span className="date-value-compact">
                        {formatDate(item.end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="view-dashboard-btn"
                  onClick={() => window.location.href = `/dashboard?campaign_id=${item.id}&view=dashboard`}
                >
                  View Dashboard
                  <i className="bi bi-grid-3x3-gap-fill"></i>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

const styles = `
  @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #F9FAFB;
    color: #111827;
    line-height: 1.3;
    font-size: 14px;
    padding: 1.5rem 0rem;
    zoom: 0.75;
  }

  .container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 0.75rem;
  }

  /* Loading & Error States */
  .loading-container,
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
  }

  }

  .error-container i {
    font-size: 3rem;
    color: #DC2626;
  }

  .error-container p {
    font-size: 1rem;
    color: #6B7280;
  }

  .retry-btn {
    padding: 0.625rem 1.25rem;
    background-color: #4F46E5;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn:hover {
    background-color: #3730A3;
  }

  /* Header */
  .header {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header h1 {
    font-size: 1.875rem;
    font-weight: 400;
    color: #111827;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header .company-name {
    color: #4F46E5;
    font-weight: 500;
  }

  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    background: #EDE9FE;
    color: #7C3AED;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Header Buttons */
  .header-buttons {
    display: flex;
    gap: 0.75rem;
  }
  .request-campaign-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }

  .request-campaign-btn:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    transform: translateY(-2px);
  }

  .request-campaign-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
  }

  .request-campaign-btn i {
    font-size: 1rem;
  }

  .manage-team-btn,
  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  

  .manage-team-btn {
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: white;
    border: none;
  }

  .manage-team-btn:hover {
    background: linear-gradient(135deg, #3730A3 0%, #6D28D9 100%);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    transform: translateY(-2px);
  }

  .manage-team-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
  }

  .logout-btn {
    background-color: white;
    border: 1px solid #E5E7EB;
    color: #6B7280;
  }

  .logout-btn:hover {
    background-color: #F9FAFB;
    border-color: #D1D5DB;
    color: #4B5563;
  }

  .logout-btn:active {
    background-color: #F3F4F6;
    border-color: #9CA3AF;
  }

  .logout-btn i,
  .manage-team-btn i {
    font-size: 1rem;
  }

  /* Stats Cards */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: white;
    border: 1px solid #F3F4F6;
    border-radius: 12px;
    padding: 1.25rem 1.25rem;
  }

  .stat-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    min-height: 40px;
  }

  .stat-card-title {
    font-size: 0.938rem;
    color: #6B7280;
    font-weight: 400;
  }

  .stat-icon-wrapper {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-icon-wrapper.purple {
    background: #EDE9FE;
  }

  .stat-icon-wrapper.green {
    background: #D1FAE5;
  }

  .stat-icon-wrapper.yellow {
    background: #FEF3C7;
  }

  .stat-icon-wrapper i {
    font-size: 1.25rem;
  }

  .stat-icon-wrapper.purple i {
    color: #7C3AED;
  }

  .stat-icon-wrapper.green i {
    color: #10B981;
  }

  .stat-icon-wrapper.yellow i {
    color: #F59E0B;
  }

  .stat-card-value {
    font-size: 2rem;
    font-weight: 400;
    color: #111827;
    line-height: 1;
  }

  /* Section Header */
  .section-header {
    margin-bottom: 1rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.3;
  }

  /* Campaign Cards */
  .campaigns-grid {
    display: grid;
    gap: 0.75rem;
  }

  .campaign-card {
    background: white;
    border: 1px solid #F3F4F6;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .campaign-card:hover {
    border-color: #E5E7EB;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  /* Expiry Warning Bar - Smaller */
  .expiry-warning-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 0.3rem 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    color: white;
    font-size: 0.7rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .expiry-warning-bar i {
    font-size: 0.7rem;
  }

  .expiry-warning-bar + .campaign-title-row {
    margin-top: 1.75rem;
  }

  /* Row 1: Campaign Title with Count and Status */
  .campaign-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #E5E7EB;
  }

  .campaign-title-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .campaign-name-large {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.2;
    margin: 0;
  }

  .bot-count {
    font-size: 1.25rem;
    font-weight: 600;
    color: #4F46E5;
    padding: 0.25rem 0.75rem;
    background: #EDE9FE;
    border-radius: 6px;
  }

  .status-badge-large {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .status-badge-large.active {
    background: #D1FAE5;
    color: #059669;
  }

  .status-badge-large.paused {
    background: #FEE2E2;
    color: #DC2626;
  }

  .status-badge-large i {
    font-size: 0.625rem;
  }

  /* Row 2: Model */
  .campaign-model-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    background: #F9FAFB;
    border-radius: 8px;
  }

  .model-label {
    font-size: 0.875rem;
    color: #6B7280;
    font-weight: 400;
  }

  .model-value {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 600;
  }

  /* Row 3: Calls and Dates */
  .campaign-metrics-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 2rem;
  }

  .metrics-left {
    display: flex;
    gap: 2rem;
    flex: 1;
  }

  .metric-compact {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-label-compact {
    font-size: 0.75rem;
    color: #9CA3AF;
    font-weight: 400;
  }

  .metric-value-compact {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 600;
  }

  .percentage-compact {
    font-size: 0.75rem;
    color: #10B981;
    font-weight: 500;
    margin-left: 0.25rem;
  }

  .dates-right {
    display: flex;
    gap: 2rem;
    flex-shrink: 0;
  }

  .date-compact {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .date-label-compact {
    font-size: 0.75rem;
    color: #9CA3AF;
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .date-label-compact i {
    font-size: 0.75rem;
  }

  .date-value-compact {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 500;
  }

  .date-compact.expiry .date-value-compact {
    color: #F59E0B;
    font-weight: 600;
  }

  /* View Dashboard Button */
  .view-dashboard-btn {
    width: 100%;
    padding: 0.625rem 1rem;
    background-color: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    color: #4B5563;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .view-dashboard-btn:hover {
    background-color: #F3F4F6;
    border-color: #D1D5DB;
    color: #374151;
  }

  .view-dashboard-btn:active {
    background-color: #E5E7EB;
  }

  .view-dashboard-btn i {
    font-size: 1rem;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .campaign-metrics-row {
      flex-direction: column;
      gap: 1rem;
    }

    .dates-right {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-buttons {
      width: 100%;
    }

    .manage-team-btn,
    .logout-btn {
      flex: 1;
      justify-content: center;
    }

    .campaign-title-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .campaign-title-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .metrics-left,
    .dates-right {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
`;

export default ClientLanding;