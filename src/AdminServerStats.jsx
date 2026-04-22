import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "./api";

const AdminServerStats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverData, setServerData] = useState(null);
  const [expandedServerId, setExpandedServerId] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [serverSearchTerm, setServerSearchTerm] = useState("");

  // Chart ref
  const campaignChartRef = useRef(null);
  const campaignChartInstance = useRef(null);

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get("/client/campaigns/with-campaigns");
        if (response.data && response.data.clients) {
          setClients(response.data.clients);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
    };
    fetchClients();
  }, []);

  // Fetch server stats on mount and when client changes
  useEffect(() => {
    const fetchServerStats = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `/servers/stats/all-servers?active_only=false`,
        );
        setServerData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching server stats:", err);
        setError("Failed to fetch server statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchServerStats();
  }, []);

  // Create/update chart when data changes
  useEffect(() => {
    if (!serverData || !serverData.servers || serverData.servers.length === 0)
      return;

    // Cleanup existing chart
    if (campaignChartInstance.current) {
      campaignChartInstance.current.destroy();
    }

    // Group servers by type
    const dedicatedServers = serverData.servers.filter(
      (s) =>
        s.server_alias?.toLowerCase().includes("dedicated") ||
        s.server_ip?.toLowerCase().includes("dedicated"),
    );
    const sharedServers = serverData.servers.filter(
      (s) =>
        !s.server_alias?.toLowerCase().includes("dedicated") &&
        !s.server_ip?.toLowerCase().includes("dedicated"),
    );

    const groupedServers = [
      ...dedicatedServers.map((s) => ({ ...s, group: "Dedicated" })),
      ...sharedServers.map((s) => ({ ...s, group: "Shared" })),
    ];

    // Campaign distribution chart
    if (campaignChartRef.current) {
      const ctx = campaignChartRef.current.getContext("2d");
      campaignChartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: groupedServers.map((s) => {
            const name = s.server_alias || s.server_ip;
            return name.length > 20 ? name.substring(0, 20) + "..." : name;
          }),
          datasets: [
            {
              label: "Active Campaigns",
              data: groupedServers.map((s) => s.active_campaigns),
              backgroundColor: "rgba(16, 185, 129, 0.8)",
              borderColor: "#10b981",
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: "Total Campaigns",
              data: groupedServers.map((s) => s.total_campaigns),
              backgroundColor: "rgba(79, 70, 229, 0.6)",
              borderColor: "#4f46e5",
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: "Campaigns Distribution by Server",
              font: { size: 16, weight: "600" },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
            },
          },
        },
      });
    }

    return () => {
      if (campaignChartInstance.current) {
        campaignChartInstance.current.destroy();
      }
    };
  }, [serverData]);

  // Calculate metrics
  const getMetrics = () => {
    if (!serverData || !serverData.servers) return null;

    const avgBotsPerServer =
      serverData.total_servers > 0
        ? serverData.total_bots_across_servers / serverData.total_servers
        : 0;

    // Find servers below average capacity
    const underutilizedServers = serverData.servers
      .filter((s) => s.total_bots < avgBotsPerServer)
      .map((s) => ({
        ...s,
        remainingCapacity: Math.round(avgBotsPerServer - s.total_bots),
      }))
      .sort((a, b) => b.remainingCapacity - a.remainingCapacity);

    return {
      avgBotsPerServer: Math.round(avgBotsPerServer * 10) / 10,
      underutilizedServers,
    };
  };

  const metrics = getMetrics();

  const filteredClients = clients.filter((client) =>
    client.client_name.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const filteredServers = serverData?.servers
    ? serverData.servers.filter((server) => {
      const matchesSearch =
        server.server_alias
          ?.toLowerCase()
          .includes(serverSearchTerm.toLowerCase()) ||
        server.server_ip?.toLowerCase().includes(serverSearchTerm.toLowerCase());

      // If a client is selected, check if this server has any campaigns for that client
      const matchesClient = selectedClientId
        ? server.campaigns && server.campaigns.some(c => c.client_id.toString() === selectedClientId)
        : true;

      return matchesSearch && matchesClient;
    })
    : [];

  const toggleServerExpand = (serverId) => {
    setExpandedServerId(expandedServerId === serverId ? null : serverId);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header Title Only */}
      <div style={{ backgroundColor: "white", borderBottom: "2px solid #e5e7eb", padding: "16px 0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "700", color: "#111827" }}>
            Server Statistics Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
            Real-time monitoring and analytics
          </p>
        </div>
      </div>

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
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
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
                Search Clients
              </label>
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
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
                Select Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
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
                <option value="">All Clients</option>
                {filteredClients.map((client) => (
                  <option key={client.client_id} value={client.client_id}>
                    {client.client_name} ({client.total_campaigns} campaigns)
                  </option>
                ))}
              </select>
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
                Search Servers
              </label>
              <input
                type="text"
                placeholder="Search by name or IP..."
                value={serverSearchTerm}
                onChange={(e) => setServerSearchTerm(e.target.value)}
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
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "80px 24px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              Loading server statistics...
            </h3>
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
        {serverData && !loading && (
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
                  Total Servers
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#4f46e5",
                  }}
                >
                  {serverData.total_servers || 0}
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
                  {serverData.total_active_campaigns || 0}
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#9ca3af",
                      fontWeight: "400",
                    }}
                  >
                    /{serverData.total_campaigns_across_servers || 0}
                  </span>
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
                  Active Bots
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#f59e0b",
                  }}
                >
                  {serverData.total_active_bots_across_servers || 0}
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#9ca3af",
                      fontWeight: "400",
                    }}
                  >
                    /{serverData.total_bots_across_servers || 0}
                  </span>
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
                  Avg Bots/Server
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#8b5cf6",
                  }}
                >
                  {metrics?.avgBotsPerServer || 0}
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
                marginBottom: "24px",
              }}
            >
              {/* Campaign Chart */}
              {serverData.servers && serverData.servers.length > 0 && (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    height: "350px",
                  }}
                >
                  <canvas ref={campaignChartRef}></canvas>
                </div>
              )}

              {/* Underutilized Servers Card */}
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  height: "350px",
                  overflowY: "auto",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  Servers Below Average Capacity
                </h3>
                {metrics && metrics.underutilizedServers.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {metrics.underutilizedServers.map((server) => (
                      <div
                        key={server.server_id}
                        style={{
                          padding: "12px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#111827",
                                marginBottom: "4px",
                              }}
                            >
                              {server.server_alias || server.server_ip}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginBottom: "8px",
                              }}
                            >
                              Current: {server.total_bots} bots
                            </div>
                            <div
                              style={{
                                width: "100%",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "4px",
                                height: "6px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${metrics.avgBotsPerServer > 0 ? (server.total_bots / metrics.avgBotsPerServer) * 100 : 0}%`,
                                  backgroundColor: "#06b6d4",
                                  height: "100%",
                                  borderRadius: "4px",
                                }}
                              ></div>
                            </div>
                          </div>
                          <div
                            style={{
                              marginLeft: "12px",
                              textAlign: "right",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "20px",
                                fontWeight: "700",
                                color: "#06b6d4",
                              }}
                            >
                              +{server.remainingCapacity}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#6b7280",
                              }}
                            >
                              capacity
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "#6b7280",
                    }}
                  >
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>
                      ✓
                    </div>
                    <p style={{ margin: 0, fontSize: "14px" }}>
                      All servers are at or above average capacity
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Server Statistics Table */}
            {serverData.servers && serverData.servers.length > 0 ? (
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
                    Server Details
                  </h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px",
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
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            width: "30px",
                          }}
                        ></th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Server
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Active Campaigns
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Total Campaigns
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Active Bots
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Total Bots
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "600",
                            color: "#374151",
                          }}
                        >
                          Utilization
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Dedicated Servers */}
                      {filteredServers
                        .filter(
                          (s) =>
                            s.server_alias
                              ?.toLowerCase()
                              .includes("dedicated") ||
                            s.server_ip?.toLowerCase().includes("dedicated"),
                        )
                        .map((server, idx) => (
                          <React.Fragment key={server.server_id}>
                            <tr
                              style={{
                                borderBottom:
                                  expandedServerId === server.server_id
                                    ? "none"
                                    : "1px solid #e5e7eb",
                                backgroundColor:
                                  idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onClick={() =>
                                toggleServerExpand(server.server_id)
                              }
                              onMouseOver={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f3f4f6")
                              }
                              onMouseOut={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                idx % 2 === 0 ? "#ffffff" : "#f9fafb")
                              }
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    transition: "transform 0.2s",
                                    transform:
                                      expandedServerId === server.server_id
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                  }}
                                >
                                  ▶
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      color: "#111827",
                                    }}
                                  >
                                    {server.server_alias || server.server_ip}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: "#6b7280",
                                    }}
                                  >
                                    {server.server_ip}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                  }}
                                >
                                  Dedicated
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  fontWeight: "600",
                                  color: "#10b981",
                                }}
                              >
                                {server.active_campaigns}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: "#6b7280",
                                }}
                              >
                                {server.total_campaigns}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  fontWeight: "600",
                                  color: "#f59e0b",
                                }}
                              >
                                {server.active_bots}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: "#6b7280",
                                }}
                              >
                                {server.total_bots}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                }}
                              >
                                <div
                                  style={{
                                    width: "100%",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "4px",
                                    height: "8px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${server.total_bots > 0 ? (server.active_bots / server.total_bots) * 100 : 0}%`,
                                      backgroundColor:
                                        server.active_bots >
                                          server.total_bots * 0.8
                                          ? "#ef4444"
                                          : server.active_bots >
                                            server.total_bots * 0.5
                                            ? "#f59e0b"
                                            : "#10b981",
                                      height: "100%",
                                      borderRadius: "4px",
                                    }}
                                  ></div>
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#6b7280",
                                    marginTop: "4px",
                                  }}
                                >
                                  {server.total_bots > 0
                                    ? Math.round(
                                      (server.active_bots /
                                        server.total_bots) *
                                      100,
                                    )
                                    : 0}
                                  %
                                </div>
                              </td>
                            </tr>
                            {/* Expanded Campaign Details */}
                            {expandedServerId === server.server_id &&
                              server.campaigns &&
                              server.campaigns.length > 0 && (
                                <tr
                                  style={{ borderBottom: "1px solid #e5e7eb" }}
                                >
                                  <td
                                    colSpan="8"
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
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: "600",
                                          color: "#374151",
                                          marginBottom: "12px",
                                        }}
                                      >
                                        Campaigns on this server (
                                        {server.campaigns.length})
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
                                              Campaign
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Client
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Model
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
                                              Status
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Active Bots
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Total Bots
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {server.campaigns.map(
                                            (campaign, cidx) => (
                                              <tr
                                                key={campaign.campaign_id}
                                                style={{
                                                  borderBottom:
                                                    cidx <
                                                      server.campaigns.length - 1
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
                                                    {campaign.campaign_name}
                                                  </div>
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.client_name}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.model_name}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.extension_number}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      padding: "4px 8px",
                                                      backgroundColor:
                                                        campaign.is_active
                                                          ? "#d1fae5"
                                                          : "#f3f4f6",
                                                      color: campaign.is_active
                                                        ? "#065f46"
                                                        : "#6b7280",
                                                      borderRadius: "4px",
                                                      fontSize: "11px",
                                                      fontWeight: "600",
                                                    }}
                                                  >
                                                    {campaign.is_active
                                                      ? "Active"
                                                      : "Inactive"}
                                                  </span>
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    fontWeight: "600",
                                                    color: "#f59e0b",
                                                  }}
                                                >
                                                  {campaign.active_bots}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.total_bots}
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                          </React.Fragment>
                        ))}

                      {/* Shared Servers */}
                      {filteredServers
                        .filter(
                          (s) =>
                            !s.server_alias
                              ?.toLowerCase()
                              .includes("dedicated") &&
                            !s.server_ip?.toLowerCase().includes("dedicated"),
                        )
                        .map((server, idx) => (
                          <React.Fragment key={server.server_id}>
                            <tr
                              style={{
                                borderBottom:
                                  expandedServerId === server.server_id
                                    ? "none"
                                    : "1px solid #e5e7eb",
                                backgroundColor:
                                  idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onClick={() =>
                                toggleServerExpand(server.server_id)
                              }
                              onMouseOver={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f3f4f6")
                              }
                              onMouseOut={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                idx % 2 === 0 ? "#ffffff" : "#f9fafb")
                              }
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    transition: "transform 0.2s",
                                    transform:
                                      expandedServerId === server.server_id
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                  }}
                                >
                                  ▶
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      color: "#111827",
                                    }}
                                  >
                                    {server.server_alias || server.server_ip}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: "#6b7280",
                                    }}
                                  >
                                    {server.server_ip}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: "#fef3c7",
                                    color: "#b45309",
                                    borderRadius: "4px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                  }}
                                >
                                  Shared
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  fontWeight: "600",
                                  color: "#10b981",
                                }}
                              >
                                {server.active_campaigns}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: "#6b7280",
                                }}
                              >
                                {server.total_campaigns}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  fontWeight: "600",
                                  color: "#f59e0b",
                                }}
                              >
                                {server.active_bots}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                  color: "#6b7280",
                                }}
                              >
                                {server.total_bots}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "center",
                                }}
                              >
                                <div
                                  style={{
                                    width: "100%",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "4px",
                                    height: "8px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${server.total_bots > 0 ? (server.active_bots / server.total_bots) * 100 : 0}%`,
                                      backgroundColor:
                                        server.active_bots >
                                          server.total_bots * 0.8
                                          ? "#ef4444"
                                          : server.active_bots >
                                            server.total_bots * 0.5
                                            ? "#f59e0b"
                                            : "#10b981",
                                      height: "100%",
                                      borderRadius: "4px",
                                    }}
                                  ></div>
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#6b7280",
                                    marginTop: "4px",
                                  }}
                                >
                                  {server.total_bots > 0
                                    ? Math.round(
                                      (server.active_bots /
                                        server.total_bots) *
                                      100,
                                    )
                                    : 0}
                                  %
                                </div>
                              </td>
                            </tr>
                            {/* Expanded Campaign Details */}
                            {expandedServerId === server.server_id &&
                              server.campaigns &&
                              server.campaigns.length > 0 && (
                                <tr
                                  style={{ borderBottom: "1px solid #e5e7eb" }}
                                >
                                  <td
                                    colSpan="8"
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
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: "600",
                                          color: "#374151",
                                          marginBottom: "12px",
                                        }}
                                      >
                                        Campaigns on this server (
                                        {server.campaigns.length})
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
                                              Campaign
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Client
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Model
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
                                              Status
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Active Bots
                                            </th>
                                            <th
                                              style={{
                                                padding: "10px 12px",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                color: "#4b5563",
                                              }}
                                            >
                                              Total Bots
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {server.campaigns.map(
                                            (campaign, cidx) => (
                                              <tr
                                                key={campaign.campaign_id}
                                                style={{
                                                  borderBottom:
                                                    cidx <
                                                      server.campaigns.length - 1
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
                                                    {campaign.campaign_name}
                                                  </div>
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.client_name}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.model_name}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.extension_number}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      padding: "4px 8px",
                                                      backgroundColor:
                                                        campaign.is_active
                                                          ? "#d1fae5"
                                                          : "#f3f4f6",
                                                      color: campaign.is_active
                                                        ? "#065f46"
                                                        : "#6b7280",
                                                      borderRadius: "4px",
                                                      fontSize: "11px",
                                                      fontWeight: "600",
                                                    }}
                                                  >
                                                    {campaign.is_active
                                                      ? "Active"
                                                      : "Inactive"}
                                                  </span>
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    fontWeight: "600",
                                                    color: "#f59e0b",
                                                  }}
                                                >
                                                  {campaign.active_bots}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "10px 12px",
                                                    textAlign: "center",
                                                    color: "#6b7280",
                                                  }}
                                                >
                                                  {campaign.total_bots}
                                                </td>
                                              </tr>
                                            ),
                                          )}
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
            ) : (
              !loading && (
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "60px 24px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    🖥️
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    No servers found
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                    No servers available
                  </p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminServerStats;
