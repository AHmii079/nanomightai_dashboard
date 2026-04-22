import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "./api";
import ClientHeader from "./ClientHeader";
import Loader from "./components/Loader";

export default function DataExport({ isEmbedded }) {
  const location = useLocation();
  const [campaignId, setCampaignId] = useState(null);
  const [exportOptions, setExportOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");

  const [exportType, setExportType] = useState("all");
  const [selectedLists, setSelectedLists] = useState([]);
  const [selectedDispositions, setSelectedDispositions] = useState([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const isInitialLoad = useRef(true);

  // Get campaign ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("campaign_id");
    if (id) {
      setCampaignId(parseInt(id, 10));
      isInitialLoad.current = true; // Reset for new campaign
    } else {
      setError("Campaign ID is required");
      setLoading(false);
    }
  }, [location.search]);

  // Fetch export options when campaign ID or filters change
  useEffect(() => {
    const fetchExportOptions = async () => {
      if (!campaignId) return;

      try {
        setLoading(true);
        setError("");

        // Build query parameters for pre-filtering
        const params = new URLSearchParams();

        // Use current state values
        const currentLists = selectedLists;
        const currentExportOptions = exportOptions;

        if (currentLists.length > 0 && currentLists.length < (currentExportOptions?.list_ids?.length || Infinity)) {
          params.append("list_ids", currentLists.join(","));
        }

        if (startDate) {
          params.append("start_date", startDate);
          if (startTime) {
            params.append("start_time", startTime);
          }
        }

        if (endDate) {
          params.append("end_date", endDate);
          if (endTime) {
            params.append("end_time", endTime);
          }
        }

        const queryString = params.toString();
        const url = `/export/${campaignId}/options${queryString ? `?${queryString}` : ""}`;

        const response = await api.get(url);
        const data = response.data;

        setExportOptions(data);
        setClientName(data.client_name);

        // Only reset selections on initial load
        if (isInitialLoad.current) {
          setSelectedLists([]);
          setSelectedDispositions([]);
          isInitialLoad.current = false;
        }
      } catch (err) {
        console.error("Error fetching export options:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Access denied. Please check your permissions.");
        } else if (err.response?.status === 404) {
          setError("Campaign not found.");
        } else {
          setError(err.response?.data?.detail || "Failed to load export options. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchExportOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, startDate, startTime, endDate, endTime, selectedLists]);

  const handleExport = async () => {
    if (!campaignId) {
      setError("Campaign ID is required");
      return;
    }

    try {
      setExporting(true);
      setError("");

      const payload = {
        list_ids: selectedLists.length === 0 || selectedLists.length === exportOptions.list_ids.length ? [] : selectedLists.map(String),
        categories: selectedDispositions.length === 0 || selectedDispositions.length === exportOptions.all_categories.length ? [] : selectedDispositions,
        start_date: startDate || null,
        start_time: startTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
      };

      // Call the download endpoint
      const response = await api.post(`/export/${campaignId}/download`, payload, {
        responseType: 'blob', // Important for downloading files
      });

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `call_data_${exportOptions?.campaign_name || campaignId}_${Date.now()}.csv`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success message
      setError("");
      alert("Export completed successfully!");
    } catch (err) {
      console.error("Export error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Access denied. Please check your permissions.");
      } else if (err.response?.status === 404) {
        setError("Campaign not found.");
      } else {
        setError(err.response?.data?.detail || "Export failed. Please try again.");
      }
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const toggleList = (listId) => {
    setSelectedLists((prev) => {
      return prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId];
    });
  };

  const toggleDisposition = (disposition) => {
    setSelectedDispositions((prev) => prev.includes(disposition) ? prev.filter((d) => d !== disposition) : [...prev, disposition]);
  };

  const selectAllLists = () => {
    if (exportOptions?.list_ids) {
      setSelectedLists(selectedLists.length === exportOptions.list_ids.length ? [] : exportOptions.list_ids);
    }
  };

  const selectAllDispositions = () => {
    if (exportOptions?.all_categories) {
      setSelectedDispositions(selectedDispositions.length === exportOptions.all_categories.length ? [] : exportOptions.all_categories.map((c) => c.name));
    }
  };

  const resetFilters = () => {
    setExportType("all");
    setSelectedLists([]);
    setSelectedDispositions([]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setStartTime("");
    setEndDate("");
    setEndTime("");
  };

  const getDispositionIcon = (name) => {
    const icons = {
      "answering machine": { color: "text-blue-500", path: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
      qualified: { color: "text-green-500", path: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
      "not interested": { color: "text-red-500", path: "M6 18L18 6M6 6l12 12" },
      dnc: { color: "text-pink-500", path: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
      "do not qualify": { color: "text-yellow-500", path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
      "unclear response": { color: "text-gray-500", path: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
      honeypot: { color: "text-purple-500", path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
      neutral: { color: "text-gray-400", element: "circle" },
      busy: { color: "text-orange-500", path: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }
    };
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(icons)) {
      if (lowerName.includes(key.toLowerCase())) return value;
    }
    return { color: "text-gray-500", path: "M20 12H4" };
  };

  const calculateEstimatedSize = () => {
    const recordCount = getTotalRecords();
    const sizeInKB = recordCount * 0.5;
    return sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB.toFixed(0)} KB`;
  };

  const getTotalRecords = () => {
    // Use the total_records from API response directly
    // The API already calculates this correctly based on filters
    if (!exportOptions) return 0;

    // If dispositions are selected, sum their counts
    if (selectedDispositions.length > 0 && selectedDispositions.length < exportOptions.all_categories.length) {
      return selectedDispositions.reduce((sum, disp) => {
        const category = exportOptions.all_categories.find((c) => c.name === disp);
        return sum + (category?.count || 0);
      }, 0);
    }

    // Otherwise use the total from API (which is already filtered by date/list if applicable)
    return exportOptions.total_records || 0;
  };

  const hasDateFilter = () => {
    return !!(startDate || endDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader size="large" />
      </div>
    );
  }

  if (error && !exportOptions) {
    return (
      <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#f9fafb", color: "#111827", lineHeight: "1.5", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ color: "#ef4444", marginBottom: "1rem", fontSize: "1.125rem" }}>{error}</div>
          <button className="btn btn-primary" onClick={() => window.location.href = "/client-landing"}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundColor: "#f9fafb", color: "#111827", lineHeight: "1.5", minHeight: "100vh" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
        .btn-primary { background-color: #3b82f6; color: white; }
        .btn-primary:hover { background-color: #2563eb; }
        .btn-outline { background-color: white; color: #374151; border: 1px solid #d1d5db; }
        .btn-outline:hover { background-color: #f9fafb; }
        .btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn svg { width: 1rem; height: 1rem; }
        .main-content { max-width: 1280px; margin: 0 auto; padding: 2rem 1rem; }
        .page-header { margin-bottom: 1.5rem; }
        .page-title { display: flex; align-items: center; gap: 0.75rem; font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
        .page-title svg { width: 2rem; height: 2rem; color: #3b82f6; }
        .page-subtitle { color: #6b7280; margin-top: 0.5rem; }
        .grid { display: grid; gap: 1.5rem; }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
        .col-span-2 { grid-column: span 2; }
        .card { background-color: white; border-radius: 0.75rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); overflow: hidden; }
        .card-header { padding: 1.5rem; border-bottom: 1px solid #f3f4f6; }
        .card-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.125rem; font-weight: 600; color: #111827; }
        .card-title svg { width: 1.25rem; height: 1.25rem; }
        .card-content { padding: 1.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
        .form-input, .form-select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; color: #111827; background-color: white; transition: all 0.2s; }
        .form-input:focus, .form-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .checkbox-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; max-height: 15rem; overflow-y: auto; }
        .checkbox-group-3col { grid-template-columns: repeat(3, 1fr); }
        .checkbox-item { display: flex; align-items: center; gap: 0.5rem; }
        .checkbox { width: 1rem; height: 1rem; border: 1px solid #d1d5db; border-radius: 0.25rem; cursor: pointer; }
        .checkbox:checked { background-color: #3b82f6; border-color: #3b82f6; }
        .checkbox-label { font-size: 0.875rem; font-weight: 500; color: #374151; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; flex: 1; }
        .badge { display: inline-flex; align-items: center; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; }
        .badge-outline { border: 1px solid #d1d5db; background-color: white; color: #374151; }
        .badge-warning { background-color: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
        .summary-row { display: flex; justify-content: space-between; padding: 0.5rem 0; }
        .summary-label { font-size: 0.875rem; color: #6b7280; }
        .summary-value { font-weight: 500; color: #111827; }
        .badge-group { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; }
        .icon-sm { width: 1rem; height: 1rem; }
        .text-blue-500 { color: #3b82f6; }
        .text-green-500 { color: #10b981; }
        .text-red-500 { color: #ef4444; }
        .text-pink-500 { color: #ec4899; }
        .text-yellow-500 { color: #eab308; }
        .text-gray-500 { color: #6b7280; }
        .text-purple-500 { color: #a855f7; }
        .text-gray-400 { color: #9ca3af; }
        .text-orange-500 { color: #f97316; }   
        @keyframes spin { to { transform: rotate(360deg); } }
        .info-card { background-color: #f9fafb; padding: 1rem; border-radius: 0.5rem; font-size: 0.875rem; color: #6b7280; }
        .info-card p { margin-bottom: 0.5rem; }
        .info-card p:last-child { margin-bottom: 0; }
        .warning-box { background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.875rem; color: #92400e; display: flex; align-items: start; gap: 0.5rem; }
        .warning-box svg { flex-shrink: 0; margin-top: 0.125rem; }
        .grid-cols-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .space-y-6 > * + * { margin-top: 1.5rem; }
        @media (max-width: 1024px) {
          .grid-cols-3 { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: span 1; }
          .checkbox-group-3col { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .checkbox-group, .checkbox-group-3col { grid-template-columns: 1fr; }
          .btn { width: 100%; justify-content: center; }
          .grid-cols-4 { grid-template-columns: 1fr; }
        }
      `}</style>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />

      {!isEmbedded && (
        <ClientHeader
          clientName={clientName}
          campaignId={campaignId}
          activePage="data-export"
        />
      )}

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Data Export
          </h1>
          <p className="page-subtitle">Export call data in CSV format with advanced filtering options</p>
          {error && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#fee2e2", border: "1px solid #ef4444", borderRadius: "0.5rem", color: "#991b1b", fontSize: "0.875rem" }}>
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3">
          <div className="col-span-2 space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Export Type
                </h2>
              </div>
              <div className="card-content">
                <select className="form-select" value={exportType} onChange={(e) => setExportType(e.target.value)}>
                  <option value="all">Export All Data</option>
                  <option value="by-list">Filter by List ID</option>
                  <option value="by-date">Filter by Date Range</option>
                  <option value="by-disposition">Filter by Disposition</option>
                </select>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  List ID Selection
                </h2>
              </div>
              <div className="card-content">
                <div className="flex-between">
                  <label className="form-label" style={{ marginBottom: 0 }}>Select List IDs to export:</label>
                  <button className="btn btn-outline" style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }} onClick={selectAllLists}>
                    {selectedLists.length === exportOptions?.list_ids?.length ? "Deselect All" : `Select All (${exportOptions?.list_ids?.length || 0})`}
                  </button>
                </div>
                <div className="checkbox-group">
                  {exportOptions?.list_ids?.map((listId) => (
                    <div key={listId} className="checkbox-item">
                      <input type="checkbox" className="checkbox" id={`list-${listId}`} checked={selectedLists.includes(listId)} onChange={() => toggleList(listId)} />
                      <label htmlFor={`list-${listId}`} className="checkbox-label">LIST-{listId}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Date Range Selection
                </h2>
              </div>
              <div className="card-content">
                <div className="grid-cols-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-date">Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-time">Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      id="start-time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="end-date">End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="end-time">End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      id="end-time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Disposition Selection
                </h2>
              </div>
              <div className="card-content">
                <div className="flex-between">
                  <label className="form-label" style={{ marginBottom: 0 }}>Select dispositions to export:</label>
                  <button className="btn btn-outline" style={{ padding: "0.375rem 0.75rem", fontSize: "0.875rem" }} onClick={selectAllDispositions}>
                    {selectedDispositions.length === exportOptions?.all_categories?.length ? "Deselect All" : `Select All (${exportOptions?.all_categories?.length || 0})`}
                  </button>
                </div>
                <div className="checkbox-group checkbox-group-3col">
                  {exportOptions?.all_categories?.map((category) => {
                    const icon = getDispositionIcon(category.name);
                    return (
                      <div key={category.name} className="checkbox-item">
                        <input type="checkbox" className="checkbox" id={`disp-${category.name}`} checked={selectedDispositions.includes(category.name)} onChange={() => toggleDisposition(category.name)} />
                        <label htmlFor={`disp-${category.name}`} className="checkbox-label">
                          <svg className={`icon-sm ${icon.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {icon.element === "circle" ? <circle cx="12" cy="12" r="10" strokeWidth="2" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon.path} />}
                          </svg>
                          {category.name} ({category.count.toLocaleString()})
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Export Summary
                </h2>
              </div>
              <div className="card-content space-y-4">
                {hasDateFilter() && (
                  <div className="warning-box">
                    <svg className="icon-sm text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <strong>Date filter active</strong>
                      <div style={{ marginTop: "0.25rem" }}>Record counts shown are estimates. Actual count will be determined during export.</div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="summary-row">
                    <span className="summary-label">Total Records:</span>
                    <span className="summary-value">
                      {hasDateFilter() ? "~" : ""}{getTotalRecords().toLocaleString()}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Estimated Size:</span>
                    <span className="summary-value">{calculateEstimatedSize()}</span>
                  </div>
                </div>

                <div>
                  <span className="summary-label">Selected List IDs:</span>
                  <div className="badge-group">
                    {selectedLists.length === 0 ? (
                      <span className="badge badge-outline">All lists</span>
                    ) : selectedLists.length === exportOptions?.list_ids?.length ? (
                      <span className="badge badge-outline">All lists ({selectedLists.length})</span>
                    ) : (
                      <>
                        {selectedLists.slice(0, 3).map((listId) => (
                          <span key={listId} className="badge badge-outline">LIST-{listId}</span>
                        ))}
                        {selectedLists.length > 3 && <span className="badge badge-outline">+{selectedLists.length - 3} more</span>}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <span className="summary-label">Selected Dispositions:</span>
                  <div className="badge-group">
                    {selectedDispositions.length === 0 ? (
                      <span className="badge badge-outline">All dispositions</span>
                    ) : selectedDispositions.length === exportOptions?.all_categories?.length ? (
                      <span className="badge badge-outline">All dispositions ({selectedDispositions.length})</span>
                    ) : (
                      <>
                        {selectedDispositions.slice(0, 2).map((disp) => (
                          <span key={disp} className="badge badge-outline">{disp}</span>
                        ))}
                        {selectedDispositions.length > 2 && <span className="badge badge-outline">+{selectedDispositions.length - 2} more</span>}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <span className="summary-label">Date Range:</span>
                  <div style={{ fontSize: "0.875rem", marginTop: "0.25rem", color: "#374151" }}>
                    {startDate && endDate ? (
                      <>
                        {startDate} {startTime && `${startTime}`} to {endDate} {endTime && `${endTime}`}
                      </>
                    ) : startDate ? (
                      `From ${startDate}${startTime ? ` ${startTime}` : ""}`
                    ) : endDate ? (
                      `Until ${endDate}${endTime ? ` ${endTime}` : ""}`
                    ) : (
                      "No date filter"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-content space-y-4" style={{ paddingTop: "1.5rem" }}>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%" }}
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Loader size="small" />
                      Exporting...
                    </div>
                  ) : (
                    <>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export to CSV
                    </>
                  )}
                </button>
                <button className="btn btn-outline" style={{ width: "100%" }} onClick={resetFilters}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title" style={{ fontSize: "0.875rem" }}>Export Information</h2>
              </div>
              <div className="card-content info-card">
                <p>• CSV files include all call details: ID, phone number, List ID, disposition, timestamp, and stage</p>
                <p>• Date filters apply to call timestamps and will affect the final export</p>
                <p>• Large exports may take a few moments to generate</p>
                <p>• Files are automatically named with campaign name and timestamp</p>
                <p>• Leaving filters empty exports all available data</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}