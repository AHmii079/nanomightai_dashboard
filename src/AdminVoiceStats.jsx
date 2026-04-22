import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "./api";

const AdminVoiceStats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");
  const [expandedCampaignIds, setExpandedCampaignIds] = useState([]);

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [selectedFilters, setSelectedFilters] = useState([]);

  // Filter states
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [campaignSearchTerm, setCampaignSearchTerm] = useState("");
  const [serverSearchTerm, setServerSearchTerm] = useState("");

  const callsChartRef = useRef(null);
  const transfersChartRef = useRef(null);
  const callsChartInstance = useRef(null);
  const transfersChartInstance = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchStats = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      console.log("=== API Request Debug Info ===");
      console.log("Base URL:", api.defaults?.baseURL || "Not set");
      console.log("Token:", localStorage.getItem("token") ? "Present" : "Missing");

      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      console.log("Request params:", params);

      // Fetch voice stats
      const voiceResponse = await api.get("/campaigns/stats/overall-voice-stats", {
        params,
        timeout: 120000,
        signal: abortControllerRef.current.signal
      });

      console.log("✅ Voice stats fetched successfully");

      // Fetch campaign stats
      const campaignResponse = await api.get("/campaigns/stats/all-campaigns-transfer-stats", {
        params,
        timeout: 120000,
        signal: abortControllerRef.current.signal
      });

      console.log("✅ Campaign stats fetched successfully");

      setStats(voiceResponse.data);
      setCampaignStats(campaignResponse.data);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        console.log("Request was cancelled");
        return;
      }

      console.error("❌ Error fetching stats:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        response: err.response,
        config: err.config
      });

      const debugData = {
        errorType: err.name || "Unknown",
        errorCode: err.code || "No code",
        errorMessage: err.message,
        requestURL: err.config?.url || "Unknown",
        baseURL: err.config?.baseURL || api.defaults?.baseURL || "Not set",
        responseStatus: err.response?.status || "No response",
        responseData: err.response?.data || "No data"
      };
      setDebugInfo(debugData);

      let errorMessage = "Failed to fetch voice statistics";
      if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message === "Network Error" || err.message?.includes("NetworkError")) {
        errorMessage = "Network Error: Unable to reach the server. Please check your connection and API configuration.";
      } else if (err.response) {
        errorMessage = `Server Error: ${err.response.status} - ${err.response.data?.message || err.message}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [startDate, endDate]);

  useEffect(() => {
    if (!stats || !stats.voice_stats) return;

    if (callsChartInstance.current) {
      callsChartInstance.current.destroy();
    }
    if (transfersChartInstance.current) {
      transfersChartInstance.current.destroy();
    }

    const voiceNames = stats.voice_stats.map(v => v.voice_name);
    const totalCallsData = stats.voice_stats.map(v => v.total_calls);
    const transfersData = stats.voice_stats.map(v => v.transferred_calls);

    const colors = [
      '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];

    if (callsChartRef.current) {
      const ctx = callsChartRef.current.getContext("2d");
      callsChartInstance.current = new Chart(ctx, {
        type: "pie",
        data: {
          labels: voiceNames,
          datasets: [{
            data: totalCallsData,
            backgroundColor: colors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            title: {
              display: true,
              text: 'Total Calls Distribution',
              font: { size: 16 }
            }
          }
        }
      });
    }

    if (transfersChartRef.current) {
      const ctx = transfersChartRef.current.getContext("2d");
      transfersChartInstance.current = new Chart(ctx, {
        type: "pie",
        data: {
          labels: voiceNames,
          datasets: [{
            data: transfersData,
            backgroundColor: colors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            title: {
              display: true,
              text: 'Transfers Distribution',
              font: { size: 16 }
            }
          }
        }
      });
    }

    return () => {
      if (callsChartInstance.current) callsChartInstance.current.destroy();
      if (transfersChartInstance.current) transfersChartInstance.current.destroy();
    };
  }, [stats]);

  const toggleCampaignExpand = (campaignId) => {
    setExpandedCampaignIds(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const getFilterDisplayName = (filterValue) => {
    if (filterValue.startsWith("model-")) return filterValue.replace("model-", "");
    if (filterValue.startsWith("status-")) return filterValue.replace("status-", "");
    if (filterValue.startsWith("voice-")) return filterValue.replace("voice-", "");
    return filterValue;
  };

  const handleFilterChange = (e) => {
    const value = e.target.value;
    if (value && !selectedFilters.includes(value)) {
      setSelectedFilters([...selectedFilters, value]);
    }
    e.target.value = ""; // Reset dropdown
  };

  const removeFilter = (filterToRemove) => {
    setSelectedFilters(selectedFilters.filter(f => f !== filterToRemove));
  };


  // Filter campaigns
  const filteredCampaigns = campaignStats?.campaigns?.filter((campaign) => {
    const clientMatch = campaign.client_name?.toLowerCase().includes(clientSearchTerm.toLowerCase());
    const campaignMatch = campaign.campaign_name?.toLowerCase().includes(campaignSearchTerm.toLowerCase());
    const serverMatch = serverSearchTerm === "" ||
      campaign.voice_stats?.some(v => v.voice_name?.toLowerCase().includes(serverSearchTerm.toLowerCase()));

    // Handle multiple selected filters
    let matchesSelectedFilters = true;
    if (selectedFilters.length > 0) {
      matchesSelectedFilters = selectedFilters.every((filter) => {
        if (filter.startsWith("model-")) {
          return campaign.model_name === filter.replace("model-", "");
        } else if (filter.startsWith("status-")) {
          const status = filter.replace("status-", "");
          if (status === "Active") return campaign.is_active === true;
          if (status === "Inactive") return campaign.is_active === false;
        } else if (filter.startsWith("voice-")) {
          const voiceName = filter.replace("voice-", "");
          return campaign.voice_stats?.some(v => v.voice_name === voiceName);
        }
        return true;
      });
    }

    return clientMatch && campaignMatch && serverMatch && matchesSelectedFilters;
  }) || [];

  const handleSort = (key) => {
    let direction = 'asc';

    // Default direction logic
    // Numeric stats and Time usually start Descending (Highest/Newest first)
    if (sortConfig.key !== key) {
      if (['total_calls', 'transferred', 'transfer_rate', 'client'].includes(key)) {
        direction = 'desc';
      }
    } else {
      // Toggle direction
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    setSortConfig({ key, direction });
  };

  const sortedCampaigns = useMemo(() => {
    let sortableItems = [...filteredCampaigns];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'client':
            // Sort by time/date proxy (campaign_id is usually chronological)
            aValue = a.created_at || a.campaign_id;
            bValue = b.created_at || b.campaign_id;
            break;
          case 'campaign':
            aValue = a.campaign_name?.toLowerCase();
            bValue = b.campaign_name?.toLowerCase();
            break;
          case 'model':
            aValue = a.model_name?.toLowerCase();
            bValue = b.model_name?.toLowerCase();
            break;
          case 'status':
            aValue = a.is_active ? 1 : 0;
            bValue = b.is_active ? 1 : 0;
            break;
          case 'total_calls':
            aValue = a.total_calls || 0;
            bValue = b.total_calls || 0;
            break;
          case 'transferred':
            aValue = a.transferred_calls || 0;
            bValue = b.transferred_calls || 0;
            break;
          case 'transfer_rate':
            aValue = parseFloat(a.transfer_rate) || 0;
            bValue = parseFloat(b.transfer_rate) || 0;
            break;
          default:
            return 0;
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
          <h1 style={{ color: "white", fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>
            Voice Statistics Dashboard
          </h1>
          <p style={{ color: "rgba(255,255,255,0.9)", margin: 0, fontSize: "14px" }}>
            Real-time voice performance analytics
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1600px", margin: "24px auto", padding: "0 24px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "flex-end", justifyContent: "flex-end" }}>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  outline: "none",
                  color: "#374151",
                  height: "38px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  outline: "none",
                  color: "#374151",
                  height: "38px",
                  boxSizing: "border-box"
                }}
              />
            </div>

          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #4f46e5",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px"
            }} />
            <p style={{ color: "#6b7280", fontSize: "16px" }}>
              Loading voice statistics...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px"
          }}>
            <div style={{ color: "#991b1b", fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
              ⚠️ {error}
            </div>

            {debugInfo && (
              <details style={{ marginTop: "16px", fontSize: "13px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "600", color: "#7f1d1d", marginBottom: "8px" }}>
                  🔍 Debug Information (Click to expand)
                </summary>
                <pre style={{
                  backgroundColor: "#fff",
                  padding: "12px",
                  borderRadius: "4px",
                  marginTop: "8px",
                  overflow: "auto",
                  fontSize: "12px",
                  border: "1px solid #fca5a5"
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}

            <button
              onClick={fetchStats}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Stats Content */}
        {stats && !loading && (
          <>
            {/* Summary Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "24px"
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                  Total Calls
                </div>
                <div style={{ fontSize: "32px", fontWeight: "700", color: "#111827" }}>
                  {stats.total_calls?.toLocaleString() || 0}
                </div>
              </div>

              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                  Total Transferred
                </div>
                <div style={{ fontSize: "32px", fontWeight: "700", color: "#10b981" }}>
                  {stats.total_transferred?.toLocaleString() || 0}
                </div>
              </div>

              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                  Transfer Rate
                </div>
                <div style={{ fontSize: "32px", fontWeight: "700", color: "#4f46e5" }}>
                  {stats.overall_transfer_rate}%
                </div>
              </div>

              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                  Null Voice Calls
                </div>
                <div style={{ fontSize: "32px", fontWeight: "700", color: "#f59e0b" }}>
                  {stats.null_voice_calls?.toLocaleString() || 0}
                  <span style={{ fontSize: "14px", color: "#6b7280", marginLeft: "8px" }}>
                    ({stats.null_voice_ratio}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "24px",
              marginBottom: "24px"
            }}>
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                height: "400px"
              }}>
                <canvas ref={callsChartRef} />
              </div>
              <div style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                height: "400px"
              }}>
                <canvas ref={transfersChartRef} />
              </div>
            </div>

            {/* Voice Stats Table */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden",
              marginBottom: "24px"
            }}>
              <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", margin: 0 }}>
                  Voice Performance Details
                </h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ backgroundColor: "#f9fafb" }}>
                    <tr>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        Voice Name
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        Total Calls
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        A Grade Transfer
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        B Grade Transfer
                      </th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
                        Transfers
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.voice_stats?.map((voice, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#111827", fontWeight: "600" }}>
                          {voice.voice_name}
                        </td>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#6b7280" }}>
                          {voice.total_calls?.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#10b981" }}>
                          {voice.a_grade_transferred_calls?.toLocaleString()} ({voice.a_grade_transfer_rate}%)
                        </td>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#f59e0b" }}>
                          {voice.b_grade_transferred_calls?.toLocaleString()} ({voice.b_grade_transfer_rate}%)
                        </td>
                        <td style={{ padding: "12px", fontSize: "14px", color: "#4f46e5", fontWeight: "600" }}>
                          {voice.transferred_calls?.toLocaleString()} ({voice.transfer_rate}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Stats Section */}
            {campaignStats && (
              <>
                {/* Search Filters */}
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px"
                  }}>
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "6px"
                      }}>
                        Search Clients
                      </label>
                      <input
                        type="text"
                        placeholder="Search by client name..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "6px"
                      }}>
                        Search Campaigns
                      </label>
                      <input
                        type="text"
                        placeholder="Search by campaign name..."
                        value={campaignSearchTerm}
                        onChange={(e) => setCampaignSearchTerm(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "6px"
                      }}>
                        Search Voices
                      </label>
                      <input
                        type="text"
                        placeholder="Search by voice name..."
                        value={serverSearchTerm}
                        onChange={(e) => setServerSearchTerm(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Campaign Statistics Table */}
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#111827"
                      }}>
                        Campaign Statistics ({filteredCampaigns.length} campaigns)
                      </h2>
                      {selectedFilters.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {selectedFilters.map((filter) => (
                            <div
                              key={filter}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                backgroundColor: "#e0e7ff",
                                color: "#3730a3", // indigo-800
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "600",
                                border: "1px solid #c7d2fe"
                              }}
                            >
                              <span>
                                {filter.startsWith("model-") && <span style={{ opacity: 0.7 }}>Model: </span>}
                                {filter.startsWith("status-") && <span style={{ opacity: 0.7 }}>Status: </span>}
                                {filter.startsWith("voice-") && <span style={{ opacity: 0.7 }}>Voice: </span>}
                                {getFilterDisplayName(filter)}
                              </span>
                              <button
                                onClick={() => removeFilter(filter)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#3730a3",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  padding: "0",
                                  lineHeight: "1",
                                  fontWeight: "bold",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: "200px" }}>
                      <select
                        onChange={handleFilterChange}
                        style={{
                          width: "100%",
                          padding: "6px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: "white",
                          cursor: "pointer",
                          boxSizing: "border-box",
                          color: "#374151",
                          fontWeight: "500",
                          height: "36px"
                        }}
                      >
                        <option value="">Filter By...</option>
                        <optgroup label="Model">
                          {[...new Set(campaignStats?.campaigns?.map(c => c.model_name))].filter(Boolean).sort().map(model => (
                            <option key={`model-${model}`} value={`model-${model}`}>{model}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Status">
                          <option value="status-Active">Active</option>
                          <option value="status-Inactive">Inactive</option>
                        </optgroup>
                        <optgroup label="Voice">
                          {[...new Set(campaignStats?.campaigns?.flatMap(c => c.voice_stats?.map(v => v.voice_name) || []))].filter(Boolean).sort().map(voice => (
                            <option key={`voice-${voice}`} value={`voice-${voice}`}>{voice}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px"
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: "#f9fafb",
                          borderBottom: "2px solid #e5e7eb"
                        }}>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            width: "30px"
                          }}></th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                            width: "60px"
                          }}>S.No</th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('client')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              Client
                              {sortConfig.key === 'client' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('campaign')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              Campaign
                              {sortConfig.key === 'campaign' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('model')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}
                            >
                              Model
                              {sortConfig.key === 'model' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('status')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}
                            >
                              Status
                              {sortConfig.key === 'status' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('total_calls')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}
                            >
                              Total Calls
                              {sortConfig.key === 'total_calls' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('transferred')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}
                            >
                              Transferred
                              {sortConfig.key === 'transferred' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151"
                          }}>
                            <div
                              onClick={() => handleSort('transfer_rate')}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}
                            >
                              Transfer Rate
                              {sortConfig.key === 'transfer_rate' && (
                                <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCampaigns.map((campaign, idx) => (
                          <React.Fragment key={campaign.campaign_id}>
                            <tr
                              style={{
                                borderBottom: expandedCampaignIds.includes(campaign.campaign_id) ? "none" : "1px solid #e5e7eb",
                                backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                                cursor: "pointer",
                                transition: "background-color 0.2s"
                              }}
                              onClick={() => toggleCampaignExpand(campaign.campaign_id)}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb"}
                            >
                              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block",
                                  transition: "transform 0.2s",
                                  transform: expandedCampaignIds.includes(campaign.campaign_id) ? "rotate(90deg)" : "rotate(0deg)"
                                }}>
                                  ▶
                                </span>
                              </td>
                              <td style={{
                                padding: "12px 16px",
                                textAlign: "center",
                                fontWeight: "500",
                                color: "#6b7280"
                              }}>
                                {idx + 1}
                              </td>
                              <td style={{
                                padding: "12px 16px",
                                fontWeight: "600",
                                color: "#111827"
                              }}>
                                {campaign.client_name}
                              </td>

                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ fontWeight: "600", color: "#111827" }}>
                                  {campaign.campaign_name}
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                <span style={{
                                  padding: "4px 8px",
                                  backgroundColor: campaign.model_name === "Advanced" ? "#dbeafe" : "#fef3c7",
                                  color: campaign.model_name === "Advanced" ? "#1e40af" : "#b45309",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "600"
                                }}>
                                  {campaign.model_name}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                <span style={{
                                  padding: "4px 8px",
                                  backgroundColor: campaign.is_active ? "#d1fae5" : "#f3f4f6",
                                  color: campaign.is_active ? "#065f46" : "#6b7280",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600"
                                }}>
                                  {campaign.is_active ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "center", color: "#6b7280" }}>
                                {campaign.total_calls?.toLocaleString()}
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#10b981" }}>
                                {campaign.transferred_calls?.toLocaleString()}
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", color: "#4f46e5" }}>
                                {campaign.transfer_rate}%
                              </td>
                            </tr>

                            {/* Expanded Voice Details */}
                            {expandedCampaignIds.includes(campaign.campaign_id) && campaign.voice_stats && campaign.voice_stats.length > 0 && (
                              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td colSpan="9" style={{ padding: 0, backgroundColor: "#f9fafb" }}>
                                  <div style={{ padding: "16px 24px", animation: "slideDown 0.3s ease-out" }}>
                                    <div style={{
                                      fontSize: "13px",
                                      fontWeight: "600",
                                      color: "#374151",
                                      marginBottom: "12px"
                                    }}>
                                      Voice Performance for this Campaign ({campaign.voice_stats.length} voices)
                                    </div>
                                    <table style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: "13px",
                                      backgroundColor: "white",
                                      borderRadius: "8px",
                                      overflow: "hidden"
                                    }}>
                                      <thead>
                                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                                          <th style={{
                                            padding: "10px 12px",
                                            textAlign: "left",
                                            fontWeight: "600",
                                            color: "#4b5563"
                                          }}>Voice Name</th>
                                          <th style={{
                                            padding: "10px 12px",
                                            textAlign: "center",
                                            fontWeight: "600",
                                            color: "#4b5563"
                                          }}>Total Calls</th>
                                          <th style={{
                                            padding: "10px 12px",
                                            textAlign: "center",
                                            fontWeight: "600",
                                            color: "#4b5563"
                                          }}>A Grade Transfer</th>
                                          <th style={{
                                            padding: "10px 12px",
                                            textAlign: "center",
                                            fontWeight: "600",
                                            color: "#4b5563"
                                          }}>B Grade Transfer</th>
                                          <th style={{
                                            padding: "10px 12px",
                                            textAlign: "center",
                                            fontWeight: "600",
                                            color: "#4b5563"
                                          }}>Transfers</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {campaign.voice_stats.map((voice, vidx) => (
                                          <tr key={vidx} style={{
                                            borderBottom: vidx < campaign.voice_stats.length - 1 ? "1px solid #e5e7eb" : "none"
                                          }}>
                                            <td style={{ padding: "10px 12px" }}>
                                              <div style={{ fontWeight: "600", color: "#111827" }}>
                                                {voice.voice_name}
                                              </div>
                                            </td>
                                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#6b7280" }}>
                                              {voice.total_calls?.toLocaleString()}
                                            </td>
                                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#059669" }}>
                                              {voice.a_grade_transferred_calls?.toLocaleString()} ({voice.a_grade_transfer_rate}%)
                                            </td>
                                            <td style={{ padding: "10px 12px", textAlign: "center", color: "#d97706" }}>
                                              {voice.b_grade_transferred_calls?.toLocaleString()} ({voice.b_grade_transfer_rate}%)
                                            </td>
                                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: "600", color: "#4f46e5" }}>
                                              {voice.transferred_calls?.toLocaleString()} ({voice.transfer_rate}%)
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
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
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminVoiceStats;