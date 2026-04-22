import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isTokenExpired } from "./api";

const getApiUrl = () => {
  return "https://api.xlitecore.xdialnetworks.com";
};

const API_URL = getApiUrl();

const AdminDataExport = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [callData, setCallData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");

  // Filters
  const [clientCampaignModelIDFilter, setclientCampaignModelIDFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [transferFilter, setTransferFilter] = useState("all");

  // Stats
  const [stats, setStats] = useState({
    totalNumbersSearched: 0,
    numbersFound: 0,
    numbersFound: 0,
    numbersNotFound: 0,
  });

  // Honeypot State
  const [honeypotCategories, setHoneypotCategories] = useState([]);
  const [honeypotFilters, setHoneypotFilters] = useState({
    honeypotTypes: "",
    clientId: "",
    clientCampaignModelId: "",
    serverId: "",
    startDate: "",
    endDate: "",
  });
  const [isHoneypotLoading, setIsHoneypotLoading] = useState(false);
  const [honeypotError, setHoneypotError] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_URL}/api/v1/campaigns/call-lookup/honeypot/categories`, {
          headers: {
            accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (response.ok) {
          const data = await response.json();
          setHoneypotCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to fetch honeypot categories:", err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    document.title = "Admin Data Export - Xdial";
  }, []);

  useEffect(() => {
    let filtered = callData;

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (item) => item.final_response_category === categoryFilter
      );
    }

    if (transferFilter !== "all") {
      const isTransferred = transferFilter === "transferred";
      filtered = filtered.filter(
        (item) => item.final_decision_transferred === isTransferred
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.campaign_name &&
            item.campaign_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (item.client_name &&
            item.client_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (item.model_name &&
            item.model_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredData(filtered);
  }, [categoryFilter, transferFilter, searchTerm, callData]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (
        selectedFile.type !== "text/csv" &&
        !selectedFile.name.endsWith(".csv")
      ) {
        setError("Please upload a valid CSV file");
        setTimeout(() => setError(""), 3000);
        return;
      }
      setFile(selectedFile);
      setUploadedFileName(selectedFile.name);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Not authenticated. Please login again.");
        setTimeout(() => {
          navigate("/");
        }, 2000);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const queryParams = new URLSearchParams();
      if (clientCampaignModelIDFilter) queryParams.append("client_campaign_model_id", clientCampaignModelIDFilter);
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);

      const queryString = queryParams.toString();
      const url = `${API_URL}/api/v1/campaigns/call-lookup/json${queryString ? `?${queryString}` : ""
        }`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        const currentToken = localStorage.getItem("access_token");
        let isExpired = true;
        if (currentToken) {
          try {
            const payload = JSON.parse(atob(currentToken.split('.')[1]));
            if (payload.exp && Date.now() < (payload.exp * 1000) - 60000) {
              isExpired = false;
            }
          } catch (e) { }
        }

        if (isExpired) {
          setError("Authentication failed. Please login again.");
          localStorage.clear();
          setTimeout(() => {
            navigate("/");
          }, 2000);
          return;
        } else {
          console.warn("Received 401 but token is still valid. Ignoring logout.");
        }
      }
      if (response.status === 403) {
        setError("Access denied. You do not have permission.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      setCallData(data.results || []);
      setFilteredData(data.results || []);
      setStats({
        totalNumbersSearched: data.total_numbers_searched || 0,
        numbersFound: data.numbers_found || 0,
        numbersNotFound: data.numbers_not_found || 0,
      });

      setCopyFeedback("Data loaded successfully!");
      setTimeout(() => setCopyFeedback(""), 3000);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(`Failed to upload file and fetch data: ${err.message}`);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!file) {
      setError("Please select a CSV file first");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Not authenticated. Please login again.");
        setTimeout(() => {
          navigate("/");
        }, 2000);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const queryParams = new URLSearchParams();
      if (clientCampaignModelIDFilter) queryParams.append("client_campaign_model_id", clientCampaignModelIDFilter);
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);

      const queryString = queryParams.toString();
      const url = `${API_URL}/api/v1/campaigns/call-lookup/csv${queryString ? `?${queryString}` : ""
        }`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        const currentToken = localStorage.getItem("access_token");
        let isExpired = true;
        if (currentToken) {
          try {
            const payload = JSON.parse(atob(currentToken.split('.')[1]));
            if (payload.exp && Date.now() < (payload.exp * 1000) - 60000) {
              isExpired = false;
            }
          } catch (e) { }
        }

        if (isExpired) {
          setError("Authentication failed. Please login again.");
          localStorage.clear();
          setTimeout(() => {
            navigate("/");
          }, 2000);
          return;
        } else {
          console.warn("Received 401 but token is still valid. Ignoring logout.");
        }
      }
      if (response.status === 403) {
        setError("Access denied. You do not have permission.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `call-data-export-${new Date().toISOString().split("T")[0]
        }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setCopyFeedback("CSV downloaded successfully!");
      setTimeout(() => setCopyFeedback(""), 3000);
    } catch (err) {
      console.error("Error downloading CSV:", err);
      setError(`Failed to download CSV: ${err.message}`);
      setTimeout(() => setError(""), 5000);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadedFileName("");
    setCallData([]);
    setFilteredData([]);
    setStats({
      totalNumbersSearched: 0,
      numbersFound: 0,
      numbersNotFound: 0,
    });
  };

  // Honeypot Handlers
  const handleHoneypotFilterChange = (e) => {
    const { name, value } = e.target;
    setHoneypotFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchHoneypotDataCSV = async () => {
    setIsHoneypotLoading(true);
    setHoneypotError("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setHoneypotError("Not authenticated. Please login again.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const queryParams = new URLSearchParams();
      if (honeypotFilters.honeypotTypes) {
        const types = honeypotFilters.honeypotTypes.split(',').map(t => t.trim()).filter(Boolean);
        types.forEach(type => queryParams.append("honeypot_types", type));
      }
      if (honeypotFilters.clientId) queryParams.append("client_id", honeypotFilters.clientId);
      if (honeypotFilters.clientCampaignModelId) queryParams.append("client_campaign_model_id", honeypotFilters.clientCampaignModelId);
      if (honeypotFilters.serverId) queryParams.append("server_id", honeypotFilters.serverId);
      if (honeypotFilters.startDate) queryParams.append("start_date", honeypotFilters.startDate);
      if (honeypotFilters.endDate) queryParams.append("end_date", honeypotFilters.endDate);

      const queryString = queryParams.toString();
      const url = `${API_URL}/api/v1/campaigns/call-lookup/honeypot/csv${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const currentToken = localStorage.getItem("access_token");
        if (currentToken && !isTokenExpired(currentToken)) {
          console.warn("Received 401 but token is still valid. Ignoring logout.");
        } else {
          setHoneypotError("Authentication failed. Please login again.");
          localStorage.clear();
          setTimeout(() => navigate("/"), 2000);
          return;
        }
      }
      if (response.status === 403) {
        setHoneypotError("Access denied. You do not have permission.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `honeypot-data-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      setCopyFeedback("CSV downloaded successfully!");
      setTimeout(() => setCopyFeedback(""), 3000);
    } catch (err) {
      console.error("Error fetching honeypot data:", err);
      setHoneypotError(`Failed to fetch data: ${err.message}`);
      setTimeout(() => setHoneypotError(""), 5000);
    } finally {
      setIsHoneypotLoading(false);
    }
  };

  const getUniqueCategories = () => {
    const categories = new Set();
    callData.forEach((item) => {
      if (item.final_response_category) {
        categories.add(item.final_response_category);
      }
    });
    return Array.from(categories).sort();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {copyFeedback && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#10b981",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <i className="bi bi-check-circle-fill"></i>
          {copyFeedback}
        </div>
      )}

      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "24px 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
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
                margin: "0 0 8px 0",
                fontSize: "28px",
                fontWeight: "700",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <i className="bi bi-file-earmark-arrow-up"></i>
              Admin Data Export
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              Upload CSV to lookup call data by phone numbers
            </p>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {/* Upload Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
            }}
          >
            Upload CSV File
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Client ID (Optional)
              </label>
              <input
                type="number"
                value={clientCampaignModelIDFilter}
                onChange={(e) => setclientCampaignModelIDFilter(e.target.value)}
                placeholder="Enter client ID"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
              backgroundColor: "#f9fafb",
              marginBottom: "20px",
            }}
          >
            {!uploadedFileName ? (
              <>
                <i
                  className="bi bi-cloud-upload"
                  style={{
                    fontSize: "48px",
                    color: "#9ca3af",
                    marginBottom: "16px",
                    display: "block",
                  }}
                ></i>
                <label
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Choose CSV File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
                <p
                  style={{
                    margin: "12px 0 0 0",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  or drag and drop your CSV file here
                </p>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <i
                  className="bi bi-file-earmark-text"
                  style={{ fontSize: "32px", color: "#10b981" }}
                ></i>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "500",
                    color: "#111827",
                  }}
                >
                  {uploadedFileName}
                </span>
                <button
                  onClick={clearFile}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <i className="bi bi-x-lg"></i> Remove
                </button>
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#991b1b",
                fontSize: "14px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="bi bi-exclamation-triangle-fill"></i>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "12px 24px",
                backgroundColor: file && !isUploading ? "#10b981" : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: file && !isUploading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isUploading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid white",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  Loading Data...
                </>
              ) : (
                <>
                  <i className="bi bi-search"></i>
                  Load Data (JSON)
                </>
              )}
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={!file}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "12px 24px",
                backgroundColor: file ? "#4f46e5" : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: file ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <i className="bi bi-download"></i>
              Download CSV
            </button>
          </div>
        </div>

        {/* Honeypot Lookup Section */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
            }}
          >
            Call Lookup (Honeypot)
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Honeypot Types (Optional)
              </label>
              <select
                name="honeypotTypes"
                value={honeypotFilters.honeypotTypes}
                onChange={handleHoneypotFilterChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <option value="">All Types (No Filter)</option>
                {honeypotCategories.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Client ID (Optional)
              </label>
              <input
                type="text"
                name="clientId"
                value={honeypotFilters.clientId}
                onChange={handleHoneypotFilterChange}
                placeholder="Enter client ID"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Campaign Model ID (Optional)
              </label>
              <input
                type="text"
                name="clientCampaignModelId"
                value={honeypotFilters.clientCampaignModelId}
                onChange={handleHoneypotFilterChange}
                placeholder="Enter model ID"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Server ID (Optional)
              </label>
              <input
                type="text"
                name="serverId"
                value={honeypotFilters.serverId}
                onChange={handleHoneypotFilterChange}
                placeholder="Enter server ID"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                Start Date (Optional)
              </label>
              <input
                type="date"
                name="startDate"
                value={honeypotFilters.startDate}
                onChange={handleHoneypotFilterChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "8px",
                }}
              >
                End Date (Optional)
              </label>
              <input
                type="date"
                name="endDate"
                value={honeypotFilters.endDate}
                onChange={handleHoneypotFilterChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {honeypotError && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#991b1b",
                fontSize: "14px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i className="bi bi-exclamation-triangle-fill"></i>
              {honeypotError}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={fetchHoneypotDataCSV}
              disabled={isHoneypotLoading}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "12px 24px",
                backgroundColor: !isHoneypotLoading ? "#4f46e5" : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: !isHoneypotLoading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isHoneypotLoading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid white",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  Downloading...
                </>
              ) : (
                <>
                  <i className="bi bi-download"></i>
                  Download CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {callData.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
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
                  borderLeft: "4px solid #4f46e5",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Total Numbers Searched
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {stats.totalNumbersSearched}
                </h3>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: "4px solid #10b981",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Numbers Found
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {stats.numbersFound}
                </h3>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: "4px solid #ef4444",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Numbers Not Found
                </p>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {stats.numbersNotFound}
                </h3>
              </div>
            </div>

            {/* Filters */}
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
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: "1 1 300px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Search
                  </label>
                  <div style={{ position: "relative" }}>
                    <i
                      className="bi bi-search"
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#9ca3af",
                      }}
                    ></i>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by number, campaign, client..."
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <div style={{ flex: "0 1 200px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Response Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      backgroundColor: "white",
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="all">All Categories</option>
                    {getUniqueCategories().map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "0 1 200px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Transfer Status
                  </label>
                  <select
                    value={transferFilter}
                    onChange={(e) => setTransferFilter(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      backgroundColor: "white",
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="transferred">Transferred</option>
                    <option value="not-transferred">Not Transferred</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              {filteredData.length === 0 ? (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  <i
                    className="bi bi-inbox"
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      display: "block",
                    }}
                  ></i>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      fontWeight: "600",
                    }}
                  >
                    No results found
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    Try adjusting your filters or search term
                  </p>
                </div>
              ) : (
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
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Phone Number
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Client
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Campaign
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Model
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Stages
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Response Category
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            textAlign: "left",
                            fontWeight: "600",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Transfer Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((record, index) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #e5e7eb" }}
                        >
                          <td
                            style={{
                              padding: "16px",
                              fontWeight: "500",
                              color: "#111827",
                            }}
                          >
                            {record.number}
                          </td>
                          <td style={{ padding: "16px", color: "#374151" }}>
                            {record.client_name || "-"}
                          </td>
                          <td style={{ padding: "16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                backgroundColor: "#eff6ff",
                                color: "#1e40af",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "500",
                              }}
                            >
                              {record.campaign_name || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "16px", color: "#374151" }}>
                            {record.model_name || "-"}
                          </td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "600",
                              }}
                            >
                              {record.total_stages || 0}
                            </span>
                          </td>
                          <td style={{ padding: "16px" }}>
                            {record.final_response_category ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 12px",
                                  backgroundColor: "#fef3c7",
                                  color: "#92400e",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                }}
                              >
                                {record.final_response_category}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={{ padding: "16px" }}>
                            {record.final_decision_transferred ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "4px 12px",
                                  backgroundColor: "#d1fae5",
                                  color: "#065f46",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                }}
                              >
                                <i className="bi bi-check-circle-fill"></i>
                                Transferred
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "4px 12px",
                                  backgroundColor: "#fee2e2",
                                  color: "#991b1b",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                }}
                              >
                                <i className="bi bi-x-circle-fill"></i>
                                Not Transferred
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {callData.length === 0 && !isUploading && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <i
              className="bi bi-database"
              style={{
                fontSize: "64px",
                color: "#d1d5db",
                marginBottom: "16px",
                display: "block",
              }}
            ></i>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              No Data Yet
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Upload a CSV file and click "Load Data" to view call records
            </p>
          </div>
        )}

        {/* Honeypot Results Removed */}
      </div>
      <style>{`
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 768px) {
      header h1 {
        font-size: 24px !important;
      }
      
      table {
        font-size: 12px !important;
      }
      
      th, td {
        padding: 12px 8px !important;
      }
    }
  `}</style>

      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />
    </div>
  );
};
export default AdminDataExport;