import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "./components/Loader";
import DateRangePicker from "./components/DateRangePicker";

const AdminStageData = () => {
  const [campaignId, setCampaignId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab state
  const [activeStage, setActiveStage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get("campaign_id");
    if (id) {
      setCampaignId(id);
      
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      setStartDate(today);
      setFetchTrigger(prev => prev + 1);
    } else {
      navigate("/admin-landing");
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!campaignId || fetchTrigger === 0) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Not authenticated.");
          return;
        }

        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (startTime) params.append('start_time', startTime);
        if (endTime) params.append('end_time', endTime);

        const res = await fetch(`https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/${campaignId}/stage-progression?${params.toString()}`, {
          headers: {
            "accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch stage progression data");
        }

        const result = await res.json();
        setData(result);
        
        // Auto-select the first stage available if it exists and current activeStage is not in the list
        if (result.stages && result.stages.length > 0) {
          const stageNumbers = result.stages.map(s => s.stage);
          if (!stageNumbers.includes(activeStage)) {
            setActiveStage(stageNumbers[0]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, fetchTrigger]);

  const handleApplyFilters = () => {
    setFetchTrigger(prev => prev + 1);
  };

  const getStageName = (stageNum) => {
    return `Stage ${stageNum}`;
  };

  const currentStageData = data?.stages?.find(s => s.stage === activeStage);

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "Arial, sans-serif", backgroundColor: "#f5f5f5", minHeight: "100vh", zoom: "0.8" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "20px 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}
      >
        <div style={{
          maxWidth: "1800px",
          margin: "0 auto",
          padding: "0 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "700", color: "#111827", display: "flex", alignItems: "center", gap: "12px" }}>
              <i className="bi bi-bar-chart-steps" style={{ color: "#4f46e5" }}></i>
              {data ? `${data.client_name} - ${data.campaign?.name}` : "Stage Progression"}
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
              {loading ? "Loading..." : data ? `Model: ${data.campaign?.model}` : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
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
                gap: "8px"
              }}
            >
              <i className="bi bi-speedometer2"></i>
              Client Dashboard
            </button>
            <button
              onClick={() => navigate(`/admin-dashboard?campaign_id=${campaignId}`)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <i className="bi bi-arrow-left"></i>
              Back to Admin Dashboard
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1800px", margin: "0 auto", padding: "0 32px" }}>
        
        {/* Filters */}
        <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
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

        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Loader size="large" /></div>
        ) : error ? (
          <div style={{ padding: 40, color: 'red', textAlign: 'center' }}>Error: {error}</div>
        ) : (
          <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "24px" }}>
              {data?.stages?.map((stage) => (
                <button
                  key={stage.stage}
                  onClick={() => setActiveStage(stage.stage)}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: activeStage === stage.stage ? "2px solid #3b82f6" : "2px solid transparent",
                    color: activeStage === stage.stage ? "#3b82f6" : "#6b7280",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <i className="bi bi-chat-dots"></i>
                  {getStageName(stage.stage)}
                </button>
              ))}
            </div>

            {/* Stage Content */}
            {currentStageData ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px" }}>
                
                {/* Total Calls Card */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                  <div style={{ color: "#1e3a8a", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="bi bi-telephone-fill"></i> Total Calls
                  </div>
                  <div style={{ fontSize: "48px", fontWeight: "800", color: "#111827", marginBottom: "16px" }}>
                    {currentStageData.total_calls}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "14px" }}>
                    {getStageName(currentStageData.stage)} interactions
                  </div>
                </div>

                {/* Calls Forwarded Card */}
                <div style={{ border: "1px solid #d1fae5", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#ecfdf5" }}>
                  <div style={{ color: "#065f46", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="bi bi-check-circle"></i> Calls Forwarded
                  </div>
                  <div style={{ fontSize: "48px", fontWeight: "800", color: "#111827", marginBottom: "16px" }}>
                    {currentStageData.transferred_to_next}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "14px" }}>
                    <span style={{ backgroundColor: "#10b981", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                      {currentStageData.transfer_rate.toFixed(1)}%
                    </span>
                    of {getStageName(currentStageData.stage).toLowerCase()} calls
                  </div>
                </div>

                {/* Calls Dropped Card */}
                <div style={{ border: "1px solid #fee2e2", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#fef2f2" }}>
                  <div style={{ color: "#991b1b", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="bi bi-x-circle"></i> Calls Dropped
                  </div>
                  <div style={{ fontSize: "48px", fontWeight: "800", color: "#111827", marginBottom: "16px" }}>
                    {currentStageData.dropped_calls}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", fontSize: "14px" }}>
                    <span style={{ backgroundColor: "#ef4444", color: "white", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                      {currentStageData.drop_rate.toFixed(1)}%
                    </span>
                    of {getStageName(currentStageData.stage).toLowerCase()} calls
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                No stage data available.
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStageData;
