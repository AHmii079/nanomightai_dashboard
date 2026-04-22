import React, { useState, useEffect } from "react";
import api from "./api"; // Use the configured axios instance
import Loader from "./components/Loader"; // Import Loader component

const CategoryTrends = ({ campaignId, isEmbedded }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedRange, setSelectedRange] = useState("15m");
    const [showTrends, setShowTrends] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const ENGAGED_CATEGORIES = ["Unclear Response", "Qualified", "Neutral"];

    // Mapping for UI: colors and icons
    const CATEGORY_STYLES = {
        "Neutral": { color: "#9ca3af", icon: "●" }, // Grey dot
        "Qualified": { color: "#16a34a", icon: "★" }, // Green Star
        "Unclear Response": { color: "#6b7280", icon: "?" }, // Grey Question
        "Answering Machine": { color: "#3b82f6", icon: "📱" }, // Blue Phone
        "Call Back": { color: "#eab308", icon: "●" }, // Yellow Dot
        "DAIR": { color: "#b91c1c", icon: "ℹ️" }, // Red Info
        "DNC": { color: "#ef4444", icon: "📞" }, // Red Phone X (approximation)
        "DNQ": { color: "#dc2626", icon: "●" }, // Red Dot
        "Honeypot": { color: "#000000", icon: "🛡️" }, // Black Shield
        "Inaudible": { color: "#8d6e63", icon: "🔊" }, // Brown Speaker
        "Not Interested": { color: "#84cc16", icon: "✖️" }, // Green X
        "User Hangup": { color: "#db2777", icon: "📞" }, // Pink Phone
        "User Silent": { color: "#dc2626", icon: "🎤" }, // Red Mic
    };

    const fetchTrendData = async () => {
        if (!campaignId) return;

        setLoading(true);
        setError(null);
        try {
            const now = new Date();
            let startDate, startTime, endDate, endTime, intervalMinutes;
            const formatDate = (date) => {
                return new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/New_York",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(date);
            };
            const formatTime = (date) => {
                const formatter = new Intl.DateTimeFormat("en-GB", {
                    timeZone: "America/New_York",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                });
                let timeStr = formatter.format(date);
                if (timeStr.startsWith("24:")) timeStr = "00:" + timeStr.substring(3);
                return timeStr;
            };

            if (selectedRange === "5m") {
                intervalMinutes = 5;
                const end = new Date(now.getTime());
                const start = new Date(now.getTime() - 10 * 60 * 1000);
                startDate = formatDate(start);
                startTime = formatTime(start);
                endDate = formatDate(end);
                endTime = formatTime(end);
            } else if (selectedRange === "15m") {
                intervalMinutes = 15;
                const end = new Date(now.getTime());
                const start = new Date(now.getTime() - 30 * 60 * 1000);
                startDate = formatDate(start);
                startTime = formatTime(start);
                endDate = formatDate(end);
                endTime = formatTime(end);
            } else if (selectedRange === "1h") {
                intervalMinutes = 60;
                const end = new Date(now.getTime());
                const start = new Date(now.getTime() - 120 * 60 * 1000);
                startDate = formatDate(start);
                startTime = formatTime(start);
                endDate = formatDate(end);
                endTime = formatTime(end);
            } else if (selectedRange === "today") {
                intervalMinutes = 1440;
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
                const yesterday = new Date(today);
                yesterday.setUTCDate(today.getUTCDate() - 1);
                const end = new Date();
                startDate = formatDate(yesterday);
                startTime = formatTime(yesterday);
                endDate = formatDate(end);
                endTime = formatTime(end);
            }

            const response = await api.get(`/campaigns/${campaignId}/category-timeseries`, {
                params: { start_date: startDate, start_time: startTime, end_date: endDate, end_time: endTime, interval_minutes: intervalMinutes }
            });

            processData(response.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const processData = (responseData) => {
        if (!responseData.intervals || responseData.intervals.length < 2) {
            setData(null);
            return;
        }

        const intervals = responseData.intervals;
        const currentInterval = intervals[intervals.length - 1];
        const previousInterval = intervals[intervals.length - 2];

        const processInterval = (interval) => {
            const categories = {};
            let total = 0;
            interval.categories.forEach(cat => {
                categories[cat.name] = cat;
                total += cat.count;
            });
            return { categories, total };
        };

        const current = processInterval(currentInterval);
        const previous = processInterval(previousInterval);

        // Group categories for separate columns
        const allCategoryNames = new Set([
            ...Object.keys(current.categories),
            ...Object.keys(previous.categories)
        ]);

        const engagedList = [];
        const dropOffList = [];

        allCategoryNames.forEach(name => {
            const isEngaged = ENGAGED_CATEGORIES.includes(name);
            const currCount = current.categories[name]?.count || 0;
            const prevCount = previous.categories[name]?.count || 0;

            // Calculate percentages
            const currPct = current.total ? (currCount / current.total) * 100 : 0;
            const prevPct = previous.total ? (prevCount / previous.total) * 100 : 0;
            const diff = currPct - prevPct;

            const item = {
                name,
                currCount,
                currPct,
                diff,
                isEngaged
            };

            if (isEngaged) engagedList.push(item);
            else dropOffList.push(item);
        });

        // Calculate Total Engaged Rate
        const currentEngagedCount = Object.values(current.categories)
            .filter(c => ENGAGED_CATEGORIES.includes(c.name))
            .reduce((sum, c) => sum + c.count, 0);
        const overallEngagedRate = current.total ? (currentEngagedCount / current.total) * 100 : 0;

        setData({
            engagedList: engagedList.sort((a, b) => a.name.localeCompare(b.name)),
            dropOffList: dropOffList.sort((a, b) => a.name.localeCompare(b.name)),
            overallEngagedRate
        });
    };

    useEffect(() => {
        if (campaignId) fetchTrendData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campaignId, selectedRange]);

    const renderCategoryRow = (item) => {
        const style = CATEGORY_STYLES[item.name] || { color: "#6b7280", icon: "●" };
        const showDiff = showTrends && Math.abs(item.diff) >= 0; // Show diff if active
        // Only show non-zero small decimal diffs if user requested? 
        // User asked "can you explain...". I offered to change it but user didn't explicitly say "yes change it".
        // Code is following previous approved logic.

        const isPositive = item.diff > 0;

        const arrowColor = isPositive ? "#16a34a" : "#dc2626";
        const arrow = isPositive ? "↑" : "↓";

        return (
            <div key={item.name} style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid #f3f4f6",
                fontSize: "14px"
            }}>
                <span style={{
                    color: style.color,
                    marginRight: "12px",
                    width: "20px",
                    textAlign: "center",
                    fontSize: "16px"
                }}>
                    {style.icon}
                </span>

                <span style={{ flex: 1, color: "#374151" }}>{item.name}</span>

                {showTrends && item.diff !== 0 && (
                    <span style={{
                        marginRight: "16px",
                        fontSize: "12px",
                        color: arrowColor,
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px"
                    }}>
                        {arrow} {Math.abs(item.diff).toFixed(0)}%
                    </span>
                )}
                {showTrends && item.diff === 0 && (
                    <span style={{ marginRight: "16px", fontSize: "12px", color: "#9ca3af" }}>-</span>
                )}

                <span style={{ fontWeight: "600", color: "#111827", minWidth: "40px", textAlign: "right" }}>
                    {item.currPct.toFixed(0)}%
                </span>
            </div>
        );
    };

    const containerStyle = isEmbedded ? {} : { backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isExpanded ? "32px" : "0", transition: "margin-bottom 0.2s" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <select
                            value={selectedRange}
                            onChange={(e) => setSelectedRange(e.target.value)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                                fontSize: "14px",
                                color: "#374151",
                                outline: "none",
                                minWidth: "140px"
                            }}
                        >
                            <option value="today">Today</option>
                            <option value="1h">Past 1 Hour</option>
                            <option value="15m">Past 15 Minutes</option>
                            <option value="5m">Past 5 Minutes</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setShowTrends(!showTrends)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: showTrends ? "#2563eb" : "#e5e7eb",
                            color: showTrends ? "white" : "#374151",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        Show Trends
                    </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {data && (
                        <div style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", borderRadius: "8px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>
                            {data.overallEngagedRate.toFixed(1)}%
                        </div>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#6b7280",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} style={{ fontSize: "20px" }}></i>
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <>
                    {loading && <div style={{ padding: "40px" }}><Loader size="medium" /></div>}

                    {data && !loading && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px" }}>
                            {/* Left Column: Engaged */}
                            <div>
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Engaged Outcomes</h3>
                                <div style={{ border: "1px solid #f3f4f6", borderRadius: "8px", padding: "0 16px", backgroundColor: "white" }}>
                                    {data.engagedList.map(renderCategoryRow)}
                                </div>
                            </div>

                            {/* Right Column: Drop Off */}
                            <div>
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Drop-Off Outcomes</h3>
                                <div style={{ border: "1px solid #f3f4f6", borderRadius: "8px", padding: "0 16px", backgroundColor: "white" }}>
                                    {data.dropOffList.map(renderCategoryRow)}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CategoryTrends;
