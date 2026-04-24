import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "./api";
import { isTokenExpired } from "./api";


import ClientHeader from "./ClientHeader";
import ClientRecordings from "./Clientrecordings";

import Loader from "./components/Loader";
import DateRangePicker from "./components/DateRangePicker";
import ClientTransferSettings from "./ClientTransferSettings";
const getUserRole = () => {
  return localStorage.getItem("role") || sessionStorage.getItem("role");
};
const MedicareDashboard = () => {
  const location = useLocation();
  const [currentView, setCurrentView] = useState("dashboard");
  const [showSummaryGraph, setShowSummaryGraph] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedOutcomes, setSelectedOutcomes] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [listId, setListId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timeRange, setTimeRange] = useState("Last 5 Minutes");
  const [campaignId, setCampaignId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState("id"); // Default sort by ID
  const [sortDirection, setSortDirection] = useState("desc"); // 'asc' or 'desc'

  // Modal states
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedCallRecord, setSelectedCallRecord] = useState(null);

  // Timeseries data for the graph
  const [timeseriesData, setTimeseriesData] = useState(null);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);

  // Transfer metrics data
  const [transferMetrics, setTransferMetrics] = useState(null);

  // Voice stats data
  const [voiceStats, setVoiceStats] = useState(null);
  const [voiceStatsLoading, setVoiceStatsLoading] = useState(false);

  // Trend comparison state for reports page


  // Trend timeseries data from API
  const [trendTimeseriesData, setTrendTimeseriesData] = useState(null);
  const [trendTimeseriesLoading, setTrendTimeseriesLoading] = useState(false);

  // KEY FIX: Get campaign ID and force reload on mount or URL change
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get("campaign_id");
    const view = urlParams.get("view"); // Check for view parameter
    const adminViewParam = urlParams.get("admin_view");

    if (id) {
      setCampaignId(id);
      // Set view to dashboard by default, or use view parameter if provided
      setCurrentView(view || "dashboard");

      if (adminViewParam === "true") {
        setIsAdminView(true);
      }

      // Set today's date as default if not set
      setStartDate((prev) => prev || new Date().toISOString().split("T")[0]);
    } else {
      window.location.href = "/";
    }
  }, [location.search]);
  useEffect(() => {
    const role = getUserRole();
    // Redirect logic for restricted roles
    if ((role === "qa" || role === "onboarding") && (currentView === "recordings")) {
      setCurrentView("dashboard");
    }
  }, [currentView]);
  const parseTimestamp = (timestamp) => {
    try {
      if (!timestamp) return null;

      // Handle format: "12/15/2025, 18:08:24"
      if (timestamp.includes(",")) {
        const [datePart, timePart] = timestamp.split(", ");
        const [month, day, year] = datePart.split("/");
        const [hours, minutes, seconds] = timePart.split(":");

        // Create date object (EST is UTC-5, but we'll treat input as local EST time)
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds || 0),
        );

        return isNaN(date.getTime()) ? null : date;
      }

      // Fallback for other formats
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      console.error("Error parsing timestamp:", timestamp, e);
      return null;
    }
  };
  // Add this helper function after parseTimestamp
  const parseUserInputDate = (dateStr, timeStr = "") => {
    try {
      if (!dateStr) return null;

      // dateStr format: "2025-12-15"
      // timeStr format: "14:30" or ""
      const [year, month, day] = dateStr.split("-");
      let hours = 0,
        minutes = 0,
        seconds = 0;

      if (timeStr) {
        [hours, minutes] = timeStr.split(":").map((n) => parseInt(n));
      }

      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        hours,
        minutes,
        seconds,
      );

      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      return null;
    }
  };

  // Function to format date for comparison and display
  // Update formatDateForComparison function (around line 492)
  const formatDateForComparison = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to get minutes from start of day
  const getMinutesFromStartOfDay = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours * 60 + minutes;
  };

  // Fetch dashboard data from API
  // ClientDashboard.jsx - Update fetchData useEffect to fetch all pages
  // Fetch dashboard data from API
  // ClientDashboard.jsx - Update fetchData useEffect to fetch all pages
  useEffect(() => {
    const fetchData = async () => {
      if (!campaignId || !startDate) return;

      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          throw new Error("No authentication token found. Please login again.");
        }

        // Construct API URL with all filters
        const params = new URLSearchParams();
        params.append("start_date", startDate);
        if (endDate) {
          params.append("end_date", endDate);
        }
        params.append("page", currentPage);
        params.append("page_size", RECORDS_PER_PAGE);

        // Add search and list_id filters
        if (searchText) params.append("search", searchText);
        if (listId) params.append("list_id", listId);

        // Add outcome filters - API uses "categories" parameter
        if (selectedOutcomes.length > 0) {
          selectedOutcomes.forEach(outcome => {
            params.append("categories", outcome);
          });
        }

        const apiUrl = `https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/${campaignId}/dashboard?${params.toString()}`;

        const response = await fetch(apiUrl, {
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
            throw new Error("Session expired. Please login again.");
          }
        }

        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = "Failed to fetch dashboard data";
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (parseErr) {
            // If we can't parse the error, use the status
            if (response.status >= 500) {
              errorMessage = "Server error occurred. Please try again later or contact support if the problem persists.";
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setDashboardData(data);
        setLoading(false);
      } catch (err) {
        // Handle network errors (CORS, connection issues, etc.)
        if (err.name === 'TypeError' && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
          setError('Unable to connect to the server. This may be due to network issues or server configuration. Please try again later.');
        } else {
          setError(err.message);
        }
        setLoading(false);

        if (err.message.includes("login")) {
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        }
      }
    };

    // Auto-fetch when any filter changes
    if (campaignId && startDate) {
      fetchData();
    }
  }, [campaignId, currentPage, startDate, endDate, searchText, listId, selectedOutcomes]); // Auto-apply filters

  // Fetch timeseries data for the graph
  useEffect(() => {
    const fetchTimeseriesData = async () => {
      if (!campaignId || !startDate) return;

      setTimeseriesLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        // Build query parameters
        const params = new URLSearchParams();

        let nyStartDate = startDate;
        let nyStartTime = startTime;
        let nyEndDate = endDate;
        let nyEndTime = endTime;

        try {
          const convertToNY = (dStr, tStr) => {
            if (!dStr) return { d: null, t: null };
            const dateObj = new Date(`${dStr}T${tStr || "00:00"}:00`);
            if (isNaN(dateObj.getTime())) return { d: dStr, t: tStr };

            const d = new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/New_York",
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            }).format(dateObj);

            let t = null;
            if (tStr) {
              const formatter = new Intl.DateTimeFormat("en-GB", {
                timeZone: "America/New_York",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
              });
              t = formatter.format(dateObj);
              if (t.startsWith("24:")) t = "00:" + t.substring(3);
            }
            return { d, t };
          };

          const startNY = convertToNY(startDate, startTime);
          nyStartDate = startNY.d || startDate;
          nyStartTime = startNY.t || startTime;

          const endNY = convertToNY(endDate, endTime);
          nyEndDate = endNY.d || endDate;
          nyEndTime = endNY.t || endTime;
        } catch (e) {
          console.error("Timezone conversion error", e);
        }

        params.append("start_date", nyStartDate);
        if (nyStartTime) params.append("start_time", nyStartTime);
        if (nyEndDate) {
          params.append("end_date", nyEndDate);
        }
        if (nyEndTime) params.append("end_time", nyEndTime);
        params.append("interval", "60"); // 60 minute intervals

        const apiUrl = `https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/${campaignId}/category-timeseries?${params.toString()}`;

        const response = await fetch(apiUrl, {
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
            // Session expired - redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            window.location.href = '/';
            return;
          }
        }

        if (response.ok) {
          const data = await response.json();
          setTimeseriesData(data);
        } else {
          console.warn('Timeseries data unavailable - server returned status:', response.status);
          // Don't break the dashboard, just log the issue
        }
      } catch (err) {
        // Handle network/CORS errors silently for timeseries (non-critical feature)
        if (err.name === 'TypeError' && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
          console.warn('Network error fetching timeseries data - feature temporarily unavailable');
        } else {
          console.error("Error fetching timeseries data:", err);
        }
      } finally {
        setTimeseriesLoading(false);
      }
    };

    if (campaignId && startDate) {
      fetchTimeseriesData();
    }
  }, [campaignId, startDate, startTime, endDate, endTime]);

  // Fetch transfer metrics from API
  useEffect(() => {
    const fetchTransferMetrics = async () => {
      if (!campaignId || !startDate) return;

      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        // Build query parameters
        const params = new URLSearchParams();
        params.append("start_date", startDate);
        if (startTime) params.append("start_time", startTime);
        if (endDate) {
          params.append("end_date", endDate);
        }
        if (endTime) params.append("end_time", endTime);

        const apiUrl = `https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/${campaignId}/transfer-metrics?${params.toString()}`;

        const response = await fetch(apiUrl, {
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
            // Session expired - redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            window.location.href = '/';
            return;
          }
        }

        if (response.ok) {
          const data = await response.json();
          setTransferMetrics(data);
        } else {
          console.warn('Transfer metrics unavailable - server returned status:', response.status);
          // Don't break the dashboard, just log the issue
        }
      } catch (err) {
        // Handle network/CORS errors silently for transfer metrics (non-critical feature)
        if (err.name === 'TypeError' && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
          console.warn('Network error fetching transfer metrics - feature temporarily unavailable');
        } else {
          console.error("Error fetching transfer metrics:", err);
        }
      }
    };

    if (campaignId && startDate) {
      fetchTransferMetrics();
    }
  }, [campaignId, startDate, startTime, endDate, endTime]);

  // Fetch voice stats from API
  useEffect(() => {
    const fetchVoiceStats = async () => {
      if (!campaignId || !startDate) return;

      setVoiceStatsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        // Build query parameters
        const params = new URLSearchParams();
        params.append("start_date", startDate);
        if (startTime) params.append("start_time", startTime);
        if (endDate) {
          params.append("end_date", endDate);
        }
        if (endTime) params.append("end_time", endTime);

        const apiUrl = `https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/stats/campaign-voice-stats/${campaignId}?${params.toString()}`;

        const response = await fetch(apiUrl, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          const currentToken = localStorage.getItem("access_token");
          if (currentToken && !isTokenExpired(currentToken)) {
            console.warn("Received 401 but token is still valid. Ignoring return.");
          } else {
            return;
          }
        }

        if (response.ok) {
          const data = await response.json();
          setVoiceStats(data);
        } else {
          console.warn('Voice stats unavailable - server returned status:', response.status);
        }
      } catch (err) {
        if (err.name === 'TypeError' && (err.message.includes('NetworkError') || err.message.includes('fetch'))) {
          console.warn('Network error fetching voice stats - feature temporarily unavailable');
        } else {
          console.error("Error fetching voice stats:", err);
        }
      } finally {
        setVoiceStatsLoading(false);
      }
    };

    if (campaignId && startDate) {
      fetchVoiceStats();
    }
  }, [campaignId, startDate, startTime, endDate, endTime]);

  // Auto-reload is no longer needed since filters auto-apply
  useEffect(() => {
    // This effect can be used for time range specific logic if needed
  }, [timeRange, currentView]);

  // Reset to page 1 when filters change

  const summaryChartRef = useRef(null);
  const mainChartRef = useRef(null);
  const summaryChartInstance = useRef(null);
  const mainChartInstance = useRef(null);

  const styles = {
    body: {
      margin: 0,
      padding: 0,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: "#0f172a",
      color: "#e2e8f0",
      minHeight: "100vh",
    },
    container: {
      marginLeft: "240px",
      padding: "0 28px 28px 28px",
      boxSizing: "border-box",
      minHeight: "100vh",
    },
    section: {
      background: "rgba(15, 23, 42, 0.6)",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px",
      border: "1px solid rgba(255, 255, 255, 0.06)",
    },
    sectionTitle: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "16px",
      fontWeight: 600,
      marginBottom: "8px",
      color: "#f1f5f9",
    },
    timezoneNote: {
      fontSize: "12px",
      color: "#64748b",
      marginBottom: "20px",
    },
    searchRow: {
      display: "flex",
      gap: "12px",
      marginBottom: "20px",
      flexWrap: "wrap",
    },
    searchInput: {
      flex: 1,
      minWidth: "200px",
      padding: "10px 14px 10px 36px",
      border: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "rgba(30, 41, 59, 0.7)",
      color: "#e2e8f0",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
    },
    datetimeRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "12px",
      marginBottom: "20px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    inputLabel: {
      fontSize: "13px",
      fontWeight: 500,
      color: "#94a3b8",
    },
    input: {
      padding: "10px 12px",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "8px",
      fontSize: "14px",
      backgroundColor: "rgba(30, 41, 59, 0.7)",
      color: "#e2e8f0",
    },
    callSummarySection: {
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      borderRadius: "12px",
      padding: "20px 24px",
      border: "1px solid rgba(255, 255, 255, 0.06)",
    },
    callLineChart: {
      marginTop: "10px",
      padding: "12px 14px 10px",
      borderRadius: "10px",
      background: "rgba(30, 41, 59, 0.5)",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      height: "280px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      overflowX: "auto",
      display: "block",
    },
  };

  // Get all categories from API response
  const allCategories = dashboardData?.all_categories || [];

  // Helper: get color for a category from all_categories
  const getCategoryColor = (category) => {
    const cat = allCategories.find(
      (c) => c.name === category || c.original_name === category,
    );
    return cat ? cat.color : "#818589";
  };

  // Helper: get icon for a category (default icon map, can be extended)
  const getCategoryIcon = (category) => {
    const iconMap = {
      Qualified: "bi-star-fill",
      Neutral: "bi-circle-fill",
      "Unclear Response": "bi-question-circle-fill",
      Inaudible: "bi-volume-mute-fill",
      "Answering Machine": "bi-phone-fill",
      DAIR: "bi-info-circle-fill",
      Honeypot: "bi-shield-fill",
      DNC: "bi-telephone-x-fill",
      "Do Not Qualify": "bi-exclamation-circle-fill",
      "Not Interested": "bi-x-circle-fill",
      "User Silent": "bi-mic-mute-fill",
      "User Hangup": "bi-telephone-minus-fill",
      "User Hang Up": "bi-telephone-minus-fill",
      Already: "bi-check-circle-fill",
      Busy: "bi-telephone-x-fill",
    };
    return iconMap[category] || "bi-circle-fill";
  };

  // Use API data for call records - use category directly from API
  // Normalize category name to match all_categories
  const callRecords = Array.isArray(dashboardData?.calls)
    ? dashboardData.calls.map((call) => {
      // Find matching category in all_categories to get the normalized name
      const matchedCategory = allCategories.find(
        (cat) =>
          cat.name === call.category || cat.original_name === call.category,
      );
      const normalizedCategory = matchedCategory
        ? matchedCategory.name
        : call.category;

      return {
        id: call.id,
        phone: call.number,
        listId: call.list_id,
        category: normalizedCategory, // Use normalized category name
        categoryColor:
          call.category_color ||
          matchedCategory?.color ||
          getCategoryColor(normalizedCategory),
        timestamp: call.timestamp,
        transcript: call.transcription,
        transferred: call.transferred,
      };
    })
    : [];

  // Filtered call records based on all filters
  // Server-side filtered call records (no client-side filtering needed)
  const filteredCallRecords = callRecords;

  // Calculate Metrics for Transfer Section
  // Use transfer metrics from API
  const totalCalls = transferMetrics?.total_calls || dashboardData?.total_calls || 0;

  // A Grade: From transfer-metrics API
  const aGradeCount = transferMetrics?.a_grade_transfers || 0;

  // B Grade: From transfer-metrics API
  const bGradeCount = transferMetrics?.b_grade_transfers || 0;

  // Dropped: From transfer-metrics API
  const droppedCount = transferMetrics?.drop_offs || 0;

  const totalTransferred = aGradeCount + bGradeCount;

  const transferredPercentageVal =
    totalCalls > 0
      ? Math.round((totalTransferred / totalCalls) * 100)
      : 0;

  const aGradePercentageVal =
    totalCalls > 0
      ? Math.round((aGradeCount / totalCalls) * 100)
      : 0;
  const bGradePercentageVal =
    totalCalls > 0
      ? Math.round((bGradeCount / totalCalls) * 100)
      : 0;
  const droppedPercentageVal =
    totalCalls > 0
      ? Math.round((droppedCount / totalCalls) * 100)
      : 0;

  // Outcomes from API Aggegrates
  const outcomes = allCategories.map((cat) => {
    const catName = cat.name;
    const count = cat.count || 0;

    return {
      id: catName.toLowerCase().replace(/\s/g, "-"),
      label: catName,
      icon: getCategoryIcon(catName),
      count: count,
      percentage: totalCalls > 0
        ? Math.round((count / totalCalls) * 100)
        : 0,
      color: cat.color || "#818589",
      bgColor: "#fff",
    };
  });

  // Calculate outcomes filtered by time range (for Engaged/Drop-Off sections)
  const getTimeFilteredRecords = () => {
    if (!timeRange) return callRecords;

    const now = new Date();
    let minutesBack = 0;

    switch (timeRange) {
      case "Last 5 Minutes":
        minutesBack = 5;
        break;
      case "Last 15 Minutes":
        minutesBack = 15;
        break;
      case "Last 1 Hour":
        minutesBack = 60;
        break;
      case "Today":
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        return callRecords.filter((record) => {
          if (!record.timestamp) return false;
          const recordDate = parseTimestamp(record.timestamp);
          return recordDate && recordDate >= startOfToday;
        });
      default:
        return callRecords;
    }

    // For time-based filters (not "Today")
    if (minutesBack > 0) {
      // Find the most recent call timestamp
      const allTimestamps = callRecords
        .map((r) => parseTimestamp(r.timestamp))
        .filter((d) => d !== null)
        .sort((a, b) => b - a); // Sort descending (newest first)

      if (allTimestamps.length === 0) {
        return [];
      }

      const mostRecentCallTime = allTimestamps[0];
      const startTime = new Date(
        mostRecentCallTime.getTime() - minutesBack * 60000,
      );

      // Filter records within the time range
      return callRecords.filter((record) => {
        if (!record.timestamp) return false;
        const recordDate = parseTimestamp(record.timestamp);
        return (
          recordDate &&
          recordDate >= startTime &&
          recordDate <= mostRecentCallTime
        );
      });
    }

    return callRecords;
  };

  const timeFilteredRecords = getTimeFilteredRecords();

  // Calculate totals for statistics view
  const qualifiedCount = filteredCallRecords.filter(
    (r) => r.category === "Qualified",
  ).length;
  const qualifiedPercentage =
    totalCalls > 0 ? Math.round((qualifiedCount / totalCalls) * 100) : 0;

  // Calculate qualified percentage for time-filtered records (used in summary section)
  const timeFilteredQualifiedCount = timeFilteredRecords.filter(
    (r) => r.category === "Qualified",
  ).length;
  const timeFilteredQualifiedPercentage =
    timeFilteredRecords.length > 0
      ? Math.round(
        (timeFilteredQualifiedCount / timeFilteredRecords.length) * 100,
      )
      : 0;

  // Handle outcome filter click (multi-select by default)
  const handleOutcomeClick = (catName) => {
    setSelectedOutcomes((prev) =>
      prev.includes(catName)
        ? prev.filter((c) => c !== catName)
        : [...prev, catName],
    );
  };
  // Add this after the filteredCallRecords logic (around line 620)
  // Server-side pagination
  const RECORDS_PER_PAGE = 25;
  const totalFilteredRecords = dashboardData?.pagination?.total_records || 0;
  const totalPages = dashboardData?.pagination?.total_pages || 1;
  const paginatedRecords = filteredCallRecords; // Data is already paginated from server

  // For display purposes in the footer
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;

  useEffect(() => {
    // Check if current page is valid
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  // Select All functionality - does nothing
  const handleSelectAll = () => {
    // Do nothing
  };

  const handleReset = () => {
    setSearchText("");
    setListId("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setSelectedOutcomes([]);
    setTimeRange("");
    setCurrentPage(1);
    // Filters will auto-apply due to useEffect dependencies
  };

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Handle opening transcript modal
  const handleShowTranscript = (record) => {
    setSelectedCallRecord(record);
    setShowTranscriptModal(true);
  };

  // Handle closing transcript modal
  const handleCloseTranscriptModal = () => {
    setShowTranscriptModal(false);
    setSelectedCallRecord(null);
  };

  const allSelected = false;

  // Helper: Check if category is "transferred" (Qualified) or "hangup" (everything else)
  const isTransferredCategory = (category) => {
    return category === "Qualified";
  };

  // Function to process summary data for time-based graph
  const processSummaryData = () => {
    if (!callRecords || callRecords.length === 0) {
      return { labels: [], aGradeData: [], bGradeData: [], hangupData: [] };
    }

    // Get the current time
    const now = new Date();

    // Filter records based on selected time range
    let filteredRecords = [];
    let startTime = null;
    let minutesBack = 0;

    switch (timeRange) {
      case "Last 5 Minutes":
        minutesBack = 5;
        break;
      case "Last 15 Minutes":
        minutesBack = 15;
        break;
      case "Last 1 Hour":
        minutesBack = 60;
        break;
      case "Today":
        // Get all records from today
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        filteredRecords = callRecords.filter((record) => {
          if (!record.timestamp) return false;
          const recordDate = parseTimestamp(record.timestamp);
          return recordDate && recordDate >= startOfToday;
        });
        break;
      default:
        return { labels: [], aGradeData: [], bGradeData: [], hangupData: [] };
    }

    // For time-based filters (not "Today")
    if (minutesBack > 0) {
      // Find the most recent call timestamp
      const allTimestamps = callRecords
        .map((r) => parseTimestamp(r.timestamp))
        .filter((d) => d !== null)
        .sort((a, b) => b - a); // Sort descending (newest first)

      if (allTimestamps.length === 0) {
        return { labels: [], aGradeData: [], bGradeData: [], hangupData: [] };
      }

      const mostRecentCallTime = allTimestamps[0];
      startTime = new Date(mostRecentCallTime.getTime() - minutesBack * 60000);

      // Filter records within the time range
      filteredRecords = callRecords.filter((record) => {
        if (!record.timestamp) return false;
        const recordDate = parseTimestamp(record.timestamp);
        return (
          recordDate &&
          recordDate >= startTime &&
          recordDate <= mostRecentCallTime
        );
      });
    }

    if (filteredRecords.length === 0) {
      return { labels: [], aGradeData: [], bGradeData: [], hangupData: [] };
    }

    // Get the time range for the graph
    const timestamps = filteredRecords
      .map((r) => parseTimestamp(r.timestamp))
      .filter((d) => d !== null)
      .sort((a, b) => a - b);

    const earliestTime = timestamps[0];
    const latestTime = timestamps[timestamps.length - 1];

    // Create minute-by-minute labels and data
    const labels = [];
    const aGradeData = [];
    const bGradeData = [];
    const hangupData = [];

    // Round down to the nearest minute
    const startMinute = new Date(earliestTime);
    startMinute.setSeconds(0, 0);

    const endMinute = new Date(latestTime);
    endMinute.setSeconds(59, 999);

    // Generate data for each minute
    let currentMinute = new Date(startMinute);
    while (currentMinute <= endMinute) {
      const nextMinute = new Date(currentMinute.getTime() + 60000);

      // Format label as HH:MM
      const hours = currentMinute.getHours();
      const minutes = currentMinute.getMinutes();
      const displayHour = hours % 12 || 12;
      const ampm = hours < 12 ? "AM" : "PM";
      labels.push(
        `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`,
      );

      // Count calls in this minute (cumulative)
      let aGradeCount = 0;
      let bGradeCount = 0;
      let hangupCount = 0;

      filteredRecords.forEach((record) => {
        const recordDate = parseTimestamp(record.timestamp);
        if (!recordDate) return;

        // Count all calls up to and including this minute
        if (recordDate <= nextMinute) {
          if (record.transferred) {
            if (record.category === "Qualified") {
              aGradeCount++;
            } else {
              bGradeCount++;
            }
          } else {
            hangupCount++;
          }
        }
      });

      aGradeData.push(aGradeCount);
      bGradeData.push(bGradeCount);
      hangupData.push(hangupCount);

      currentMinute = nextMinute;
    }

    return { labels, aGradeData, bGradeData, hangupData };
  };
  // KEY FIX: Cleanup charts on unmount and view change
  useEffect(() => {
    return () => {
      if (summaryChartInstance.current) {
        summaryChartInstance.current.destroy();
        summaryChartInstance.current = null;
      }
      if (mainChartInstance.current) {
        mainChartInstance.current.destroy();
        mainChartInstance.current = null;
      }
    };
  }, []);

  // KEY FIX: Destroy charts when switching views
  useEffect(() => {
    if (currentView !== "statistics" && mainChartInstance.current) {
      mainChartInstance.current.destroy();
      mainChartInstance.current = null;
    }
    if (!showSummaryGraph && summaryChartInstance.current) {
      summaryChartInstance.current.destroy();
      summaryChartInstance.current = null;
    }
  }, [currentView, showSummaryGraph]);
  // Initialize summary chart

  // Initialize summary chart
  useEffect(() => {
    if (showSummaryGraph && summaryChartRef.current) {
      if (summaryChartInstance.current) {
        summaryChartInstance.current.destroy();
      }

      const ctx = summaryChartRef.current.getContext("2d");

      // Create gradients
      const gradientGreen = ctx.createLinearGradient(0, 0, 0, 400);
      gradientGreen.addColorStop(0, "rgba(75, 192, 192, 0.2)");
      gradientGreen.addColorStop(1, "rgba(75, 192, 192, 0.05)");

      const gradientBlue = ctx.createLinearGradient(0, 0, 0, 400);
      gradientBlue.addColorStop(0, "rgba(54, 162, 235, 0.2)");
      gradientBlue.addColorStop(1, "rgba(54, 162, 235, 0.05)");

      const gradientRed = ctx.createLinearGradient(0, 0, 0, 400);
      gradientRed.addColorStop(0, "rgba(255, 99, 132, 0.2)");
      gradientRed.addColorStop(1, "rgba(255, 99, 132, 0.05)");

      // Get dynamic data
      const summaryData = processSummaryData();

      summaryChartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: summaryData.labels,
          datasets: [
            {
              label: "A Grade Transfers",
              data: summaryData.aGradeData,
              borderColor: "rgba(75, 192, 192, 1)",
              backgroundColor: gradientGreen,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 1.5,
            },
            {
              label: "B Grade Transfers",
              data: summaryData.bGradeData,
              borderColor: "rgba(54, 162, 235, 1)",
              backgroundColor: gradientBlue,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 1.5,
            },
            {
              label: "Hangups",
              data: summaryData.hangupData,
              borderColor: "rgba(255, 99, 132, 1)",
              backgroundColor: gradientRed,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }, // Changed to true to identify the 3 lines
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "#fff",
              titleColor: "#333",
              bodyColor: "#333",
              borderColor: "#eee",
              borderWidth: 1,
              padding: 12,
              caretSize: 6,
              cornerRadius: 6,
              callbacks: {
                title: (context) => context[0].label + " min",
              },
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#888", font: { size: 13 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: "#f0f0f0" },
              ticks: { color: "#bbb", font: { size: 13 } },
            },
          },
        },
      });
    }

    return () => {
      if (summaryChartInstance.current) {
        summaryChartInstance.current.destroy();
        summaryChartInstance.current = null;
      }
    };
  }, [showSummaryGraph, callRecords, timeRange]);

  const processStatisticsData = () => {
    // Use timeseries API data if available
    if (!timeseriesData || !timeseriesData.intervals || timeseriesData.intervals.length === 0) {
      return { labels: [], datasets: [] };
    }

    const allIntervals = timeseriesData.intervals;

    // Filter to only include intervals with active data (at least one category has count > 0)
    // This makes the graph start from "active time" where data begins
    const intervals = allIntervals.filter(interval => {
      const totalCount = interval.categories.reduce((sum, cat) => sum + (cat.count || 0), 0);
      return totalCount > 0;
    });

    // If no intervals have data, return empty
    if (intervals.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Get all unique categories from the timeseries data
    const allCategoriesFromTimeseries = new Set();
    intervals.forEach(interval => {
      interval.categories.forEach(cat => {
        allCategoriesFromTimeseries.add(cat.name);
      });
    });

    // Categories to show - use selected ones or all from timeseries
    const categoriesToShow =
      selectedOutcomes.length === 0
        ? Array.from(allCategoriesFromTimeseries)
        : selectedOutcomes;

    // Create labels from interval timestamps
    const labels = intervals.map((interval) => {
      const date = new Date(interval.interval_start);
      const displayHour = date.getHours() % 12 || 12;
      const ampm = date.getHours() < 12 ? "AM" : "PM";
      return `${displayHour} ${ampm}`;
    });

    // Helper function to convert hex to rgba
    const hexToRgba = (hex, alpha) => {
      // Handle invalid hex colors
      if (!hex || hex.length < 7) return `rgba(128, 128, 128, ${alpha})`;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Create datasets for each category
    const datasets = categoriesToShow.map((categoryName) => {
      // Get the data for this category across all intervals
      const data = intervals.map((interval) => {
        const categoryData = interval.categories.find(
          (cat) => cat.name === categoryName || cat.original_name === categoryName
        );
        return categoryData ? categoryData.count : 0;
      });

      // Get color from the first interval that has this category
      let color = "#818589"; // default gray
      for (const interval of intervals) {
        const categoryData = interval.categories.find(
          (cat) => cat.name === categoryName || cat.original_name === categoryName
        );
        if (categoryData && categoryData.color) {
          color = categoryData.color;
          break;
        }
      }

      // Override color for Qualified category to light blue
      if (categoryName === "Qualified") {
        color = "#3B9AFF";
      }

      return {
        label: categoryName,
        data: data,
        borderColor: hexToRgba(color, 0.8),
        backgroundColor: hexToRgba(color, 0.15),
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      };
    });

    return { labels, datasets };
  };

  // Initialize main statistics chart
  // Initialize main statistics chart
  useEffect(() => {
    if (
      currentView === "statistics" &&
      mainChartRef.current &&
      !loading &&
      !timeseriesLoading // Add this condition
    ) {
      if (!mainChartInstance.current) {
        const ctx = mainChartRef.current.getContext("2d");

        mainChartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: [],
            datasets: [],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "#fff",
                titleColor: "#333",
                bodyColor: "#333",
                borderColor: "#eee",
                borderWidth: 1,
                padding: 12,
                caretSize: 6,
                cornerRadius: 6,
              },
            },
            interaction: {
              mode: "nearest",
              axis: "x",
              intersect: false,
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: "#888", font: { size: 13 } },
                title: {
                  display: true,
                  text: "Time (Hour)",
                  color: "#666",
                  font: { size: 12 },
                },
              },
              y: {
                beginAtZero: true,
                grid: { color: "#f0f0f0" },
                ticks: {
                  color: "#bbb",
                  font: { size: 13 },
                  stepSize: 1,
                },
              },
            },
          },
        });
      }

      // Initial data load
      const chartData = processStatisticsData();

      // Check if we're viewing a single day
      const isSingleDay = !endDate || startDate === endDate;

      // Update x-axis title based on view mode
      mainChartInstance.current.options.scales.x.title.text = isSingleDay
        ? "Time (Hour)"
        : "Date";

      mainChartInstance.current.data.labels = chartData.labels;
      mainChartInstance.current.data.datasets = chartData.datasets;
      mainChartInstance.current.update();
    }
  }, [currentView, loading, timeseriesLoading, timeseriesData]); // Add timeseriesData to recreate chart when new data arrives

  useEffect(() => {
    if (currentView === "statistics" && mainChartInstance.current && !loading && !timeseriesLoading) {
      const chartData = processStatisticsData();

      // Determine view mode based on date selection
      const showDateView = startDate && endDate && startDate !== endDate;

      // Update x-axis title based on view mode
      mainChartInstance.current.options.scales.x.title.text =
        showDateView ? "Date" : "Time (Hour)";

      mainChartInstance.current.data.labels = chartData.labels;
      mainChartInstance.current.data.datasets = chartData.datasets;
      mainChartInstance.current.update();
    }
  }, [
    selectedOutcomes,
    currentView,
    timeseriesData,
    timeseriesLoading,
    startDate,
    startTime,
    endDate,
    endTime,
    loading,
  ]); // Use timeseriesData instead of callRecords

  useEffect(() => {
    if (dashboardData) {
      if (!dashboardData.client_name)
        console.log("client_name missing from API");
      if (!dashboardData.campaign) console.log("campaign missing from API");
    }
  }, [dashboardData]);

  // Update document title when dashboard data changes
  useEffect(() => {
    if (dashboardData?.client_name) {
      document.title = `${dashboardData.client_name} - Client Dashboard`;
    }
  }, [dashboardData]);

  // Only show loading on initial page load, not on filter refresh
  // This prevents the chart canvas from being unmounted during filter updates
  if (loading && !dashboardData)
    return (
      <div style={{ padding: 40 }}>
        <Loader size="large" />
      </div>
    );
  if (error)
    return (
      <div style={{
        padding: '40px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{
            color: '#DC2626',
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '12px'
          }}>
            Unable to Load Dashboard
          </h2>
          <p style={{
            color: '#991B1B',
            fontSize: '14px',
            lineHeight: '1.5',
            marginBottom: '20px'
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard?view=dashboard'}
            style={{
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Go Back
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
      </div>
    );

  return (
    <div style={styles.body}>
      {/* Sidebar */}
      <ClientHeader
        clientName={dashboardData?.client_name}
        campaignId={dashboardData?.campaign?.id || campaignId}
        activePage={
          currentView === "dashboard"
            ? "reports"
            : currentView === "recordings"
              ? "recordings"
              : "reports"
        }
        isAdminView={isAdminView}
      />
      <div style={styles.container}>
        {currentView === "recordings" && <ClientRecordings isEmbedded={true} />}
        {currentView === "transfer-settings" && <ClientTransferSettings isEmbedded={true} />}

        {/* Dashboard View */}
        {currentView === "dashboard" && (
          <>
            {/* Top Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 0 20px 0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#f1f5f9" }}>
                  Call Reports
                </h1>
                <span style={{
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                }}>
                  {dashboardData?.total_calls || totalCalls || 0} records
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  US Eastern Time (EST/EDT)
                </span>
              </div>
            </div>

            {/* Metric Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              marginBottom: "24px",
            }}>
              {[
                { label: "TOTAL CALLS", value: totalCalls, sub: `Today · All lists`, accent: "", accentColor: "#34d399", borderColor: "#34d399" },
                { label: "TRANSFERRED", value: totalTransferred, sub: `${transferredPercentageVal}% of total`, accent: `${transferredPercentageVal}%`, accentColor: "#3b82f6", borderColor: "#3b82f6" },
                { label: "DROPPED CALLS", value: droppedCount, sub: `${droppedPercentageVal}% of total`, accent: `-${droppedPercentageVal}%`, accentColor: "#f87171", borderColor: "#f87171" },
              ].map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "20px",
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{card.sub}</span>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: card.accentColor,
                      backgroundColor: `${card.accentColor}20`,
                      padding: "2px 8px",
                      borderRadius: "12px"
                    }}>{card.accent}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Search & Filter Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
              flexWrap: "wrap",
            }}>
              <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
                <i className="bi bi-search" style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontSize: "14px",
                }}></i>
                <input
                  type="text"
                  style={styles.searchInput}
                  placeholder="Search phone number, call ID, category..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div style={{ position: "relative", minWidth: "160px" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  letterSpacing: "0.04em",
                }}>LIST</span>
                <input
                  type="text"
                  style={{ ...styles.searchInput, paddingLeft: "42px", flex: "none", width: "100%" }}
                  placeholder="Any list ID..."
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <DateRangePicker
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                />
              </div>
              <button
                onClick={handleReset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#94a3b8",
                  background: "rgba(30, 41, 59, 0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  padding: "10px 16px",
                }}
              >
                <i className="bi bi-arrow-clockwise"></i>
                Reset
              </button>
            </div>


            {/* Category Filter Pills - Horizontal Scroll */}
              <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div
                className="hide-scrollbar"
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "24px",
                  overflowX: "auto",
                  paddingBottom: "4px",
                  scrollbarWidth: "none", // Firefox
                  msOverflowStyle: "none", // IE and Edge
              }}>
              {outcomes.map((outcome) => {
                const isSelected = selectedOutcomes.includes(outcome.label);
                return (
                  <button
                    key={outcome.id}
                    onClick={() => handleOutcomeClick(outcome.label)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "2px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: isSelected ? `1px solid ${outcome.color}` : "1px solid rgba(255,255,255,0.06)",
                      background: isSelected ? "rgba(15, 23, 42, 0.8)" : "rgba(15, 23, 42, 0.6)",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontFamily: "inherit",
                      minWidth: "100px",
                    }}
                  >
                    <span style={{ fontSize: "18px", fontWeight: 700, color: isSelected ? outcome.color : "#f1f5f9" }}>
                      {outcome.count >= 1000 ? (outcome.count / 1000).toFixed(1) + "k" : outcome.count}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8", whiteSpace: "nowrap", marginTop: "2px" }}>{outcome.label}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: outcome.color, marginTop: "4px" }}>{outcome.percentage}%</span>
                  </button>
                );
              })}
            </div>

            {/* Summary Graph */}
            {showSummaryGraph && (
              <div style={{ ...styles.section, marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 600, color: "#f1f5f9" }}>
                      <i className="bi bi-bar-chart-line"></i>
                      Summary Calls Over Time
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {timeRange ? `${timeRange} - Calls transferred vs hangups` : "Calls transferred vs hangups by minute"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "40px", fontWeight: 700, color: "#60a5fa" }}>
                        {timeRange ? timeFilteredQualifiedCount.toLocaleString() : qualifiedCount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "15px", color: "#64748b" }}>Total Qualified</div>
                      <div style={{ fontSize: "15px", color: "#34d399", fontWeight: 600 }}>
                        <i className="bi bi-arrow-up"></i>{" "}
                        {timeRange ? timeFilteredQualifiedPercentage : qualifiedPercentage}%
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSummaryGraph(false)}
                      style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.1)", color: "#f87171", fontSize: "14px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <i className="bi bi-x-lg"></i> Close
                    </button>
                  </div>
                </div>
                <div style={styles.callLineChart}>
                  <canvas ref={summaryChartRef}></canvas>
                </div>
              </div>
            )}

            {/* Call Records Table */}
            <div style={styles.section}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#f1f5f9" }}>
                  Call Records
                </h2>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Showing {paginatedRecords.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, totalFilteredRecords)} of {totalFilteredRecords}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "800px",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "12px 16px",
                          fontWeight: 500,
                          color: "#64748b",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        SR#
                      </th>
                      <th
                        onClick={() => handleSort("timestamp")}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontWeight: 500,
                          color: "#64748b",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          Time, Date
                          {sortColumn === "timestamp" && (
                            <i
                              className={`bi bi-chevron-${sortDirection === "asc" ? "up" : "down"
                                }`}
                              style={{ fontSize: "12px" }}
                            ></i>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("phone")}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontWeight: 500,
                          color: "#64748b",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          Number
                          {sortColumn === "phone" && (
                            <i
                              className={`bi bi-chevron-${sortDirection === "asc" ? "up" : "down"
                                }`}
                              style={{ fontSize: "12px" }}
                            ></i>
                          )}
                        </div>
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontWeight: 500,
                          color: "#64748b",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Transcript
                      </th>
                      <th
                        onClick={() => handleSort("category")}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontWeight: 500,
                          color: "#64748b",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          Disposition
                          {sortColumn === "category" && (
                            <i
                              className={`bi bi-chevron-${sortDirection === "asc" ? "up" : "down"
                                }`}
                              style={{ fontSize: "12px" }}
                            ></i>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            color: "#888",
                            padding: 24,
                          }}
                        >
                          No call records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((record, index) => {
                        const outcome = outcomes.find(
                          (o) => o.label === record.category,
                        );
                        const categoryColor = outcome
                          ? outcome.color
                          : record.categoryColor;
                        return (
                          <tr
                            key={record.id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              transition: "background-color 0.2s",
                            }}
                            onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.03)")
                            }
                            onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                            }
                          >
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#94a3b8",
                                textAlign: "center",
                              }}
                            >
                              {startIndex + index + 1}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#9ca3af",
                              }}
                            >
                              {record.timestamp}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#f3f4f6",
                              }}
                            >
                              {record.phone}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "13px",
                                color: "#f3f4f6",
                              }}
                            >
                              {record.transcript ? (
                                <button
                                  onClick={() => handleShowTranscript(record)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "4px",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    backgroundColor: "rgba(30, 41, 59, 0.7)",
                                    color: "#94a3b8",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(255,255,255,0.08)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "rgba(30, 41, 59, 0.7)";
                                  }}
                                >
                                  <i className="bi bi-file-text"></i>
                                  Show Transcript
                                </button>
                              ) : (
                                <span style={{ color: "#475569" }}>
                                  No transcript
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  backgroundColor: categoryColor,
                                  color: "white",
                                }}
                              >
                                {record.category}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  Showing {paginatedRecords.length > 0 ? startIndex + 1 : 0} to{" "}
                  {Math.min(endIndex, totalFilteredRecords)} of{" "}
                  {totalFilteredRecords} filtered records
                  {totalFilteredRecords !== callRecords.length && (
                    <span style={{ color: "#999" }}>
                      {" "}
                      (out of {callRecords.length} total)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      backgroundColor: "rgba(30, 41, 59, 0.7)",
                      color: "#94a3b8",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                    Previous
                  </button>

                  <div style={{ display: "flex", gap: "4px" }}>
                    {(() => {
                      const pages = [];
                      const maxPagesToShow = 5;

                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(
                        totalPages,
                        startPage + maxPagesToShow - 1,
                      );

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
                            border:
                              page === currentPage ? "none" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "4px",
                            backgroundColor:
                              page === currentPage ? "#3b82f6" : "rgba(30, 41, 59, 0.7)",
                            color: page === currentPage ? "white" : "#94a3b8",
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          {page}
                        </button>
                      ));
                    })()}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      backgroundColor: "rgba(30, 41, 59, 0.7)",
                      color: "#94a3b8",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>{" "}
      {/* closing container div */}
      {/* Transcript Modal */}
      {showTranscriptModal && selectedCallRecord && (
        <div
          className="transcript-modal-container"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={handleCloseTranscriptModal}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                backgroundColor: "#0f172a",
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                zIndex: 1,
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#f1f5f9",
                  }}
                >
                  Call Transcript
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "13px",
                    color: "#94a3b8",
                  }}
                >
                  Call ID: <span style={{color: "#60a5fa"}}>{selectedCallRecord.id}</span>
                </p>
              </div>
              <button
                onClick={handleCloseTranscriptModal}
                style={{
                  border: "none",
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "#f1f5f9";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.5)";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {/* Call Information */}
              <div
                style={{
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "24px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#e2e8f0",
                  }}
                >
                  Call Information
                </h4>
                <div
                  className="modal-info-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "4px",
                      }}
                    >
                      Phone Number
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#f1f5f9",
                      }}
                    >
                      {selectedCallRecord.phone}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "4px",
                      }}
                    >
                      Disposition
                    </div>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: selectedCallRecord.categoryColor,
                          color: "white",
                        }}
                      >
                        {selectedCallRecord.category}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "4px",
                      }}
                    >
                      Timestamp (US EST/EDT)
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#f1f5f9",
                      }}
                    >
                      {selectedCallRecord.timestamp}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i className="bi bi-file-text" style={{color: "#64748b"}}></i>
                  Transcript
                </h4>
                <div
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "8px",
                    padding: "16px",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: "#cbd5e1",
                    maxHeight: "400px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedCallRecord.transcript || "No transcript available"}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "flex-end",
                position: "sticky",
                bottom: 0,
                backgroundColor: "#0f172a",
                borderBottomLeftRadius: "12px",
                borderBottomRightRadius: "12px",
              }}
            >
              <button
                onClick={handleCloseTranscriptModal}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(30, 41, 59, 0.7)",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.7)";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Responsive Styles */}
      <style>{`
          /* Base responsive settings */
          * {
            box-sizing: border-box;
          }

          /* Sortable table header hover effect */
          th[style*="cursor: pointer"]:hover {
            background-color: rgba(255,255,255,0.03);
            transition: background-color 0.2s;
          }

          /* Tablet and below (768px) */
          @media (max-width: 768px) {
            /* Make modal padding smaller on mobile */
            .transcript-modal-container {
              padding: 10px !important;
              align-items: flex-start !important;
            }

            /* Adjust modal info grid to single column on mobile */
            .modal-info-grid {
              grid-template-columns: 1fr !important;
            }

            /* Make statistics grid stack on mobile */
            .statistics-grid {
              grid-template-columns: 1fr !important;
            }

            /* Make outcome grids more compact on mobile */
            .outcomes-container {
              flex-direction: column !important;
              gap: 16px !important;
            }

            /* Adjust container padding on mobile */
            body > div > div:first-child {
              padding: 16px !important;
            }

            /* Make charts responsive height */
            canvas {
              max-height: 300px !important;
            }

            /* Stack header items on mobile */
            header > div {
              flex-direction: column !important;
              align-items: flex-start !important;
            }

            /* Make buttons smaller on mobile */
            button {
              font-size: 13px !important;
              padding: 6px 12px !important;
            }

            /* Table wrapper - allow horizontal scroll */
            table {
              font-size: 12px !important;
            }

            th, td {
              padding: 8px 10px !important;
              font-size: 12px !important;
            }

            /* Reduce modal padding on mobile */
            .transcript-modal-container > div > div {
              padding: 16px !important;
            }

            /* Make pagination stack */
            div[style*="pagination"] {
              flex-direction: column !important;
              gap: 12px !important;
            }
          }

          /* Mobile (480px and below) */
          @media (max-width: 480px) {
            /* Extra small screens */
            body {
              font-size: 14px !important;
            }

            /* Further reduce padding */
            section, div[style*="section"] {
              padding: 16px !important;
            }

            /* Make stat numbers smaller */
            div[style*="fontSize: '48px'"] {
              font-size: 32px !important;
            }

            div[style*="fontSize: '40px'"] {
              font-size: 28px !important;
            }

            /* Stack legend items vertically */
            div[style*="gap: '24px'"] {
              flex-direction: column !important;
              gap: 8px !important;
            }

            /* Full width modal on very small screens */
            .transcript-modal-container {
              padding: 0 !important;
            }

            .transcript-modal-container > div {
              max-height: 100vh !important;
              border-radius: 0 !important;
            }

            /* Make chips/badges wrap better */
            span[style*="borderRadius: '4px'"] {
              font-size: 11px !important;
              padding: 3px 8px !important;
            }

            /* Smaller headings on mobile */
            h2, h3 {
              font-size: 16px !important;
            }

            h4 {
              font-size: 14px !important;
            }

            /* Hide "Show Transcript" text on very small screens, keep icon */
            button i.bi-file-text + * {
              display: none;
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

export default MedicareDashboard;