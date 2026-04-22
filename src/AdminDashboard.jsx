import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "./components/Loader";
import { isTokenExpired } from "./api";
import DateRangePicker from "./components/DateRangePicker";

const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [transcriptionSearch, setTranscriptionSearch] = useState("");
  const [transcriptionStage, setTranscriptionStage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState("timestamp"); // Default sort by timestamp
  const [sortDirection, setSortDirection] = useState("desc");
  const [campaignId, setCampaignId] = useState(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [reportCategories, setReportCategories] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCallId, setReportCallId] = useState(null);
  const [selectedReportCategory, setSelectedReportCategory] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportModalError, setReportModalError] = useState(null);
  const [reportModalSuccess, setReportModalSuccess] = useState(null);
  const navigate = useNavigate();

  // Dynamic stage filter states
  const [stageFilters, setStageFilters] = useState({});
  const [availableStages, setAvailableStages] = useState([]);
  // Which stages are collapsed (Set of stage numbers)
  const [collapsedStages, setCollapsedStages] = useState(new Set());
  const [hideScreenshotColumns, setHideScreenshotColumns] = useState(false);

  // Get campaign ID on mount and set today's date
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("campaign_id");
    if (id) {
      setCampaignId(id);
      setCurrentView("dashboard");
      // Set default start date to today
      // Set default start date to today (Local Time)
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      setStartDate(today);
    } else {
      // Redirect to admin landing if no campaign_id
      window.location.href = "/admin-landing";
    }
  }, []);

  // Fetch dashboard data from API
  // Fetch dashboard data from API
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      // Allow fetching even if startDate is empty
      if (!campaignId) return;

      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          setError("Not authenticated. Please login again.");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
          return;
        }

        // Construct Stage Filters JSON
        const stageFiltersParam = Object.entries(stageFilters).reduce((acc, [key, categories]) => {
          if (categories && categories.length > 0) {
            const stageNum = parseInt(key.replace("stage", ""), 10);
            if (!isNaN(stageNum)) {
              acc.push({ stage: stageNum, categories: categories });
            }
          }
          return acc;
        }, []);

        let apiUrl = `https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/admin/${campaignId}/dashboard?`;

        // Use URLSearchParams for cleaner URL construction
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (startTime) params.append('start_time', startTime);
        if (endTime) params.append('end_time', endTime);
        if (searchText) params.append('search', searchText);
        if (transcriptionSearch) params.append('transcription_search', transcriptionSearch);
        if (transcriptionStage) params.append('transcription_stage', transcriptionStage);
        params.append('page', currentPage.toString());
        params.append('page_size', '50');
        params.append('sort_order', sortDirection);

        if (stageFiltersParam.length > 0) {
          params.append('stage_filters', JSON.stringify(stageFiltersParam));
        }

        const finalUrl = apiUrl + params.toString();
        // Decode only for display logging if needed, but fetch works fine with encoded
        console.log("Fetching Dashboard Data URL:", finalUrl);

        const res = await fetch(finalUrl, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: signal
        });

        if (res.status === 401) {
          const currentToken = localStorage.getItem("access_token");
          if (currentToken && !isTokenExpired(currentToken)) {
            console.warn("Received 401 but token is still valid. Ignoring logout.");
          } else {
            localStorage.clear();
            setTimeout(() => {
              window.location.href = "/";
            }, 2000);
            return;
          }
        }

        if (!res.ok) {
          let errorMessage = `Failed to fetch dashboard data: ${res.status}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (parseErr) {
            if (res.status >= 500) {
              errorMessage = 'Server error occurred. Please try again later or contact support if the problem persists.';
            } else if (res.status === 401) {
              errorMessage = 'Session expired. Please login again.';
            }
          }
          throw new Error(errorMessage);
        }

        const data = await res.json();
        // Log data for debugging "inconsistent data" issues
        console.log("Dashboard Data Response:", data);

        if (!signal.aborted) {
          processAndSetData(data);
          setLoading(false);
        }

      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        console.error("Fetch error:", err);
        if (err.name === 'TypeError' && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
          setError('Unable to connect to the server. This may be due to network issues or server configuration. Please try again later.');
        } else {
          setError(err.message);
        }

        if (!signal.aborted) {
          setLoading(false);
        }

        if (err.message.includes("authentication") || err.message.includes("login")) {
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [campaignId, fetchTrigger, currentPage, sortDirection]);

  // Update document title when dashboard data changes
  useEffect(() => {
    if (dashboardData?.client_name) {
      document.title = `${dashboardData.client_name} - Admin Dashboard`;
    }
  }, [dashboardData]);

  const processAndSetData = (data) => {
    // Determine available stages from the current page of calls
    // We want columns 0 to N where N is the max stage found.
    // If no calls, we can't really guess, so empty.

    let maxStage = -1;
    let hasStageZero = false;

    if (data.calls && data.calls.length > 0) {
      data.calls.forEach(call => {
        // Only consider actual stage data present in the response
        if (call.stages) {
          call.stages.forEach(s => {
            if (s.stage !== undefined) {
              if (s.stage > maxStage) maxStage = s.stage;
              if (s.stage === 0) hasStageZero = true;
            }
          });
        }
      });
    }

    // If we have existing filters for higher stages, we should probably keep showing them
    // so the user can uncheck them.
    const filteredStages = Object.keys(stageFilters)
      .map(k => parseInt(k.replace('stage', ''), 10))
      .filter(n => !isNaN(n));

    if (filteredStages.length > 0) {
      const maxFiltered = Math.max(...filteredStages);
      if (maxFiltered > maxStage) maxStage = maxFiltered;
      if (filteredStages.includes(0)) hasStageZero = true;
    }

    const startStage = hasStageZero ? 0 : 1;
    const stagesArray = [];
    if (maxStage >= startStage) {
      for (let i = startStage; i <= maxStage; i++) {
        stagesArray.push(i);
      }
    }

    setAvailableStages(stagesArray);
    setDashboardData(data);
  };

  // Toggle collapse for a stage
  const handleToggleStageCollapse = (stageNum) => {
    setCollapsedStages(prev => {
      const s = new Set(prev);
      if (s.has(stageNum)) s.delete(stageNum);
      else s.add(stageNum);
      return s;
    });
  };

  const getCategoryColor = (category) => {
    if (!dashboardData?.all_categories) return "#6c757d";
    const cat = dashboardData.all_categories.find(
      (c) => c.name === category || c.original_name === category
    );
    return cat?.color || "#6c757d";
  };

  const handleSort = (column) => {
    // API only supports timestamp sorting via 'sort_order'
    if (column === "timestamp") {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
      setSortColumn("timestamp");
    }
    // For other columns, we can't sort server-side per requirements (only sort_order defined for timestamp)
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  const handleOpenReportModal = async (callId) => {
    setReportCallId(callId);
    setSelectedReportCategory("");
    setReportNotes("");
    setReportModalError(null);
    setReportModalSuccess(null);
    setShowReportModal(true);

    // Fetch categories if not already fetched
    if (reportCategories.length === 0) {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("https://api.xlitecore.xdialnetworks.com/api/v1/reporting/categories", {
          headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setReportCategories(data);
        } else {
          setReportModalError("Failed to fetch report categories.");
        }
      } catch (err) {
        setReportModalError("Error fetching report categories.");
      }
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedReportCategory) {
      setReportModalError("Please select a category.");
      return;
    }

    setSubmittingReport(true);
    setReportModalError(null);
    setReportModalSuccess(null);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("https://api.xlitecore.xdialnetworks.com/api/v1/reporting/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          call_id: reportCallId,
          category_id: parseInt(selectedReportCategory),
          notes: reportNotes
        })
      });

      if (res.ok) {
        setReportModalSuccess("Report submitted successfully.");
        setTimeout(() => setShowReportModal(false), 2000);
      } else {
        const errorData = await res.json();
        setReportModalError(errorData.detail?.[0]?.msg || errorData.message || "Failed to submit report.");
      }
    } catch (err) {
      setReportModalError("Error submitting report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleReset = () => {
    setSearchText("");
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    setStartDate(today);
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setTranscriptionSearch("");
    setTranscriptionStage("");
    setStageFilters({});
    setCurrentPage(1);
    setFetchTrigger((prev) => prev + 1);
  };

  const handleStageFilterToggle = (stageNum, category) => {
    const filterKey = `stage${stageNum}`;
    setStageFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey]?.includes(category)
        ? prev[filterKey].filter(c => c !== category)
        : [...(prev[filterKey] || []), category]
    }));
    // Note: We do NOT trigger fetch immediately on checkbox toggle to avoid spamming.
    // User must click "Apply Filters".
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setFetchTrigger((prev) => prev + 1);
  };

  // Helper to render sidebar filter options
  // Use all_categories from API to populate options
  const getAllCategories = () => {
    return dashboardData?.all_categories || [];
  };

  // Get categories for a specific stage with percentage calculations
  const getStageCategories = (stageNum) => {
    const allCats = dashboardData?.all_categories || [];

    // Build array of categories that have non-zero counts for this stage
    const stageCats = [];
    let totalForStage = 0;

    allCats.forEach(cat => {
      const stageData = cat.stage_counts?.find(sc => sc.stage === stageNum);
      const count = stageData?.count || 0;
      totalForStage += count;
      if (count > 0) {
        stageCats.push({
          name: cat.name,
          color: cat.color || "#6c757d",
          count: count,
          transferred_count: stageData?.transferred_count || 0
        });
      }
    });

    // Calculate percentages
    return stageCats.map(cat => ({
      ...cat,
      percentage: totalForStage > 0 ? Math.round((cat.count / totalForStage) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
  };

  // Helper to convert hex to rgba for badge background
  const hexToRgba = (hex, alpha) => {
    let r = 0, g = 0, b = 0;
    // Handle 3 digit hex
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    }
    // Handle 6 digit hex
    else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // No client-side filtered count
  const totalRecords = dashboardData?.pagination?.total_records || 0;
  // If we want to show "Showing X of Y", use pagination data
  const pageSize = 50;
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);
  // Compute total columns for table (used for no-records colspan)
  const baseCols = hideScreenshotColumns ? 2 : 3; // #, Phone No, (Voice)
  const stageColsCount = availableStages
    .filter(n => !hideScreenshotColumns || n !== 1)
    .reduce((acc, n) => acc + (collapsedStages.has(n) ? 1 : 2), 0);
  const otherCols = 2; // Timestamp + Action
  const totalColsCount = baseCols + stageColsCount + otherCols;

  if (loading && !dashboardData && fetchTrigger > 0) {
    // Only show full loading if we have NO data yet and are fetching
    return (
      <div style={{ padding: 40 }}>
        <Loader size="large" />
      </div>
    );
  }
  // Allow loading indicator overlay or just spinner? 
  // For now, keep simple.

  if (error && !dashboardData) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '24px', marginTop: '60px' }}>
          <h2 style={{ color: '#DC2626', fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>Unable to Load Dashboard</h2>
          <p style={{ color: '#991B1B', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginRight: '10px' }}>Try Again</button>
          <button onClick={() => window.location.href = '/admin-landing'} style={{ backgroundColor: '#6B7280', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginRight: '10px' }}>Go Back</button>
          <button onClick={() => window.location.href = '/'} style={{ backgroundColor: '#4F46E5', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Login Again</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "Arial, sans-serif", backgroundColor: "#f5f5f5", minHeight: "100vh", zoom: "0.8" }}>
      <style>
        {`
          .admin-data-row {
            transition: background-color 0.2s;
          }
          .admin-data-row:hover {
            background-color: #fafafa !important;
          }
          .admin-data-row:hover td {
            background-color: transparent !important;
          }
          .stage-bg-even {
            background-color: #f5f5f5;
          }
          .stage-bg-odd {
            background-color: #ffffff;
          }

          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}
      </style>
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "20px 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "1800px",
            margin: "0 auto",
            padding: "0 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Left Side: Title and Subtitle */}
          <div>
            <h1
              style={{
                margin: "0 0 4px 0",
                fontSize: "28px",
                fontWeight: "700",
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <i className="bi bi-speedometer2" style={{ color: "#4f46e5" }}></i>
              {dashboardData?.client_name ? `${dashboardData.client_name} - ` : ""} {dashboardData?.campaign?.name || "Onboarding"}
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
              {dashboardData?.campaign?.model ? `Model: ${dashboardData.campaign.model}` : "Manage AI bot integration requests"}
            </p>
          </div>

          {/* Right Side: Buttons */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>


            <button
              onClick={() => window.open(`/admin-stage-data?campaign_id=${campaignId}`, "_blank")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.2s"
              }}
            >
              <i className="bi bi-bar-chart-steps"></i>
              Stage Data
            </button>

            <button
              onClick={() => window.open(`/dashboard?campaign_id=${campaignId}&view=dashboard&admin_view=true`, "_blank")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.2s"
              }}
            >
              <i className="bi bi-speedometer2"></i>
              Client Dashboard
            </button>

            <button
              onClick={() => window.open(`/recordings?campaign_id=${campaignId}`)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#db2777",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background-color 0.2s"
              }}
            >
              <i className="bi bi-mic-fill"></i>
              Recordings
            </button>
          </div>
        </div>
      </header>

      <div className="main-container" style={{ maxWidth: "1800px", margin: "0 auto", padding: "24px 32px" }}>
        {/* Search & Filter Section */}
        <div className="search-section" style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <i className="bi bi-search" style={{ fontSize: "18px", color: "#666" }}></i>
            <h2 className="section-title" style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Search & Filter Calls</h2>
          </div>
          <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "#999" }}>All times are displayed in US Eastern Time (EST/EDT)</p>

          <input
            type="text"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", marginBottom: "20px" }}
            placeholder="Search by phone number, voice, or category (Press Apply to search)..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
          />

          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                Transcription Search
              </label>
              <input
                type="text"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                placeholder="Search text within transcriptions..."
                value={transcriptionSearch}
                onChange={(e) => setTranscriptionSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                Transcription Stage
              </label>
              <input
                type="number"
                min="0"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", boxSizing: "border-box" }}
                placeholder="Any Stage (e.g., 1, 2)"
                value={transcriptionStage}
                onChange={(e) => setTranscriptionStage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              />
            </div>
          </div>

          {/* Date and Time Inputs */}
          <div className="date-grid" style={{ marginBottom: "24px" }}>
            <DateRangePicker 
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              onApply={handleApplyFilters}
            />
          </div>

          {/* Stage Filters */}
          {availableStages.length > 0 && (
            <div className="filter-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "20px" }}>
              {availableStages.map(stageNum => {
                const stageCategories = getStageCategories(stageNum);
                const filterKey = `stage${stageNum}`;

                if (stageCategories.length === 0) return null;

                return (
                  <div key={stageNum} className="filter-box" style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                    border: "1px solid #f3f4f6",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%"
                  }}>
                    {/* Card Header */}
                    <div style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#fff"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          width: "8px",
                          height: "8px",
                          backgroundColor: "#3b82f6",
                          borderRadius: "50%",
                          display: "inline-block"
                        }}></span>
                        <i className="bi bi-funnel" style={{ color: "#6b7280", fontSize: "14px" }}></i>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                          Stage {stageNum} Categories
                        </span>
                      </div>
                      <span style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        backgroundColor: "#f3f4f6",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontWeight: 600
                      }}>
                        {stageCategories.length} items
                      </span>
                    </div>

                    {/* Category List */}
                    <div
                      className="custom-scrollbar"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "0 20px",
                        maxHeight: "300px",
                        overflowY: "auto"
                      }}
                    >
                      {stageCategories.map((categoryData, idx) => (
                        <label
                          key={categoryData.name}
                          className="checkbox-label"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            padding: "16px 0",
                            borderBottom: idx < stageCategories.length - 1 ? "1px solid #f3f4f6" : "none"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={stageFilters[filterKey]?.includes(categoryData.name) || false}
                              onChange={() => handleStageFilterToggle(stageNum, categoryData.name)}
                              style={{
                                cursor: "pointer",
                                width: "18px",
                                height: "18px",
                                accentColor: categoryData.color,
                                border: "1px solid #e5e7eb",
                                borderRadius: "4px"
                              }}
                            />

                            {/* Category Name */}
                            <span style={{
                              color: categoryData.color,
                              fontWeight: 600,
                              fontSize: "14px",
                            }}>
                              {categoryData.name}
                            </span>
                          </div>

                          {/* Percentage Badge */}
                          <div style={{
                            backgroundColor: hexToRgba(categoryData.color, 0.1),
                            color: categoryData.color,
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            minWidth: "48px",
                            textAlign: "center"
                          }}>
                            <span style={{ marginRight: "4px" }}>{categoryData.count}</span>
                            <span style={{ opacity: 0.8 }}>({categoryData.percentage < 1 ? "<1" : categoryData.percentage}%)</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}


          <div className="filter-actions" style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={handleApplyFilters} style={{ padding: "8px 20px", borderRadius: "4px", border: "none", backgroundColor: "#d32f2f", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="bi bi-funnel-fill"></i> Apply Filters
              </button>
              <button onClick={handleReset} style={{ padding: "8px 20px", borderRadius: "4px", border: "1px solid #ddd", backgroundColor: "white", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="bi bi-arrow-clockwise"></i> Reset
              </button>
            </div>

            {/* Total Results */}
            <div className="filter-results" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#666", fontWeight: 500 }}>
                Total Results:
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="percentage-badge" style={{
                  backgroundColor: "#e3f2fd",
                  color: "#1976d2",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "1px solid #90caf9"
                }}>
                  {totalRecords} calls
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call Records Table */}
        <div className="table-section" style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div className="table-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <i className="bi bi-telephone-fill" style={{ fontSize: "18px", color: "#666" }}></i>
                <h2 className="section-title" style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                  Call Records ({dashboardData?.total_calls || 0} total)
                </h2>
                {loading && <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>(Updating...)</span>}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#999" }}>All times are displayed in US Eastern Time (EST/EDT)</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="hideScreenshotCols"
                checked={hideScreenshotColumns}
                onChange={(e) => setHideScreenshotColumns(e.target.checked)}
                style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#4f46e5" }}
              />
              <label htmlFor="hideScreenshotCols" style={{ fontSize: "13px", color: "#666", cursor: "pointer", userSelect: "none", fontWeight: 500 }}>
                Hide Voice & Stage 1 (Screenshot)
              </label>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#fafafa", borderBottom: "2px solid #e0e0e0" }}>
                  <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, minWidth: "60px" }}>
                    #
                  </th>
                  <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, minWidth: "130px" }}>
                    Phone No
                  </th>
                  {!hideScreenshotColumns && (
                    <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, minWidth: "80px" }}>
                      Voice
                    </th>
                  )}
                  {availableStages.filter(stageNum => !hideScreenshotColumns || stageNum !== 1).map(stageNum => {
                    const collapsed = collapsedStages.has(stageNum);
                    const bg = stageNum % 2 === 0 ? "#f5f5f5" : "#ffffff";

                    if (collapsed) {
                      return (
                        <th
                          key={stageNum}
                          style={{ textAlign: "center", padding: "8px", fontWeight: 600, minWidth: "80px", backgroundColor: bg }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            <span>Stage {stageNum}</span>
                            <button
                              onClick={() => handleToggleStageCollapse(stageNum)}
                              title={`Expand Stage ${stageNum}`}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}
                            >
                              <i className="bi bi-caret-right-fill" style={{ fontSize: '10px' }}></i>
                            </button>
                          </div>
                        </th>
                      );
                    }

                    return (
                      <React.Fragment key={stageNum}>
                        <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, minWidth: "200px", backgroundColor: bg }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <span>Stage {stageNum} Transcript</span>
                            <button
                              onClick={() => handleToggleStageCollapse(stageNum)}
                              title={`Collapse Stage ${stageNum}`}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}
                            >
                              <i className="bi bi-caret-left-fill" style={{ fontSize: '10px' }}></i>
                            </button>
                          </div>
                        </th>
                        <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, minWidth: "120px", backgroundColor: bg }}>
                          Stage {stageNum}
                        </th>
                      </React.Fragment>
                    );
                  })}
                  <th
                    style={{ textAlign: "left", padding: "12px", fontWeight: 600, cursor: "pointer", minWidth: "160px", display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleSort("timestamp")}
                  >
                    Timestamp (US EST/EDT)
                    {sortColumn === "timestamp" && (
                      <i className={`bi bi-caret-${sortDirection === "asc" ? "up" : "down"}-fill`} style={{ fontSize: '10px' }}></i>
                    )}
                  </th>
                  <th style={{ textAlign: "center", padding: "12px", fontWeight: 600, minWidth: "100px" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {!dashboardData?.calls || dashboardData.calls.length === 0 ? (
                  <tr>
                    <td colSpan={totalColsCount} style={{ textAlign: "center", color: "#888", padding: 24 }}>
                      No call records found.
                    </td>
                  </tr>
                ) : (
                  dashboardData.calls.map((record) => (
                    <tr
                      key={record.id}
                      className="admin-data-row"
                      style={{ borderBottom: "1px solid #f0f0f0" }}
                    >
                      <td style={{ padding: "12px", fontWeight: 500 }}>{record.id}</td>
                      <td style={{ padding: "12px" }}>{record.number}</td>
                      {!hideScreenshotColumns && (
                        <td style={{ padding: "12px", color: "#666" }}>
                          {record.stages?.[0]?.voice || "-"}
                        </td>
                      )}

                      {availableStages.filter(stageNum => !hideScreenshotColumns || stageNum !== 1).map(stageNum => {
                        const collapsed = collapsedStages.has(stageNum);
                        const stageData = record.stages?.find(s => s.stage === stageNum);
                        const bgClass = stageNum % 2 === 0 ? "stage-bg-even" : "stage-bg-odd";

                        if (collapsed) {
                          // single narrow cell when collapsed
                          return (
                            <td key={stageNum} className={bgClass} style={{ padding: "8px", textAlign: "center", minWidth: "80px" }}>
                              <button
                                onClick={() => handleToggleStageCollapse(stageNum)}
                                title={`Expand Stage ${stageNum}`}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}
                              >
                                <i className="bi bi-caret-right-fill" style={{ fontSize: '10px' }}></i>
                                <span style={{ fontWeight: 600, fontSize: 12 }}>
                                  {stageData?.category || "-"}
                                </span>
                              </button>
                            </td>
                          );
                        }

                        // expanded: show transcription + category
                        if (stageData) {
                          return (
                            <React.Fragment key={stageNum}>
                              <td className={bgClass} style={{ padding: "12px", maxWidth: "300px", lineHeight: "1.4" }}>
                                {stageData.transcription || "-"}
                              </td>
                              <td className={bgClass} style={{ padding: "12px" }}>
                                <span className="category-badge" style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  backgroundColor: stageData.category_color || getCategoryColor(stageData.category),
                                  color: "white",
                                  display: "inline-block"
                                }}>
                                  {stageData.category}
                                </span>
                              </td>
                            </React.Fragment>
                          );
                        } else {
                          return (
                            <React.Fragment key={stageNum}>
                              <td className={bgClass} style={{ padding: "12px", textAlign: "center", color: "#ccc" }}>-</td>
                              <td className={bgClass} style={{ padding: "12px", textAlign: "center", color: "#ccc" }}>-</td>
                            </React.Fragment>
                          );
                        }
                      })}

                      <td style={{ padding: "12px", color: "#666" }}>
                        {record.first_timestamp}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button
                          onClick={() => handleOpenReportModal(record.id)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#fef3c7",
                            color: "#d97706",
                            border: "1px solid #fde68a",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            margin: "0 auto"
                          }}
                          title="Report Issue"
                        >
                          <i className="bi bi-flag-fill"></i> Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-container" style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="pagination-info" style={{ fontSize: "13px", color: "#666" }}>
              {totalRecords > 0 ? (
                <>Showing {startRecord} to {endRecord} of {totalRecords} records</>
              ) : (
                "No records found"
              )}
            </div>
            <div className="pagination-buttons" style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                style={{ padding: "6px 12px", border: "1px solid #ddd", borderRadius: "4px", backgroundColor: "white", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "13px", opacity: currentPage === 1 ? 0.5 : 1 }}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              {(() => {
                const totalPages = dashboardData?.pagination?.total_pages || 1;
                const pages = [];
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                if (endPage - startPage < maxPagesToShow - 1) {
                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }

                return pages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: "6px 12px",
                      border: page === currentPage ? "none" : "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: page === currentPage ? "#d32f2f" : "white",
                      color: page === currentPage ? "white" : "#333",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {page}
                  </button>
                ));
              })()}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(dashboardData?.pagination?.total_pages || 1, prev + 1))}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  cursor: currentPage === (dashboardData?.pagination?.total_pages || 1) ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  opacity: currentPage === (dashboardData?.pagination?.total_pages || 1) ? 0.5 : 1
                }}
                disabled={currentPage === (dashboardData?.pagination?.total_pages || 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />

      {/* Report Modal */}
      {showReportModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white", padding: "24px", borderRadius: "8px",
            width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "18px" }}>Report Call #{reportCallId}</h3>

            {reportModalError && <div style={{ color: "#d32f2f", marginBottom: "12px", fontSize: "14px" }}>{reportModalError}</div>}
            {reportModalSuccess && <div style={{ color: "#2e7d32", marginBottom: "12px", fontSize: "14px" }}>{reportModalSuccess}</div>}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>Category</label>
              <select
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                value={selectedReportCategory}
                onChange={(e) => setSelectedReportCategory(e.target.value)}
              >
                <option value="">Select a category...</option>
                {reportCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>Description</label>
              <textarea
                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", minHeight: "80px" }}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Please enter a description..."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ padding: "8px 16px", border: "1px solid #ddd", backgroundColor: "white", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport || reportModalSuccess}
                style={{ padding: "8px 16px", border: "none", backgroundColor: "#4f46e5", color: "white", borderRadius: "4px", cursor: submittingReport ? "not-allowed" : "pointer", fontSize: "14px", opacity: (submittingReport || reportModalSuccess) ? 0.7 : 1 }}
              >
                {submittingReport ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          /* Header */
          .header-container {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 16px !important;
          }
          
          .header-left {
            margin-bottom: 12px;
          }
          
          .header-right {
            flex-wrap: wrap;
            gap: 8px !important;
          }
          
          .header-btn {
            flex: 1;
            min-width: calc(50% - 4px);
            justify-content: center;
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
          
          /* Container */
          .main-container {
            padding: 16px !important;
          }
          
          /* Search Section */
          .search-section {
            padding: 16px !important;
          }
          
          .date-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          
          .filter-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          .filter-actions {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          
          .filter-results {
            width: 100%;
            justify-content: space-between !important;
            padding: 12px;
            background-color: #f5f5f5;
            border-radius: 6px;
            margin-top: 8px;
          }
          
          /* Table Section */
          .table-section {
            padding: 16px !important;
          }
          
          .table-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          
          .table-search {
            width: 100% !important;
          }
          
          .table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          .data-table {
            min-width: 1200px;
            font-size: 12px !important;
          }
          
          .data-table th,
          .data-table td {
            padding: 8px !important;
            font-size: 12px !important;
          }
          
          .data-table th {
            white-space: nowrap;
          }
          
          /* Pagination */
          .pagination-container {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: stretch !important;
          }
          
          .pagination-info {
            text-align: center;
          }
          
          .pagination-buttons {
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .pagination-buttons button {
            font-size: 12px !important;
            padding: 6px 10px !important;
          }
        }
        
        @media (max-width: 480px) {
          .admin-badge {
            font-size: 11px !important;
            padding: 3px 8px !important;
          }
          
          .header-btn {
            font-size: 11px !important;
            padding: 6px 10px !important;
          }
          
          .header-btn i {
            font-size: 12px !important;
          }
          
          .section-title {
            font-size: 14px !important;
          }
          
          .filter-box {
            padding: 12px !important;
          }
          
          .filter-title {
            font-size: 13px !important;
          }
          
          .checkbox-label {
            font-size: 12px !important;
          }
          
          .category-badge {
            font-size: 10px !important;
            padding: 3px 8px !important;
          }
          
          .percentage-badge {
            font-size: 11px !important;
            padding: 4px 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;