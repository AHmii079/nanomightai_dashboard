import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ClientHeader from "./ClientHeader";

const ClientRecordings = ({ isEmbedded }) => {
  const location = useLocation();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [clientName, setClientName] = useState("");

  // Filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("time");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination data
  const [pagination, setPagination] = useState(null);
  const [totalServersQueried, setTotalServersQueried] = useState(0);
  const [serversWithData, setServersWithData] = useState(0);
  const [durationStats, setDurationStats] = useState([]);
  const [totalDuration, setTotalDuration] = useState("00:00:00");
  const [viewMode, setViewMode] = useState("recordings");

  // Audio player states
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentRecording, setCurrentRecording] = useState(null);
  const [currentRowIndex, setCurrentRowIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef(null);

  // Get campaign ID from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get('campaign_id');
    if (id) {
      setCampaignId(id);
      setRecordings([]);
      setLoading(true);
      setError(null);
    } else {
      window.location.href = '/dashboard?view=dashboard';
    }
  }, [location.search]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setShowPlayer(false);
      setIsPlaying(false);
      setCurrentRecording(null);
    };
  }, []);

  // Fetch client name
  const fetchClientName = async () => {
    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      if (!token || !campaignId) return;

      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/campaigns/${campaignId}/dashboard?start_date=${today}&page=1&page_size=1`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClientName(data.client_name || "Client");
      }
    } catch (err) {
      console.error("Failed to fetch client name:", err);
    }
  };

  // Fetch client name when campaignId is available
  useEffect(() => {
    if (campaignId) {
      fetchClientName();
    }
  }, [campaignId]);

  // Fetch recordings - now includes searchText dependency
  useEffect(() => {
    if (campaignId) {
      fetchRecordings();
    }
  }, [campaignId, selectedDate, currentPage, pageSize, sortBy, sortDir, searchText]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      let url = `https://api.xlitecore.xdialnetworks.com/api/v1/recordings/campaign/${campaignId}?date=${selectedDate}&page=${currentPage}&page_size=${pageSize}&sort_by=${sortBy}&sort_dir=${sortDir}`;

      if (searchText && searchText.trim()) {
        url += `&number=${encodeURIComponent(searchText.trim())}`;
      }

      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
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
          } catch(e) {}
        }
        if (isExpired) {
          throw new Error("Session expired. Please login again.");
        } else {
          console.warn("Received 401 but token is still valid. Ignoring logout.");
        }
      }

      if (!response.ok) {
        throw new Error("Failed to fetch recordings");
      }

      const data = await response.json();
      setRecordings(data.recordings || []);
      setPagination(data.pagination);
      setTotalServersQueried(data.total_servers_queried || 0);
      setServersWithData(data.servers_with_data || 0);
      setDurationStats(data.duration_stats || []);
      setTotalDuration(data.total_duration || "00:00:00");
      setError(null);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("login")) {
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Audio player functions
  const playRecording = (recording, index) => {
    setCurrentRecording(recording);
    setCurrentRowIndex(index);
    setShowPlayer(true);

    if (audioRef.current) {
      audioRef.current.src = recording.file_url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playNext = () => {
    if (currentRowIndex < recordings.length - 1) {
      playRecording(recordings[currentRowIndex + 1], currentRowIndex + 1);
    }
  };

  const playPrevious = () => {
    if (currentRowIndex > 0) {
      playRecording(recordings[currentRowIndex - 1], currentRowIndex - 1);
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setShowPlayer(false);
    setIsPlaying(false);
    setCurrentRecording(null);
    setCurrentRowIndex(-1);
  };

  const seekAudio = (e) => {
    if (audioRef.current) {
      const progressBar = e.currentTarget;
      const clickX = e.nativeEvent.offsetX;
      const width = progressBar.offsetWidth;
      const percentage = clickX / width;
      audioRef.current.currentTime = audioRef.current.duration * percentage;
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCallTime = (timeStr) => {
    if (!timeStr) return timeStr;
    const cleanStr = timeStr.toString().trim();
    if (cleanStr.length === 6 && !isNaN(cleanStr)) {
      return `${cleanStr.substring(0, 2)}:${cleanStr.substring(2, 4)}:${cleanStr.substring(4, 6)}`;
    }
    return timeStr;
  };

  const downloadRecording = (recording) => {
    window.open(recording.file_url, '_blank');
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);

      if (autoplayEnabled && currentRowIndex < recordings.length - 1) {
        setTimeout(() => {
          playNext();
        }, 500);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [autoplayEnabled, currentRowIndex, recordings]);

  // Computed stats
  const totalRecordings = pagination?.total_records || 0;
  const pageDurationSecs = recordings.reduce((sum, r) => {
    if (!r.duration) return sum;
    const parts = r.duration.split(":");
    if (parts.length === 3) return sum + parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
    if (parts.length === 2) return sum + parseInt(parts[0])*60 + parseInt(parts[1]);
    return sum;
  }, 0);
  const totalDurationParts = (totalDuration || "").split(":");
  const totalHours = totalDurationParts.length === 3 ? parseInt(totalDurationParts[0], 10) || 0 : 0;
  const totalMins = totalDurationParts.length >= 2 ? parseInt(totalDurationParts[1], 10) || 0 : 0;
  const avgDurationSecs = recordings.length > 0 ? Math.round(pageDurationSecs / recordings.length) : 0;
  const totalSizeKB = recordings.reduce((sum, r) => {
    if (!r.size) return sum;
    const num = parseFloat(r.size);
    if (r.size.toLowerCase().includes("mb")) return sum + num * 1024;
    return sum + num;
  }, 0);
  const totalSizeGB = (totalSizeKB / (1024 * 1024)).toFixed(1);

  return (
    <>
      <style>{darkStyles}</style>
      <div className="rec-root">
        {/* Header */}
        {!isEmbedded && (
          <ClientHeader
            clientName={clientName}
            campaignId={campaignId}
            activePage="recordings"
          />
        )}

        {/* Main Content */}
        <div className="rec-content">
          {/* Metric Cards */}
          <div className="rec-cards-grid">
            <div className="rec-metric-card" style={{ borderBottom: "3px solid #34d399" }}>
              <div className="rec-metric-label">TOTAL RECORDINGS</div>
              <div className="rec-metric-value">{totalRecordings.toLocaleString()}</div>
              <div className="rec-metric-sub">
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <span className="rec-metric-badge" style={{ color: "#34d399" }}>+8.2%</span>
            </div>
            <div className="rec-metric-card" style={{ borderBottom: "3px solid #3b82f6" }}>
              <div className="rec-metric-label">TOTAL DURATION</div>
              <div className="rec-metric-value">{totalHours}h {totalMins}m</div>
              <div className="rec-metric-sub">Across all calls</div>
              <span className="rec-metric-badge-alt">{pagination?.total_pages || 0} pages</span>
            </div>
            <div className="rec-metric-card" style={{ borderBottom: "3px solid #a78bfa" }}>
              <div className="rec-metric-label">AVG DURATION</div>
              <div className="rec-metric-value">{avgDurationSecs}s</div>
              <div className="rec-metric-sub">Per recording</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="rec-search-bar">
            <div className="rec-search-wrap">
              <i className="bi bi-search rec-search-icon"></i>
              <input
                type="text"
                className="rec-input"
                placeholder="Search by phone number or extension..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="rec-date-wrap">
              <i className="bi bi-calendar3 rec-date-icon"></i>
              <input
                type="date"
                className="rec-input rec-date-input"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <button className="rec-reset-btn" onClick={() => { setSearchText(""); setSelectedDate(new Date().toISOString().split("T")[0]); setCurrentPage(1); }}>
              <i className="bi bi-arrow-clockwise"></i>
              Reset
            </button>
          </div>



          {/* Error Message */}
          {error && (
            <div className="rec-error">
              <i className="bi bi-exclamation-circle"></i>
              <div>{error}</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
              <i className="bi bi-arrow-clockwise" style={{ fontSize: "1.5rem", animation: "spin 1s linear infinite" }}></i>
              <p style={{ marginTop: "0.75rem" }}>Loading recordings...</p>
            </div>
          )}



          {/* Recordings Table */}
          {!loading && (
            <div className="rec-section">
              <div className="rec-table-header">
                <h3 className="rec-section-title" style={{ marginBottom: 0 }}>Call Recordings</h3>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Showing {pagination ? ((pagination.page - 1) * pagination.page_size) + 1 : 0}-{pagination ? Math.min(pagination.page * pagination.page_size, pagination.total_records) : 0} of {pagination?.total_records || 0}
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="rec-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("time")}>
                        TIME {sortBy === "time" && <i className={`bi bi-chevron-${sortDir === "desc" ? "down" : "up"}`}></i>}
                      </th>
                      <th onClick={() => handleSort("phone")}>
                        PHONE NUMBER {sortBy === "phone" && <i className={`bi bi-chevron-${sortDir === "desc" ? "down" : "up"}`}></i>}
                      </th>
                      <th onClick={() => handleSort("duration")}>
                        DURATION {sortBy === "duration" && <i className={`bi bi-chevron-${sortDir === "desc" ? "down" : "up"}`}></i>}
                      </th>
                      <th onClick={() => handleSort("size")}>
                        SIZE {sortBy === "size" && <i className={`bi bi-chevron-${sortDir === "desc" ? "down" : "up"}`}></i>}
                      </th>
                      <th>EXTENSION</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordings.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                          {searchText
                            ? `No recordings found for "${searchText}" on ${new Date(selectedDate).toLocaleDateString()}`
                            : `No recordings found for ${new Date(selectedDate).toLocaleDateString()}`
                          }
                        </td>
                      </tr>
                    ) : (
                      recordings.map((recording, index) => (
                        <tr
                          key={index}
                          className={currentRowIndex === index && showPlayer ? "playing" : ""}
                        >
                          <td className="rec-td-time">{formatCallTime(recording.time)}</td>
                          <td className="rec-td-phone">{recording.phone_number}</td>
                          <td className="rec-td-muted">{recording.duration}</td>
                          <td className="rec-td-muted">{recording.size}</td>
                          <td className="rec-td-ext">{recording.extension}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button className="rec-action-btn rec-play-action" onClick={() => playRecording(recording, index)}>
                                <i className="bi bi-play-fill"></i> Play
                              </button>
                              <button className="rec-action-btn rec-save-action" onClick={() => downloadRecording(recording)}>
                                <i className="bi bi-download"></i> Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.total_pages > 1 && (
                <div className="rec-pagination">
                  <span className="rec-pagination-info">
                    Showing {((pagination.page - 1) * pagination.page_size) + 1} to {Math.min(pagination.page * pagination.page_size, pagination.total_records)} of {pagination.total_records}
                  </span>
                  <div className="rec-pagination-btns">
                    <button className="rec-page-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</button>
                    <button className="rec-page-btn" onClick={() => setCurrentPage(currentPage - 1)} disabled={!pagination.has_prev}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                    {(() => {
                      const pages = [];
                      const totalPages = pagination.total_pages;
                      const maxVisible = 7;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                      let endPage = startPage + maxVisible - 1;
                      if (endPage > totalPages) { endPage = totalPages; startPage = Math.max(1, endPage - maxVisible + 1); }
                      for (let i = startPage; i <= endPage; i++) pages.push(i);
                      return pages.map((page) => (
                        <button key={page} className={`rec-page-btn ${page === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                          {page}
                        </button>
                      ));
                    })()}
                    <button className="rec-page-btn" onClick={() => setCurrentPage(currentPage + 1)} disabled={!pagination.has_next}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button className="rec-page-btn" onClick={() => setCurrentPage(pagination.total_pages)} disabled={currentPage === pagination.total_pages}>Last</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Minimalistic Audio Player */}
        <div className={`rec-player ${showPlayer ? "active" : ""}`}>
          <audio ref={audioRef}></audio>
          <div className="rec-player-inner">
            <div className="rec-player-left">
              <div className="rec-player-phone">{currentRecording?.phone_number || "N/A"}</div>
              <div className="rec-player-meta">
                {currentRecording?.server_name || "N/A"} • {currentRecording?.time ? formatCallTime(currentRecording.time) : "N/A"}
              </div>
            </div>
            <div className="rec-player-center">
              <button className="rec-ctrl-btn" onClick={playPrevious} disabled={currentRowIndex <= 0}>
                <i className="bi bi-skip-backward-fill"></i>
              </button>
              <button className="rec-play-btn" onClick={togglePlayPause}>
                <i className={`bi bi-${isPlaying ? "pause-fill" : "play-fill"}`}></i>
              </button>
              <button className="rec-ctrl-btn" onClick={playNext} disabled={currentRowIndex >= recordings.length - 1}>
                <i className="bi bi-skip-forward-fill"></i>
              </button>
              <div className="rec-progress-wrap">
                <span className="rec-time">{formatTime(currentTime)}</span>
                <div className="rec-progress-bar" onClick={seekAudio}>
                  <div className="rec-progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="rec-time">{currentRecording?.duration || "0:00"}</span>
              </div>
            </div>
            <button className="rec-close-btn" onClick={closePlayer}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </div>
    </>
  );
};

// ── Dark Glassmorphism Styles ──
const darkStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }

  .rec-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #0f172a;
    color: #e2e8f0;
    min-height: 100vh;
    padding-bottom: 80px;
  }

  .rec-content {
    padding: 0 28px 28px 28px;
  }

  /* ── Metric Cards ── */
  .rec-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
    padding-top: 24px;
  }

  .rec-metric-card {
    padding: 20px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
  }

  .rec-metric-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .rec-metric-value {
    font-size: 28px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.2;
  }

  .rec-metric-sub {
    font-size: 12px;
    color: #64748b;
  }

  .rec-metric-badge {
    font-size: 12px;
    font-weight: 600;
    margin-top: 4px;
  }

  .rec-metric-badge-alt {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.25);
    background: rgba(59, 130, 246, 0.08);
    margin-top: 4px;
    width: fit-content;
  }

  /* ── Search Bar ── */
  .rec-search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .rec-search-wrap {
    position: relative;
    flex: 1;
    min-width: 260px;
  }

  .rec-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    font-size: 14px;
    pointer-events: none;
  }

  .rec-input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background-color: rgba(30, 41, 59, 0.7);
    color: #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .rec-input:focus {
    border-color: rgba(59, 130, 246, 0.4);
  }

  .rec-input::placeholder {
    color: #475569;
  }

  .rec-date-wrap {
    position: relative;
    min-width: 180px;
  }

  .rec-date-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
    font-size: 14px;
    pointer-events: none;
  }

  .rec-date-input {
    padding-left: 38px;
    color-scheme: dark;
  }

  .rec-reset-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #94a3b8;
    background: rgba(30, 41, 59, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 16px;
    font-family: inherit;
    transition: all 0.15s;
  }

  .rec-reset-btn:hover {
    background: rgba(51, 65, 85, 0.7);
    color: #e2e8f0;
  }

  /* ── Toggle ── */
  .rec-toggle-row {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
  }

  .rec-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(15, 23, 42, 0.6);
    color: #94a3b8;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    transition: all 0.15s;
  }

  .rec-toggle-btn:hover {
    background: rgba(30, 41, 59, 0.8);
    color: #e2e8f0;
  }

  .rec-toggle-btn.active {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.10));
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.3);
  }

  /* ── Section ── */
  .rec-section {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .rec-section-title {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rec-table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  /* ── Error ── */
  .rec-error {
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: flex;
    gap: 10px;
    align-items: center;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.2);
    color: #fca5a5;
    font-size: 13px;
  }

  /* ── Table ── */
  .rec-table {
    width: 100%;
    border-collapse: collapse;
  }

  .rec-table thead {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .rec-table th {
    padding: 10px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .rec-table th:hover {
    color: #94a3b8;
  }

  .rec-table td {
    padding: 12px 16px;
    font-size: 14px;
    color: #94a3b8;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .rec-table tr:hover {
    background-color: rgba(255, 255, 255, 0.03);
  }

  .rec-table tr.playing {
    background-color: rgba(59, 130, 246, 0.08);
  }

  .rec-td-time {
    color: #e2e8f0 !important;
    font-variant-numeric: tabular-nums;
  }

  .rec-td-phone {
    color: #f1f5f9 !important;
    font-weight: 600 !important;
  }

  .rec-td-muted {
    color: #64748b !important;
  }

  .rec-td-ext {
    color: #60a5fa !important;
    font-weight: 500 !important;
  }

  /* ── Action Buttons ── */
  .rec-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all 0.15s;
  }

  .rec-play-action {
    background: #3b82f6;
    color: white;
  }

  .rec-play-action:hover {
    background: #2563eb;
  }

  .rec-save-action {
    background: rgba(30, 41, 59, 0.7);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .rec-save-action:hover {
    background: rgba(51, 65, 85, 0.7);
    color: #e2e8f0;
  }

  /* ── Duration Items ── */
  .rec-duration-item {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    transition: all 0.15s;
  }

  .rec-duration-item:hover {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .rec-duration-bar {
    flex: 1;
    margin: 0 12px;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    overflow: hidden;
  }

  .rec-duration-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 999px;
  }

  /* ── Pagination ── */
  .rec-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    margin-top: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .rec-pagination-info {
    font-size: 13px;
    color: #64748b;
  }

  .rec-pagination-btns {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .rec-page-btn {
    min-width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    background: rgba(30, 41, 59, 0.7);
    color: #94a3b8;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }

  .rec-page-btn:hover:not(:disabled) {
    background: rgba(51, 65, 85, 0.7);
    color: #e2e8f0;
  }

  .rec-page-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .rec-page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* ── Audio Player ── */
  .rec-player {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: 50;
    height: 64px;
  }

  .rec-player.active {
    transform: translateY(0);
  }

  .rec-player-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 100%;
    max-width: 1280px;
    margin: 0 auto;
  }

  .rec-player-left {
    min-width: 180px;
  }

  .rec-player-phone {
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .rec-player-meta {
    font-size: 12px;
    color: #64748b;
  }

  .rec-player-center {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 600px;
    margin: 0 2rem;
  }

  .rec-ctrl-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 6px;
    font-size: 14px;
    transition: color 0.15s;
  }

  .rec-ctrl-btn:hover { color: #e2e8f0; }
  .rec-ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .rec-play-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .rec-play-btn:hover { background: #2563eb; transform: scale(1.05); }

  .rec-progress-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rec-time {
    font-size: 12px;
    color: #64748b;
    min-width: 36px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .rec-progress-bar {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    cursor: pointer;
  }

  .rec-progress-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 2px;
    transition: width 0.1s linear;
  }

  .rec-close-btn {
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 8px;
    font-size: 14px;
    transition: color 0.15s;
  }

  .rec-close-btn:hover { color: #f1f5f9; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .rec-cards-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 600px) {
    .rec-cards-grid { grid-template-columns: 1fr; }
    .rec-content { padding: 0 16px 16px 16px; }
    .rec-player-center { margin: 0 1rem; }
    .rec-player-meta { display: none; }
  }
`;

export default ClientRecordings;