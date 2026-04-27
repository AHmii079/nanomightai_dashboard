import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "./api";
import ClientHeader from "./ClientHeader";
import Loader from "./components/Loader";

export default function ClientTransferSettings({ isEmbedded }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [campaignId, setCampaignId] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("campaign_id");
    const adminView = params.get("admin_view");
    
    if (id) {
      setCampaignId(id);
      if (adminView === "true") {
        setIsAdminView(true);
      }
    } else {
      navigate("/client-landing");
    }
  }, [location, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!campaignId) return;
      try {
        setLoading(true);
        setError(null);
        // Using direct fetch or api instance, DataExport used api.get/api.post
        // api.js usually automatically handles base URL:
        // Or if needed just use standard JS fetch with "access_token"
        // Let's use api from "./api" which handles tokens.
        const response = await api.get(`/campaigns/${campaignId}/transfer-category-settings`);
        setSettingsData(response.data);
        setSelectedPreset(response.data.selected_preset);
      } catch (err) {
        console.error("Error fetching transfer settings:", err);
        setError("Failed to load transfer settings.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [campaignId]);

  const handleSave = async () => {
    if (!campaignId || !selectedPreset) return;
    try {
      setSaving(true);
      setError(null);
      await api.put(`/campaigns/${campaignId}/transfer-category-settings`, {
        preset: selectedPreset
      });
      // Optionally reload data
      const response = await api.get(`/campaigns/${campaignId}/transfer-category-settings`);
      setSettingsData(response.data);
      alert("Transfer settings saved successfully!");
    } catch (err) {
      console.error("Error saving transfer settings:", err);
      setError("Failed to save transfer settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader size="large" />
      </div>
    );
  }

  if (error && !settingsData) {
    return (
        <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>
            <button className="btn btn-primary" onClick={() => window.location.href = "/client-landing"}>Go Back</button>
          </div>
        </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: isEmbedded ? "transparent" : "#f5f7f9", minHeight: isEmbedded ? "auto" : "100vh" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .main-content { max-width: 1200px; margin: 0 auto; padding: ${isEmbedded ? '0' : '2rem'}; }
        
        .card { 
          background: white; 
          border-radius: 8px; 
          border: 1px solid #dadce0;
          padding: 24px; 
        }
        
        .page-title { 
          font-family: 'Product Sans', 'Roboto', 'Inter', sans-serif;
          font-size: 22px; 
          font-weight: 400; 
          color: #202124; 
          margin-bottom: 8px; 
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }
        
        .page-title i {
          color: #1a73e8;
        }

        .page-subtitle { 
          color: #5f6368; 
          font-size: 14px; 
          margin-bottom: 32px; 
          font-family: 'Roboto', 'Inter', sans-serif;
        }
        
        .presets-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
          gap: 20px; 
          margin-bottom: 32px; 
        }
        
        .preset-card {
          border: 1px solid #dadce0;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          background-color: white;
          position: relative;
          overflow: hidden;
        }
        
        .preset-card:hover { 
          box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
          border-color: transparent;
        }
        
        .preset-card.selected { 
          border: 2px solid #1a73e8; 
          background-color: rgba(26,115,232,0.04); 
        }
        .preset-card.selected:hover {
          border-color: #1a73e8; 
        }
        
        .preset-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 0px; 
        }
        
        .preset-title { 
          font-size: 16px; 
          font-weight: 500; 
          color: #202124; 
          font-family: 'Google Sans', 'Product Sans', 'Roboto', sans-serif;
        }
        
        .preset-badge {
          background-color: #e8f0fe;
          color: #1967d2;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        
        .btn-primary {
          background-color: #1a73e8;
          color: white;
          padding: 0 24px;
          height: 36px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 14px;
          font-family: 'Google Sans', 'Roboto', sans-serif;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s, box-shadow 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
        }
        .btn-primary:hover { 
          background-color: #1b66c9; 
          box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
        }
        .btn-primary:disabled { 
          background-color: rgba(60,64,67,0.12); 
          color: rgba(60,64,67,0.38);
          box-shadow: none;
          cursor: not-allowed; 
        }
        
        .actions-bar {
          display: flex;
          justify-content: flex-end;
          padding-top: 24px;
          border-top: 1px solid #dadce0;
          margin-top: 32px;
        }
      `}</style>
      
      {!isEmbedded && (
        <ClientHeader
          clientName={settingsData?.client_name || "Client"}
          campaignId={settingsData?.campaign_id || campaignId}
          activePage="transfer-settings"
          isAdminView={isAdminView}
        />
      )}

      <main className="main-content">
        <div className="card">
          <h1 className="page-title">
            <i className="bi bi-sliders"></i>
            Transfer Category Settings
          </h1>
          <p className="page-subtitle">Select the categories that are allowed for transfers in this campaign.</p>
          
          {error && <div style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>}
          
          <div className="presets-grid">
            {settingsData?.presets?.map((preset) => (
              <div 
                key={preset.key} 
                className={`preset-card ${selectedPreset === preset.key ? "selected" : ""}`}
                onClick={() => setSelectedPreset(preset.key)}
              >
                <div className="preset-header" style={{ marginBottom: 0 }}>
                  <h3 className="preset-title">{preset.display_name}</h3>
                  {preset.key === settingsData.selected_preset && (
                    <span className="preset-badge">Active</span>
                  )}
                </div>
                
                {selectedPreset === preset.key && (
                  <div style={{ position: "absolute", top: 0, right: 0, borderTopRightRadius: "8px", borderBottomLeftRadius: "8px", backgroundColor: "#1a73e8", color: "white", padding: "0.25rem 0.5rem" }}>
                    <i className="bi bi-check-lg"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="actions-bar">
            <button 
              className="btn-primary" 
              onClick={handleSave} 
              disabled={saving || selectedPreset === settingsData?.selected_preset}
            >
              {saving ? (
                <><Loader size="small" /> Saving...</>
              ) : (
                <><i className="bi bi-save"></i> Save Settings</>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
