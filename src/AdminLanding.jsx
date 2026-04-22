import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAdminContext } from "./components/AdminLayout";

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const LOAD_METRICS_API_BASE = "https://loadmetrics.xdialnetworks.com";

const ServerTable = React.memo(
  ({
    servers,
    showProgressBars,
    thresholds,
    openThresholdModal,
    getServerStatus,
    getStatusColor,
  }) => {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          overflow: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showProgressBars
              ? "200px 100px 100px 120px 120px 80px"
              : "200px 80px 80px 120px 100px 80px",
            gap: "12px",
            padding: "16px 20px",
            backgroundColor: "#f9fafb",
            borderBottom: "2px solid #e5e7eb",
            fontWeight: "700",
            fontSize: "12px",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            minWidth: "720px",
          }}
        >
          <div>Server IP</div>
          <div>Load Avg</div>
          <div>Disk</div>
          <div>CPU</div>
          <div>Hostname</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {/* Table Rows */}
        {servers.map((agent) => {
          const status = getServerStatus(agent);
          const isCritical = status === "critical";
          const threshold = thresholds[agent.ip] || {
            cpu: 70,
            disk: 60,
            load: 4,
          };
          const primaryDisk = agent.disk[0] || {
            mount: "/",
            used_percent: 0,
            used: 0,
            total: 0,
          };

          return (
            <div
              key={agent.hostname}
              style={{
                display: "grid",
                gridTemplateColumns: showProgressBars
                  ? "200px 100px 100px 120px 120px 80px"
                  : "200px 80px 80px 120px 100px 80px",
                gap: "12px",
                padding: showProgressBars ? "16px 20px" : "12px 20px",
                borderBottom: "1px solid #f3f4f6",
                alignItems: "center",
                transition: "background-color 0.2s ease",
                backgroundColor: isCritical ? "#ef4444" : "transparent",
                minWidth: "720px",
              }}
              onMouseEnter={(e) => {
                if (!isCritical) {
                  e.currentTarget.style.backgroundColor = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCritical) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {/* Server IP */}
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: isCritical ? "#ffffff" : "#111827",
                    marginBottom: showProgressBars ? "4px" : "0",
                  }}
                >
                  {agent.ip}
                </div>
                {showProgressBars && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: isCritical ? "#fee2e2" : "#9ca3af",
                    }}
                  >
                    Updated:{" "}
                    {new Date(agent.timestamp * 1000).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Load Average */}
              <div>
                <div
                  style={{
                    fontSize: showProgressBars ? "18px" : "16px",
                    fontWeight: "700",
                    color: isCritical
                      ? "#ffffff"
                      : agent.load && agent.load.load1 > threshold.load
                        ? "#ef4444"
                        : "#10b981",
                  }}
                >
                  {agent.load && agent.load.load1 !== undefined
                    ? agent.load.load1.toFixed(2)
                    : "N/A"}
                </div>
              </div>

              {/* Disk */}
              <div>
                <div
                  style={{
                    fontSize: showProgressBars ? "14px" : "16px",
                    fontWeight: "600",
                    color: isCritical
                      ? "#ffffff"
                      : primaryDisk.used_percent > threshold.disk
                        ? "#ef4444"
                        : "#10b981",
                    marginBottom: showProgressBars ? "4px" : "0",
                  }}
                >
                  {showProgressBars && `${primaryDisk.mount} `}
                  {primaryDisk.used_percent.toFixed(1)}%
                </div>
                {showProgressBars && (
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: isCritical ? "#dc2626" : "#f3f4f6",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${primaryDisk.used_percent}%`,
                        backgroundColor: isCritical
                          ? "#ffffff"
                          : primaryDisk.used_percent > threshold.disk
                            ? "#ef4444"
                            : "#10b981",
                        transition: "width 0.3s ease",
                      }}
                    ></div>
                  </div>
                )}
              </div>

              {/* CPU */}
              <div>
                <div
                  style={{
                    fontSize: showProgressBars ? "18px" : "16px",
                    fontWeight: "700",
                    color: isCritical
                      ? "#ffffff"
                      : agent.cpu.total_percent > threshold.cpu
                        ? "#ef4444"
                        : "#10b981",
                    marginBottom: showProgressBars ? "4px" : "0",
                  }}
                >
                  {agent.cpu.total_percent.toFixed(1)}%
                </div>
                {showProgressBars && (
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: isCritical ? "#dc2626" : "#f3f4f6",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(agent.cpu.total_percent, 100)}%`,
                        backgroundColor: isCritical
                          ? "#ffffff"
                          : agent.cpu.total_percent > threshold.cpu
                            ? "#ef4444"
                            : "#10b981",
                        transition: "width 0.3s ease",
                      }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Hostname */}
              <div
                style={{
                  fontSize: "13px",
                  color: isCritical ? "#fee2e2" : "#6b7280",
                  fontFamily: "monospace",
                }}
              >
                {agent.hostname}
              </div>

              {/* Actions */}
              <div style={{ textAlign: "right" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openThresholdModal(agent.ip);
                  }}
                  style={{
                    padding: showProgressBars ? "6px 12px" : "4px 10px",
                    backgroundColor: isCritical ? "#ffffff" : "#f3f4f6",
                    color: isCritical ? "#ef4444" : "#6b7280",
                    border: isCritical
                      ? "1px solid #ffffff"
                      : "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCritical) {
                      e.currentTarget.style.backgroundColor = "#4f46e5";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.borderColor = "#4f46e5";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCritical) {
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                      e.currentTarget.style.color = "#6b7280";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }
                  }}
                >
                  Limits
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

const AdminLanding = () => {
  // Use context for data
  const { agents } = useAdminContext();

  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [thresholds, setThresholds] = useState({});
  const [tempThreshold, setTempThreshold] = useState({
    cpu: 60,
    disk: 70,
    load: 4,
  });
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [showProgressBars, setShowProgressBars] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const response = await fetch(`${LOAD_METRICS_API_BASE}/api/thresholds`);
      if (response.ok) {
        const data = await response.json();
        setThresholds(data || {});
      }
    } catch (err) {
      console.error("Failed to fetch thresholds:", err);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setShowProgressBars(window.innerHeight >= 800);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const openThresholdModal = useCallback(
    (ip) => {
      setSelectedAgent(ip);
      const existing = thresholds[ip] || { cpu: 80, disk: 90, load: 5 };
      setTempThreshold(existing);
      setShowThresholdModal(true);
    },
    [thresholds],
  );

  const saveThreshold = async () => {
    try {
      const response = await fetch(`${LOAD_METRICS_API_BASE}/api/thresholds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname: selectedAgent,
          threshold: tempThreshold,
        }),
      });

      if (response.ok) {
        setThresholds((prev) => ({
          ...prev,
          [selectedAgent]: tempThreshold,
        }));
        setShowThresholdModal(false);
        console.log("Threshold saved successfully");
      } else {
        console.error("Failed to save threshold");
        alert("Failed to save threshold. Please try again.");
      }
    } catch (err) {
      console.error("Error saving threshold:", err);
      alert("Error saving threshold. Please check server connection.");
    }
  };

  const getServerStatus = useCallback(
    (agent) => {
      const threshold = thresholds[agent.ip] || { cpu: 60, disk: 70, load: 4 };

      if (agent.cpu.total_percent > threshold.cpu) return "critical";
      if (agent.load && agent.load.load1 > threshold.load) return "critical";

      const diskOverThreshold = agent.disk.some(
        (d) => d.used_percent > threshold.disk,
      );
      if (diskOverThreshold) return "critical";

      return "healthy";
    },
    [thresholds],
  );

  const getStatusColor = useCallback((status) => {
    return status === "critical" ? "#ef4444" : "#10b981";
  }, []);

  const agentList = Object.values(agents || {})
    .filter((agent) =>
      agent.ip.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => a.hostname.localeCompare(b.hostname));

  const headerHeight = 140;
  const rowHeight = showProgressBars ? 70 : 50;
  const tableHeaderHeight = 50;
  const padding = 48;
  const availableHeight = viewportHeight - headerHeight - padding;
  // Fallback to 1 column if calculation fails or is small
  const maxServersPerColumn = Math.max(1, Math.floor(
    (availableHeight - tableHeaderHeight) / rowHeight,
  ));

  const columns = [];
  if (agentList.length > 0) {
    for (let i = 0; i < agentList.length; i += maxServersPerColumn) {
      columns.push(agentList.slice(i, i + maxServersPerColumn));
    }
  }

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "24px" }}>
      {/* Search Bar */}
      <div style={{ marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Search servers by IP address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "14px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {agentList.length === 0 ? (
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
            🖥️
          </div>
          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "20px",
              fontWeight: "600",
              color: "#111827",
            }}
          >
            {searchQuery
              ? "No servers match your search"
              : "No servers connected"}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            {searchQuery
              ? "Try a different search term"
              : "Waiting for monitoring agents to connect..."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: "24px",
          }}
        >
          {columns.map((columnServers, idx) => (
            <ServerTable
              key={idx}
              servers={columnServers}
              columnIndex={idx}
              showProgressBars={showProgressBars}
              thresholds={thresholds}
              openThresholdModal={openThresholdModal}
              getServerStatus={getServerStatus}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}

      {/* Threshold Modal */}
      {showThresholdModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowThresholdModal(false)}
        >
          {/* Modal Content - same as before */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                Set Thresholds
              </h2>
              <button
                onClick={() => setShowThresholdModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: "0 0 24px 0", color: "#6b7280", fontSize: "14px" }}>
              Server: <strong>{selectedAgent}</strong>
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                Load Average Threshold
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={tempThreshold.load}
                onChange={(e) => setTempThreshold({ ...tempThreshold, load: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                CPU Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempThreshold.cpu}
                onChange={(e) => setTempThreshold({ ...tempThreshold, cpu: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                Disk Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempThreshold.disk}
                onChange={(e) => setTempThreshold({ ...tempThreshold, disk: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowThresholdModal(false)}
                style={{ padding: "10px 20px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={saveThreshold}
                style={{ padding: "10px 20px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
              >
                Save Thresholds
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AdminLanding;