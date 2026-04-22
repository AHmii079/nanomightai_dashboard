import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import Loader from "./components/Loader";

const AdminCampaigns = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);

  // Filter states
  const [clientFilter, setClientFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showExpired, setShowExpired] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Helper function to check if expiry is within 1 week
  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const today = new Date();
    const expiryDate = new Date(endDate);
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    return expiryDate <= oneWeekFromNow && expiryDate >= today;
  };

  // Helper function to check if already expired
  const isExpired = (endDate) => {
    if (!endDate) return false;
    const today = new Date();
    const expiryDate = new Date(endDate);
    return expiryDate < today;
  };

  // Get expiry style based on date
  const getExpiryStyle = (endDate) => {
    if (isExpired(endDate)) {
      return {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
      };
    }
    if (isExpiringSoon(endDate)) {
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        animation: "pulse 2s infinite",
      };
    }
    return {
      color: "#6b7280",
      fontSize: "13px",
    };
  };

  // Get campaigns expiring soon (within 7 days)
  const expiringSoonCampaigns = campaignData?.campaigns?.filter((campaign) => {
    return isExpiringSoon(campaign.end_date) && campaign.current_status !== 'Archived';
  }) || [];

  // Get campaigns that are already expired
  const expiredCampaigns = campaignData?.campaigns?.filter((campaign) => {
    return isExpired(campaign.end_date) && campaign.current_status !== 'Archived';
  }) || [];

  // Fetch campaign stats on mount
  useEffect(() => {
    const fetchCampaignStats = async () => {
      setLoading(true);
      try {
        const response = await api.get("/campaigns/stats/all-campaigns");
        setCampaignData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching campaign stats:", err);
        setError("Failed to fetch campaign statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignStats();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  const toggleCampaignExpand = (campaignId) => {
    setExpandedCampaignId(
      expandedCampaignId === campaignId ? null : campaignId
    );
  };

  // Helper function to get filter display name
  const getFilterDisplayName = (filterValue) => {
    const filterMap = {
      "archived": "Archived",
      "disabled": "Disabled",
      "enabled": "Enabled",
      "not-approved": "Not Approved",
      "testing": "Testing",
      "active": "Active",
      "inactive": "Inactive",
      "custom-yes": "Is Custom: Yes",
      "custom-no": "Is Custom: No",
      "long-call-yes": "Long Call Scripts: Yes",
      "long-call-no": "Long Call Scripts: No",
      "disposition-yes": "Disposition Set: Yes",
      "disposition-no": "Disposition Set: No",
    };
    return filterMap[filterValue] || filterValue;
  };

  // Handle filter selection
  const handleFilterChange = (e) => {
    const value = e.target.value;
    if (value && !selectedFilters.includes(value)) {
      setSelectedFilters([...selectedFilters, value]);
    }
    e.target.value = ""; // Reset dropdown
  };

  // Remove a filter
  const removeFilter = (filterToRemove) => {
    setSelectedFilters(selectedFilters.filter(f => f !== filterToRemove));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Client-side filtering
  const filteredCampaigns = campaignData?.campaigns?.filter((campaign) => {
    const matchesClient =
      !clientFilter ||
      campaign.client_name?.toLowerCase().includes(clientFilter.toLowerCase()) ||
      campaign.client_username?.toLowerCase().includes(clientFilter.toLowerCase());

    const matchesCampaign =
      !campaignFilter ||
      campaign.campaign_name?.toLowerCase().includes(campaignFilter.toLowerCase());

    // Handle multiple selected filters - campaign must match ALL selected filters
    let matchesSelectedFilters = true;
    if (selectedFilters.length > 0) {
      matchesSelectedFilters = selectedFilters.every((filter) => {
        if (filter === "archived" || filter === "disabled" ||
          filter === "enabled" || filter === "not-approved" ||
          filter === "testing") {
          return campaign.current_status?.toLowerCase() === filter.replace("-", " ");
        } else if (filter === "active") {
          return campaign.is_active === true;
        } else if (filter === "inactive") {
          return campaign.is_active === false;
        } else if (filter === "custom-yes") {
          return campaign.is_custom === true;
        } else if (filter === "custom-no") {
          return campaign.is_custom === false;
        } else if (filter === "long-call-yes") {
          return campaign.long_call_scripts_active === true;
        } else if (filter === "long-call-no") {
          return campaign.long_call_scripts_active === false;
        } else if (filter === "disposition-yes") {
          return campaign.disposition_set === true;
        } else if (filter === "disposition-no") {
          return campaign.disposition_set === false;
        }
        return true;
      });
    }

    return matchesClient && matchesCampaign && matchesSelectedFilters;
  }) || [];

  const sortedCampaigns = React.useMemo(() => {
    let sortableItems = [...filteredCampaigns];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Special handling for specific columns
        if (sortConfig.key === 'active_bots') {
          aValue = a.is_active ? a.bot_count : 0;
          bValue = b.is_active ? b.bot_count : 0;
        } else if (sortConfig.key === 'total_bots') {
          aValue = a.bot_count;
          bValue = b.bot_count;
        }

        // Handle null/undefined
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // String comparison
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCampaigns, sortConfig]);

  const openClientDashboard = (campaignId) => {
    window.open(
      `https://dashboard.xlitexcore.xdialnetworks.com/dashboard?campaign_id=${campaignId}`,
      "_blank"
    );
  };

  const openAdminDashboard = (campaignId) => {
    window.open(
      `https://dashboard.xlitexcore.xdialnetworks.com/admin-dashboard?campaign_id=${campaignId}`,
      "_blank"
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "2px solid #e5e7eb",
          padding: "16px 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1600px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 4px 0",
                fontSize: "24px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              Campaign Statistics Dashboard
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
              Overview of all client campaigns
            </p>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "24px" }}>
        {/* Filters Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Search Client
              </label>
              <input
                type="text"
                placeholder="Search by name or username..."
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Search Campaign
              </label>
              <input
                type="text"
                placeholder="Search by campaign name..."
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Filter By
              </label>
              <select
                onChange={handleFilterChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select filter...</option>
                <optgroup label="By Current Status">
                  <option value="archived">Archived</option>
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                  <option value="not-approved">Not Approved</option>
                  <option value="testing">Testing</option>
                </optgroup>
                <optgroup label="By Activity Status">
                  <option value="active">Active (calls in last minute)</option>
                  <option value="inactive">Inactive (no recent calls)</option>
                </optgroup>
                <optgroup label="By Is Custom">
                  <option value="custom-yes">Yes</option>
                  <option value="custom-no">No</option>
                </optgroup>
                <optgroup label="By Long Call Scripts Active">
                  <option value="long-call-yes">Yes</option>
                  <option value="long-call-no">No</option>
                </optgroup>
                <optgroup label="By Disposition Set">
                  <option value="disposition-yes">Yes</option>
                  <option value="disposition-no">No</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Selected Filters Display */}
          {selectedFilters.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {selectedFilters.map((filter) => (
                  <div
                    key={filter}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      backgroundColor: "#10b981",
                      color: "white",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    <span>{getFilterDisplayName(filter)}</span>
                    <button
                      onClick={() => removeFilter(filter)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "0",
                        lineHeight: "1",
                        fontWeight: "bold",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "40px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <Loader size="large" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #fecaca",
              marginBottom: "24px",
            }}
          >
            <p style={{ margin: 0, color: "#dc2626", fontWeight: "500" }}>
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Summary Stats Cards */}
        {campaignData && !loading && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderTop: "4px solid #4f46e5",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Total Campaigns
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#4f46e5",
                  }}
                >
                  {campaignData.total_campaigns || 0}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderTop: "4px solid #10b981",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Active Campaigns
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#10b981",
                  }}
                >
                  {campaignData.total_active_campaigns || 0}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderTop: "4px solid #f59e0b",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Total Bots
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#f59e0b",
                  }}
                >
                  {campaignData.total_bots_across_all_campaigns || 0}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderTop: "4px solid #8b5cf6",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#6b7280",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Active Bots
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#8b5cf6",
                  }}
                >
                  {campaignData.total_active_bots_across_all_campaigns || 0}
                </p>
              </div>
            </div>

            {/* Expiring Soon / Expired Alert Section */}
            {(expiringSoonCampaigns.length > 0 || expiredCampaigns.length > 0) && (
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  border: "1px solid #fcd34d",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>⚠️</span>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#92400e",
                      }}
                    >
                      Expiring Soon ({expiringSoonCampaigns.length})
                    </h3>
                  </div>
                  {expiredCampaigns.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ fontSize: "14px", fontWeight: "600", color: "#b91c1c", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={showExpired}
                          onChange={(e) => setShowExpired(e.target.checked)}
                          style={{ cursor: "pointer", accentColor: "#b91c1c" }}
                        />
                        Show Expired ({expiredCampaigns.length})
                      </label>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  {expiringSoonCampaigns.map((campaign) => (
                    <div
                      key={`expiring-${campaign.client_campaign_model_id}`}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        border: "1px solid #fcd34d",
                        minWidth: "200px",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleCampaignExpand(campaign.client_campaign_model_id)}
                    >
                      <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                        {campaign.client_name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                        {campaign.campaign_name} (ID: {campaign.client_campaign_model_id})
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#92400e",
                        }}
                      >
                        <span>📅</span>
                        Expires: {new Date(campaign.end_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ))}

                  {showExpired && expiredCampaigns.map((campaign) => (
                    <div
                      key={`expired-${campaign.client_campaign_model_id}`}
                      style={{
                        backgroundColor: "#fef2f2",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        border: "1px solid #fca5a5",
                        minWidth: "200px",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleCampaignExpand(campaign.client_campaign_model_id)}
                    >
                      <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                        {campaign.client_name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                        {campaign.campaign_name} (ID: {campaign.client_campaign_model_id})
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#991b1b",
                        }}
                      >
                        <span>❌</span>
                        Expired: {new Date(campaign.end_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign Statistics Table */}
            {filteredCampaigns.length > 0 ? (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    Campaign Details ({sortedCampaigns.length})
                  </h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                      tableLayout: "fixed",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f9fafb",
                          borderBottom: "2px solid #e5e7eb",
                        }}
                      >
                        <th
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            width: "35px",
                          }}
                        ></th>
                        <th
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            width: "50px",
                          }}
                        >
                          SR No
                        </th>
                        <th
                          onClick={() => handleSort('client_name')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "13%",
                          }}
                        >
                          Client {sortConfig.key === 'client_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('campaign_name')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "14%",
                          }}
                        >
                          Campaign {sortConfig.key === 'campaign_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('client_campaign_model_id')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "50px",
                          }}
                        >
                          ID {sortConfig.key === 'client_campaign_model_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('model_name')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "8%",
                          }}
                        >
                          Model {sortConfig.key === 'model_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('transfer_setting')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "9%",
                          }}
                        >
                          Transfer {sortConfig.key === 'transfer_setting' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('current_status')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "8%",
                          }}
                        >
                          Status {sortConfig.key === 'current_status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('is_active')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "8%",
                          }}
                        >
                          Active {sortConfig.key === 'is_active' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('end_date')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "9%",
                          }}
                        >
                          Expiry {sortConfig.key === 'end_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('active_bots')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "6%",
                          }}
                        >
                          Active {sortConfig.key === 'active_bots' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('total_bots')}
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            cursor: "pointer",
                            userSelect: "none",
                            width: "6%",
                          }}
                        >
                          Total {sortConfig.key === 'total_bots' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        {localStorage.getItem('role') !== 'onboarding' && localStorage.getItem('role') !== 'qa' && (
                          <th
                            style={{
                              padding: "10px 8px",
                              textAlign: "center",
                              fontWeight: "600",
                              color: "#374151",
                              width: "7%",
                            }}
                          >
                            Client
                          </th>
                        )}
                        <th
                          style={{
                            padding: "10px 8px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            width: "7%",
                          }}
                        >
                          Admin
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCampaigns.map((campaign, idx) => (
                        <React.Fragment key={campaign.client_campaign_model_id}>
                          <tr
                            style={{
                              borderBottom:
                                expandedCampaignId === campaign.client_campaign_model_id
                                  ? "none"
                                  : "1px solid #e5e7eb",
                              backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                            }}
                            onClick={() =>
                              toggleCampaignExpand(campaign.client_campaign_model_id)
                            }
                            onMouseOver={(e) =>
                              (e.currentTarget.style.backgroundColor = "#f3f4f6")
                            }
                            onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              idx % 2 === 0 ? "#ffffff" : "#f9fafb")
                            }
                          >
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  transition: "transform 0.2s",
                                  transform:
                                    expandedCampaignId === campaign.client_campaign_model_id
                                      ? "rotate(90deg)"
                                      : "rotate(0deg)",
                                }}
                              >
                                ▶
                              </span>
                            </td>
                            {/* SR No */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                color: "#6b7280",
                                fontWeight: "600",
                              }}
                            >
                              {idx + 1}
                            </td>
                            {/* Client */}
                            <td style={{ padding: "10px 8px" }}>
                              <div>
                                <div style={{ fontWeight: "600", color: "#111827", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {campaign.client_name}
                                </div>
                              </div>
                            </td>
                            {/* Campaign */}
                            <td style={{ padding: "10px 8px", color: "#4b5563", fontSize: "12px" }}>
                              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {campaign.campaign_name || "-"}
                              </div>
                            </td>
                            {/* ID */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                color: "#6b7280",
                                fontWeight: "600",
                                fontFamily: "monospace",
                              }}
                            >
                              {campaign.client_campaign_model_id}
                            </td>
                            {/* Model */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                color: "#6b7280",
                                fontSize: "12px",
                              }}
                            >
                              {campaign.model_name}
                            </td>
                            {/* Transfer Settings */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                color: "#6b7280",
                                fontSize: "12px",
                              }}
                            >
                              {campaign.transfer_setting || "-"}
                            </td>
                            {/* Status */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  padding: "3px 8px",
                                  backgroundColor: "#f3f4f6",
                                  color: "#6b7280",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                }}
                              >
                                {campaign.current_status || "Unknown"}
                              </span>
                            </td>
                            {/* Active Status */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                              }}
                            >
                              <span
                                style={{
                                  padding: "3px 8px",
                                  backgroundColor: campaign.is_active
                                    ? "#d1fae5"
                                    : "#fee2e2",
                                  color: campaign.is_active ? "#065f46" : "#991b1b",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                }}
                              >
                                {campaign.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            {/* Expiry - with highlighting */}
                            <td
                              style={{
                                padding: "10px 12px",
                                textAlign: "center",
                              }}
                            >
                              <span style={getExpiryStyle(campaign.end_date)}>
                                {campaign.end_date
                                  ? new Date(campaign.end_date).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                  : "-"}
                              </span>
                            </td>
                            {/* Active Agents */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                fontWeight: "600",
                                color: campaign.is_active ? "#10b981" : "#f59e0b",
                              }}
                            >
                              {campaign.is_active ? campaign.bot_count : 0}
                            </td>
                            {/* Total Agents */}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                                color: "#6b7280",
                              }}
                            >
                              {campaign.bot_count}
                            </td>
                            {localStorage.getItem('role') !== 'onboarding' && localStorage.getItem('role') !== 'qa' && (
                              <td
                                style={{
                                  padding: "10px 8px",
                                  textAlign: "center",
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openClientDashboard(campaign.client_campaign_model_id);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "background-color 0.2s",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.target.style.backgroundColor = "#2563eb")
                                  }
                                  onMouseOut={(e) =>
                                    (e.target.style.backgroundColor = "#3b82f6")
                                  }
                                >
                                  Open
                                </button>
                              </td>
                            )}
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAdminDashboard(campaign.client_campaign_model_id);
                                }}
                                style={{
                                  padding: "5px 10px",
                                  backgroundColor: "#8b5cf6",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "5px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseOver={(e) =>
                                  (e.target.style.backgroundColor = "#7c3aed")
                                }
                                onMouseOut={(e) =>
                                  (e.target.style.backgroundColor = "#8b5cf6")
                                }
                              >
                                Open
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Server Extension Groups */}
                          {expandedCampaignId === campaign.client_campaign_model_id && (
                            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                              <td
                                colSpan="14"
                                style={{
                                  padding: 0,
                                  backgroundColor: "#f9fafb",
                                }}
                              >
                                <div
                                  style={{
                                    padding: "16px 24px",
                                    animation: "slideDown 0.3s ease-out",
                                  }}
                                >
                                  {/* Last Active Info */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "16px",
                                      marginBottom: "16px",
                                      padding: "12px 16px",
                                      backgroundColor: "white",
                                      borderRadius: "8px",
                                      border: "1px solid #e5e7eb",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span style={{ fontSize: "18px" }}>🕐</span>
                                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                        Last Active:
                                      </span>
                                      <span style={{ fontSize: "13px", color: campaign.last_active ? "#10b981" : "#6b7280" }}>
                                        {campaign.last_active
                                          ? new Date(campaign.last_active).toLocaleString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                          : "Never"}
                                      </span>
                                    </div>
                                    {campaign.campaign_name && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                                          Campaign:
                                        </span>
                                        <span style={{ fontSize: "13px", color: "#4f46e5", fontWeight: "500" }}>
                                          {campaign.campaign_name}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {campaign.server_extension_groups && campaign.server_extension_groups.length > 0 && (
                                    <>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: "600",
                                          color: "#374151",
                                          marginBottom: "12px",
                                        }}
                                      >
                                        Server Extension Groups ({campaign.server_extension_groups.length})
                                      </div>
                                      <table
                                        style={{
                                          width: "100%",
                                          borderCollapse: "collapse",
                                          fontSize: "13px",
                                          backgroundColor: "white",
                                          borderRadius: "8px",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <thead>
                                          <tr
                                            style={{
                                              backgroundColor: "#f3f4f6",
                                            }}
                                          >
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Server
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              IP Address
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Domain
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Extension
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Bot Count
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {campaign.server_extension_groups.map(
                                            (group, gidx) => (
                                              <tr
                                                key={`${group.server_id}-${group.extension_number}`}
                                                style={{
                                                  borderBottom:
                                                    gidx <
                                                      campaign.server_extension_groups.length - 1
                                                      ? "1px solid #e5e7eb"
                                                      : "none",
                                                }}
                                              >
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      fontWeight: "600",
                                                      color: "#111827",
                                                    }}
                                                  >
                                                    {group.server_alias || `Server ${group.server_id}`}
                                                  </div>
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    color: "#6b7280",
                                                    fontFamily: "monospace",
                                                  }}
                                                >
                                                  {group.server_ip}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {group.server_domain || "-"}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    fontWeight: "600",
                                                    color: "#4f46e5",
                                                  }}
                                                >
                                                  {group.extension_number}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    fontWeight: "600",
                                                    color: "#10b981",
                                                  }}
                                                >
                                                  {group.bot_count}
                                                </td>
                                              </tr>
                                            )
                                          )}
                                        </tbody>
                                      </table>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              !loading && (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "80px 24px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "64px",
                      color: "#d1d5db",
                      marginBottom: "16px",
                    }}
                  >
                    📊
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "20px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    No campaigns found
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#6b7280",
                    }}
                  >
                    {clientFilter || campaignFilter || selectedFilters.length > 0
                      ? "Try adjusting your filters"
                      : "No campaign data available"}
                  </p>
                </div>
              )
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminCampaigns;
