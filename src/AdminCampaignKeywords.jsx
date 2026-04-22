
import React, { useState, useEffect, useRef } from "react";
import Loader from "./components/Loader";
import { useNavigate } from "react-router-dom";
import api from "./api";
import {
    FaSearch,
    FaFilter,
    FaPlus,
    FaTrash,
    FaEdit,
    FaCloudUploadAlt,
    FaArrowLeft,
    FaSave,
    FaTimes,
    FaCheck,
    FaExclamationTriangle,
    FaList,
    FaThLarge,
} from "react-icons/fa";

const ChangesModal = ({ changes, onClose }) => {
    if (!changes) return null;

    if (typeof changes === 'string') {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1100
            }}>
                <div style={{
                    backgroundColor: 'white', padding: '32px', borderRadius: '16px',
                    width: '400px', maxWidth: '90%', textAlign: 'center'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '50%' }}>
                            <FaCheck style={{ color: '#10b981', fontSize: '32px' }} />
                        </div>
                    </div>
                    <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '20px' }}>Success</h3>
                    <p style={{ color: '#4b5563', margin: '0 0 24px 0', fontSize: '15px' }}>{changes}</p>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px', backgroundColor: '#4f46e5',
                            color: 'white', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600', width: '100%'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{
                backgroundColor: 'white', padding: '32px', borderRadius: '16px',
                width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCheck style={{ color: '#10b981' }} /> Update Summary
                </h3>
                
                {changes.new_categories?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#059669', fontSize: '15px' }}>New Categories Created ({changes.new_categories.length})</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {changes.new_categories.map(c => <span key={c} style={{ backgroundColor: '#ecfdf5', color: '#064e3b', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>{c}</span>)}
                        </div>
                    </div>
                )}

                {changes.updated_categories?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5', fontSize: '15px' }}>Categories Updated ({changes.updated_categories.length})</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {changes.updated_categories.map(c => {
                                const addedList = Array.isArray(c.keywords_added) ? c.keywords_added : (c.added_keywords || c.added_keywords_ui || []);
                                const removedList = Array.isArray(c.keywords_removed) ? c.keywords_removed : (c.removed_keywords || c.removed_keywords_ui || []);
                                const addedCount = typeof c.keywords_added === 'number' ? c.keywords_added : addedList.length;
                                const removedCount = typeof c.keywords_removed === 'number' ? c.keywords_removed : removedList.length;

                                return (
                                    <div key={c.category} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '10px 12px', borderRadius: '4px', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: (addedList.length || removedList.length) ? '6px' : '0' }}>
                                            <strong>{c.category}</strong>
                                            <span>
                                                {addedCount ? <span style={{color: '#059669', marginLeft: '8px'}}>+{addedCount} added</span> : null}
                                                {removedCount ? <span style={{color: '#e11d48', marginLeft: '8px'}}>-{removedCount} removed</span> : null}
                                            </span>
                                        </div>
                                        {addedList.length > 0 && (
                                            <div style={{ color: '#059669', fontSize: '12px', marginTop: '2px' }}>
                                                <strong>Added:</strong> {addedList.join(', ')}
                                            </div>
                                        )}
                                        {removedList.length > 0 && (
                                            <div style={{ color: '#e11d48', fontSize: '12px', marginTop: '2px' }}>
                                                <strong>Removed:</strong> {removedList.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {changes.deleted_categories?.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#e11d48', fontSize: '15px' }}>Categories Deleted ({changes.deleted_categories.length})</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {changes.deleted_categories.map(c => <span key={c} style={{ backgroundColor: '#ffe4e6', color: '#9f1239', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>{c}</span>)}
                        </div>
                    </div>
                )}

                {changes.renamed && (
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#d97706', fontSize: '15px' }}>Category Renamed</h4>
                        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '8px 12px', borderRadius: '4px', fontSize: '13px' }}>
                            <strong>{changes.renamed.from}</strong> → <strong>{changes.renamed.to}</strong>
                        </div>
                    </div>
                )}



                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px', backgroundColor: '#4f46e5',
                            color: 'white', border: 'none', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: '600'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminCampaignKeywords = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [filteredCampaigns, setFilteredCampaigns] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const [stats, setStats] = useState({
        total_campaign_models: 0,
        total_categories: 0,
        total_keywords: 0,
    });

    // Filters
    const [searchQuery, setSearchQuery] = useState("");

    const [filterHasKeywords, setFilterHasKeywords] = useState(false);
    const [viewMode, setViewMode] = useState("list");

    // UI State for selected model
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingCategory, setEditingCategory] = useState(null);
    const [renameCategoryName, setRenameCategoryName] = useState("");
    const [bulkKeywordsInput, setBulkKeywordsInput] = useState("");
    const [addingKeywordsToCategory, setAddingKeywordsToCategory] = useState(null);
    const [removingKeywordsMode, setRemovingKeywordsMode] = useState(null);
    const [selectedKeywords, setSelectedKeywords] = useState([]);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const fileInputRef = useRef(null);

    // New states for single category view
    const [activeCategory, setActiveCategory] = useState(null);
    const [keywordSearchQuery, setKeywordSearchQuery] = useState("");
    const [actionChanges, setActionChanges] = useState(null);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    useEffect(() => {
        let result = campaigns;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                (c) =>
                    c.campaign_name.toLowerCase().includes(lowerQuery) ||
                    c.model_name.toLowerCase().includes(lowerQuery)
            );
        }

        if (filterHasKeywords) {
            result = result.filter((c) => c.total_keywords > 0);
        }

        setFilteredCampaigns(result);
    }, [campaigns, searchQuery, filterHasKeywords]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await api.get("/campaigns/keywords/all");
            setCampaigns(response.data.campaign_keywords || []);
            setStats({
                total_campaign_models: response.data.total_campaign_models,
                total_categories: response.data.campaign_keywords.reduce(
                    (acc, cur) => acc + (cur.total_categories || 0),
                    0
                ),
                total_keywords: response.data.campaign_keywords.reduce(
                    (acc, cur) => acc + (cur.total_keywords || 0),
                    0
                ),
            });
            setError(null);
        } catch (err) {
            console.error("Failed to fetch campaigns:", err);
            setError("Failed to load campaign data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchModelDetails = async (id) => {
        try {
            setLoading(true);
            const response = await api.get(`/campaigns/keywords/campaign-model/${id}`);
            setSelectedModel(response.data);
            if (response.data.keywords && Object.keys(response.data.keywords).length > 0) {
                // Keep active category if it still exists
                setActiveCategory(prev => {
                    if (prev && response.data.keywords[prev]) return prev;
                    return Object.keys(response.data.keywords)[0];
                });
            } else {
                setActiveCategory(null);
            }
            setError(null);
        } catch (err) {
            console.error("Failed to fetch model details:", err);
            setError("Failed to load model details.");
        } finally {
            setLoading(false);
        }
    };

    const handleModelClick = (model) => {
        fetchModelDetails(model.campaign_model_id);
    };

    const handleBack = () => {
        setSelectedModel(null);
        fetchCampaigns(); // Refresh list to get updated stats
    };

    // --- Category Actions ---

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const response = await api.post(
                `/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/add-category`,
                { category: newCategoryName }
            );
            if (response.data?.changes) setActionChanges(response.data.changes);
            setNewCategoryName("");
            fetchModelDetails(selectedModel.campaign_model_id);
        } catch (err) {
            alert("Failed to add category: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleRenameCategory = async (oldName) => {
        if (!renameCategoryName.trim() || renameCategoryName === oldName) {
            setEditingCategory(null);
            return;
        }
        try {
            const response = await api.post(
                `/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/rename-category`,
                {
                    old_name: oldName,
                    new_name: renameCategoryName,
                }
            );
            if (response.data?.changes) setActionChanges(response.data.changes);
            setEditingCategory(null);
            fetchModelDetails(selectedModel.campaign_model_id);
        } catch (err) {
            alert(
                "Failed to rename category: " + (err.response?.data?.detail || err.message)
            );
        }
    };

    const handleDeleteCategory = async (category) => {
        if (
            !window.confirm(
                `Are you sure you want to delete category "${category}" and all its keywords?`
            )
        )
            return;
        try {
            const response = await api.post(
                `/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/delete-category`,
                { category }
            );
            if (response.data?.changes) setActionChanges(response.data.changes);
            fetchModelDetails(selectedModel.campaign_model_id);
        } catch (err) {
            alert(
                "Failed to delete category: " + (err.response?.data?.detail || err.message)
            );
        }
    };

    // --- Keyword Actions ---

    const handleAddKeywords = async (category) => {
        if (!bulkKeywordsInput.trim()) return;
        const keywords = bulkKeywordsInput
            .split("\n")
            .map((k) => k.trim())
            .filter((k) => k);

        try {
            const response = await api.post(
                `/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/bulk-add-keywords`,
                {
                    category,
                    keywords,
                }
            );
            if (response.data) {
                setActionChanges(response.data.message || "Keywords updated successfully.");
            }
            setBulkKeywordsInput("");
            setAddingKeywordsToCategory(null);
            fetchModelDetails(selectedModel.campaign_model_id);
        } catch (err) {
            alert(
                "Failed to add keywords: " + (err.response?.data?.detail || err.message)
            );
        }
    };

    const handleRemoveKeywords = async (category, keywordsToRemove) => {
        try {
            const response = await api.post(
                `/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/bulk-remove-keywords`,
                {
                    category,
                    keywords: keywordsToRemove,
                }
            );
            if (response.data) {
                setActionChanges(response.data.message || "Keywords updated successfully.");
            }
            setSelectedKeywords([]);
            setRemovingKeywordsMode(null);
            fetchModelDetails(selectedModel.campaign_model_id);
        } catch (err) {
            alert(
                "Failed to remove keywords: " + (err.response?.data?.detail || err.message)
            );
        }
    };

    const handleCSVUpload = async (file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);

        try {
            setLoading(true);
            const response = await api.post(
                `/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/upload-csv`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );
            setShowCsvModal(false);
            if (response.data?.changes) {
                setActionChanges(response.data.changes);
            } else {
                alert("Keywords replaced successfully from CSV.");
            }
            fetchModelDetails(selectedModel.campaign_model_id);
        } catch (err) {
            console.error(err);
            alert("Failed to upload CSV: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };


    // --- Render Helpers ---

    const renderStatsCard = (title, value, icon, color) => (
        <div
            style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                borderLeft: `4px solid ${color}`,
            }}
        >
            <div
                style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: `${color}15`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: color,
                    fontSize: "20px",
                }}
            >
                {icon}
            </div>
            <div>
                <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
                    {title}
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                    {value}
                </div>
            </div>
        </div>
    );

    if (loading && !campaigns.length && !selectedModel) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    backgroundColor: "#f3f4f6",
                }}
            >
                <Loader size="medium" /> {/* Assuming a global spinner class or I can add inline styles later */}
                Loading...
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f9fafb",
                fontFamily: "'Inter', sans-serif",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div
                style={{
                    maxWidth: "1400px",
                    margin: "0 auto",
                    marginBottom: "32px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: "28px",
                            fontWeight: "800",
                            color: "#111827",
                            marginBottom: "8px",
                        }}
                    >
                        Campaign Keywords Management
                    </h1>
                    <p style={{ color: "#6b7280" }}>
                        Manage keywords for AI campaign models and their categories.
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                {selectedModel ? (
                    // --- Detail View ---
                    <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
                        <button
                            onClick={handleBack}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#4f46e5",
                                fontWeight: "600",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "20px",
                                fontSize: "16px",
                            }}
                        >
                            <FaArrowLeft /> Back to List
                        </button>

                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "24px",
                                borderRadius: "16px",
                                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                                marginBottom: "24px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>
                                    {selectedModel.campaign_name}
                                </h2>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <span
                                        style={{
                                            backgroundColor: "#eff6ff",
                                            color: "#3b82f6",
                                            padding: "4px 12px",
                                            borderRadius: "20px",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                        }}
                                    >
                                        Model: {selectedModel.model_name}
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <span style={{ color: "#9ca3af", fontSize: "14px" }}>
                                            Last Updated: {selectedModel.last_updated ? new Date(selectedModel.last_updated).toLocaleString() : 'Never'}
                                        </span>
                                        {selectedModel.last_uploaded_filename && (
                                            <span style={{ color: "#6b7280", fontSize: "13px", fontWeight: "500", marginTop: "2px" }}>
                                                Source File: {selectedModel.last_uploaded_filename}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <button
                                    onClick={() => setShowCsvModal(true)}
                                    style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
                                >
                                    <FaCloudUploadAlt /> Upload CSV
                                </button>
                            </div>
                        </div>

                        {/* Category Selection Boxes partitioned into S1, S2, and S3 */}
                        {(() => {
                            const extractPNumber = (catName) => {
                                const match = catName.match(/_p(\d+)(?:_|$)/i);
                                return match ? parseInt(match[1], 10) : 999;
                            };

                            const allCategories = selectedModel.keywords ? Object.entries(selectedModel.keywords) : [];
                            const s1Categories = allCategories
                                .filter(([cat]) => cat.toLowerCase().includes('_s1'))
                                .sort((a, b) => extractPNumber(a[0]) - extractPNumber(b[0]));
                            const s2Categories = allCategories
                                .filter(([cat]) => cat.toLowerCase().includes('_s2') && !cat.toLowerCase().includes('_s1'))
                                .sort((a, b) => extractPNumber(a[0]) - extractPNumber(b[0]));
                            const s3Categories = allCategories
                                .filter(([cat]) => !cat.toLowerCase().includes('_s1') && !cat.toLowerCase().includes('_s2'))
                                .sort((a, b) => extractPNumber(a[0]) - extractPNumber(b[0]));

                            let colorIndex = 0;
                            const colors = ["#4f46e5", "#0ea5e9", "#f59e0b", "#9f1239", "#dc2626", "#d97706", "#c026d3", "#65a30d"];

                            const renderCategoryBox = ([category, keywords]) => {
                                const isSelected = activeCategory === category;
                                const color = colors[colorIndex % colors.length];
                                colorIndex++;

                                return (
                                    <div
                                        key={category}
                                        onClick={() => {
                                            setActiveCategory(category);
                                            setKeywordSearchQuery("");
                                        }}
                                        style={{
                                            backgroundColor: "white",
                                            border: isSelected ? `2px solid ${color}` : "1px solid #e5e7eb",
                                            borderRadius: "6px",
                                            padding: "10px 12px",
                                            cursor: "pointer",
                                            boxShadow: isSelected ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                                            transition: "all 0.2s ease-in-out",
                                            display: "flex",
                                            flexDirection: "column",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                                                {isSelected ? (
                                                    <FaCheck style={{ color: color, fontSize: "14px", flexShrink: 0 }} />
                                                ) : (
                                                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                                                )}
                                                <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", wordBreak: "break-word" }} title={category}>
                                                    {category}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: "12px", fontWeight: "500", color: "#6b7280", flexShrink: 0, marginLeft: "8px" }}>
                                                ({keywords.length})
                                            </span>
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <div style={{ marginBottom: "24px" }}>
                                    {/* S1 Categories */}
                                    {s1Categories.length > 0 && (
                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                            gap: "10px",
                                            marginBottom: "16px",
                                            paddingBottom: (s2Categories.length > 0 || s3Categories.length > 0) ? "16px" : "0",
                                            borderBottom: (s2Categories.length > 0 || s3Categories.length > 0) ? "1px dashed #e5e7eb" : "none"
                                        }}>
                                            {s1Categories.map(renderCategoryBox)}
                                        </div>
                                    )}

                                    {/* S2 Categories */}
                                    {s2Categories.length > 0 && (
                                        <div style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                            gap: "10px",
                                            marginBottom: "16px",
                                            paddingBottom: s3Categories.length > 0 ? "16px" : "0",
                                            borderBottom: s3Categories.length > 0 ? "1px dashed #e5e7eb" : "none"
                                        }}>
                                            {s2Categories.map(renderCategoryBox)}
                                        </div>
                                    )}

                                    {/* S3 Categories & Add Button */}
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                        gap: "10px",
                                    }}>
                                        {s3Categories.map(renderCategoryBox)}
                                        
                                        <div
                                            onClick={() => {
                                                const newName = window.prompt("Enter new category name:");
                                                if (newName && newName.trim()) {
                                                    api.post(`/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/add-category`, { category: newName.trim() })
                                                        .then((res) => {
                                                            if (res.data?.changes) setActionChanges(res.data.changes);
                                                            fetchModelDetails(selectedModel.campaign_model_id);
                                                        })
                                                        .catch(err => alert("Failed to add category: " + (err.response?.data?.detail || err.message)));
                                                }
                                            }}
                                            style={{
                                                backgroundColor: "#f9fafb",
                                                border: "2px dashed #d1d5db",
                                                borderRadius: "6px",
                                                padding: "10px 12px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "8px",
                                                color: "#6b7280",
                                                fontWeight: "600",
                                                fontSize: "13px",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = "#9ca3af";
                                                e.currentTarget.style.color = "#4b5563";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = "#d1d5db";
                                                e.currentTarget.style.color = "#6b7280";
                                            }}
                                        >
                                            <FaPlus /> Add Category
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}


                        {/* Active Category Detail */}
                        {activeCategory && selectedModel.keywords && selectedModel.keywords[activeCategory] && (
                            <div style={{
                                backgroundColor: "white",
                                borderRadius: "16px",
                                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                                border: "1px solid #f3f4f6",
                                overflow: "hidden",
                                padding: "32px",
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>
                                        {activeCategory}
                                    </h2>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <button
                                            onClick={() => {
                                                const newName = window.prompt("Enter new name for category:", activeCategory);
                                                if (newName && newName.trim() && newName.trim() !== activeCategory) {
                                                        api.post(`/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/rename-category`, { old_name: activeCategory, new_name: newName.trim() })
                                                            .then((res) => {
                                                                if (res.data?.changes) setActionChanges(res.data.changes);
                                                                fetchModelDetails(selectedModel.campaign_model_id);
                                                            })
                                                        .catch(err => alert("Failed to rename: " + (err.response?.data?.detail || err.message)));
                                                }
                                            }}
                                            style={{
                                                padding: "8px 16px",
                                                backgroundColor: "#f3f4f6",
                                                color: "#4b5563",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            <FaEdit /> Rename
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(activeCategory)}
                                            style={{
                                                padding: "8px 16px",
                                                backgroundColor: "#fee2e2",
                                                color: "#ef4444",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                            }}
                                        >
                                            <FaTrash /> Delete Category
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end", backgroundColor: "#f9fafb", padding: "16px", borderRadius: "10px" }}>
                                        {/* Search Keywords */}
                                        <div style={{ flex: 1, minWidth: "200px" }}>
                                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                                Search Keywords
                                            </label>
                                            <div style={{ position: "relative" }}>
                                                <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "13px" }} />
                                                <input
                                                    type="text"
                                                    placeholder="Type to search..."
                                                    value={keywordSearchQuery}
                                                    onChange={(e) => setKeywordSearchQuery(e.target.value)}
                                                    style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}
                                                />
                                            </div>
                                        </div>

                                        {/* Add Keywords */}
                                        <div style={{ flex: 2, minWidth: "250px" }}>
                                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                                Add Keywords <span style={{ fontWeight: "normal", color: "#6b7280", fontSize: "11px" }}>(comma-separated, no apostrophes)</span>
                                            </label>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <input
                                                    type="text"
                                                    placeholder="keyword1, keyword2..."
                                                    value={bulkKeywordsInput}
                                                    onChange={(e) => setBulkKeywordsInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (bulkKeywordsInput.trim()) {
                                                                const keywords = bulkKeywordsInput.split(",").map(k => k.trim()).filter(k => k);
                                                                api.post(`/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/bulk-add-keywords`, { category: activeCategory, keywords })
                                                                    .then((res) => {
                                                                        if (res.data) {
                                                                            setActionChanges(res.data.message || "Keywords updated successfully.");
                                                                        }
                                                                        setBulkKeywordsInput("");
                                                                        fetchModelDetails(selectedModel.campaign_model_id);
                                                                    })
                                                                    .catch(err => alert("Failed to add keywords: " + (err.response?.data?.detail || err.message)));
                                                            }
                                                        }
                                                    }}
                                                    style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (!bulkKeywordsInput.trim()) return;
                                                        const keywords = bulkKeywordsInput.split(",").map((k) => k.trim()).filter((k) => k);
                                                        api.post(`/campaigns/keywords/campaign-model/${selectedModel.campaign_model_id}/bulk-add-keywords`, { category: activeCategory, keywords })
                                                            .then((res) => {
                                                                if (res.data) {
                                                                    setActionChanges(res.data.message || "Keywords updated successfully.");
                                                                }
                                                                setBulkKeywordsInput("");
                                                                fetchModelDetails(selectedModel.campaign_model_id);
                                                            })
                                                            .catch(err => alert("Failed to add keywords: " + (err.response?.data?.detail || err.message)));
                                                    }}
                                                    style={{ padding: "8px 16px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Keywords List */}
                                    <div style={{ marginTop: "16px" }}>
                                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>
                                            Keywords ({(selectedModel.keywords[activeCategory] || []).length})
                                        </h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {(selectedModel.keywords[activeCategory] || [])
                                                .filter(k => k.toLowerCase().includes(keywordSearchQuery.toLowerCase()))
                                                .map((keyword, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                                                    >
                                                        <span style={{ color: "#374151", fontSize: "14px" }}>{keyword}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Remove keyword "${keyword}"?`)) {
                                                                    handleRemoveKeywords(activeCategory, [keyword]);
                                                                }
                                                            }}
                                                            style={{ color: "#ef4444", background: "none", border: "none", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            {(selectedModel.keywords[activeCategory] || []).filter(k => k.toLowerCase().includes(keywordSearchQuery.toLowerCase())).length === 0 && (
                                                <div style={{ color: "#9ca3af", fontStyle: "italic", padding: "16px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db" }}>
                                                    No keywords found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CSV Upload Modal */}
                        {showCsvModal && (
                            <div style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', zIndex: 1000
                            }}>
                                <div style={{
                                    backgroundColor: 'white', padding: '32px', borderRadius: '16px',
                                    width: '500px', maxWidth: '90%'
                                }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Upload Keywords CSV</h3>
                                    <div style={{
                                        backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
                                        color: '#92400e', padding: '12px', borderRadius: '8px',
                                        marginBottom: '24px', fontSize: '14px'
                                    }}>
                                        <FaExclamationTriangle style={{ marginRight: '8px' }} />
                                        <strong>Warning:</strong> This will REPLACE all existing keywords for this model.
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                                        Upload a CSV file where headers are category names and values are keywords.
                                    </p>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        ref={fileInputRef}
                                        style={{ marginBottom: '24px', width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                        <button
                                            onClick={() => setShowCsvModal(false)}
                                            style={{
                                                padding: '10px 20px', backgroundColor: 'transparent',
                                                border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleCSVUpload(fileInputRef.current?.files[0])}
                                            style={{
                                                padding: '10px 20px', backgroundColor: '#ef4444',
                                                color: 'white', border: 'none', borderRadius: '8px',
                                                cursor: 'pointer', fontWeight: '600'
                                            }}
                                        >
                                            Replace Keywords
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <ChangesModal changes={actionChanges} onClose={() => setActionChanges(null)} />

                    </div>
                ) : (
                    // --- List View ---
                    <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
                        {/* Stats Grid */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                gap: "24px",
                                marginBottom: "32px",
                            }}
                        >
                            {renderStatsCard(
                                "Total Campaigns Models",
                                stats.total_campaign_models,
                                <FaFilter />,
                                "#4f46e5"
                            )}
                            {renderStatsCard(
                                "Total Category Types",
                                stats.total_categories,
                                <FaSearch />,
                                "#10b981"
                            )}
                            {renderStatsCard(
                                "Total Keywords",
                                stats.total_keywords,
                                <FaPlus />,
                                "#f59e0b"
                            )}
                        </div>

                        {/* Filters */}
                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "24px",
                                borderRadius: "16px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                marginBottom: "24px",
                                display: "flex",
                                gap: "16px",
                                flexWrap: "wrap",
                                alignItems: "center",
                            }}
                        >
                            <div style={{ flex: 1, minWidth: "300px", position: "relative" }}>
                                <FaSearch
                                    style={{
                                        position: "absolute",
                                        left: "12px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "#9ca3af",
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search campaigns or models..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "12px 12px 12px 40px",
                                        borderRadius: "8px",
                                        border: "1px solid #e5e7eb",
                                        fontSize: "14px",
                                    }}
                                />
                            </div>
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={filterHasKeywords}
                                    onChange={(e) => setFilterHasKeywords(e.target.checked)}
                                    style={{ width: "16px", height: "16px" }}
                                />
                                <span style={{ fontSize: "14px", color: "#374151" }}>
                                    Show only with keywords
                                </span>
                            </label>
                        </div>
                        <div style={{ display: "flex", gap: "8px", backgroundColor: "white", padding: "4px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                            <button
                                onClick={() => setViewMode("card")}
                                style={{
                                    padding: "8px",
                                    backgroundColor: viewMode === "card" ? "#eff6ff" : "transparent",
                                    color: viewMode === "card" ? "#4f46e5" : "#6b7280",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                                title="Card View"
                            >
                                <FaThLarge />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                style={{
                                    padding: "8px",
                                    backgroundColor: viewMode === "list" ? "#eff6ff" : "transparent",
                                    color: viewMode === "list" ? "#4f46e5" : "#6b7280",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                                title="List View"
                            >
                                <FaList />
                            </button>
                        </div>

                        {/* List/Grid View */}
                        {viewMode === "list" ? (
                            <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                                            <th style={{ padding: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Campaign / Model</th>
                                            <th style={{ padding: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Status</th>
                                            <th style={{ padding: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Categories</th>
                                            <th style={{ padding: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Keywords</th>
                                            <th style={{ padding: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>Last Updated</th>
                                            <th style={{ padding: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCampaigns.map((model) => (
                                            <tr
                                                key={model.campaign_model_id}
                                                onClick={() => handleModelClick(model)}
                                                style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background-color 0.1s" }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                            >
                                                <td style={{ padding: "16px" }}>
                                                    <div style={{ fontWeight: "600", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                                                        {model.campaign_name}
                                                        <span style={{ fontSize: "12px", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "10px", fontWeight: "600" }}>ID: {model.campaign_model_id}</span>
                                                    </div>
                                                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{model.model_name}</div>
                                                </td>
                                                <td style={{ padding: "16px" }}>
                                                    {model.total_keywords > 0 ? (
                                                        <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>Active</span>
                                                    ) : (
                                                        <span style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>Empty</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "16px", color: "#374151" }}>{model.total_categories}</td>
                                                <td style={{ padding: "16px", color: "#374151" }}>{model.total_keywords}</td>
                                                <td style={{ padding: "16px", color: "#6b7280", fontSize: "14px" }}>
                                                    {model.last_updated ? new Date(model.last_updated).toLocaleDateString() : '-'}
                                                </td>
                                                <td style={{ padding: "16px", textAlign: "right", color: "#4f46e5", fontWeight: "600", fontSize: "14px" }}>
                                                    View Details →
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                                    gap: "24px",
                                }}
                            >
                                {filteredCampaigns.map((model) => (
                                    <div
                                        key={model.campaign_model_id}
                                        onClick={() => handleModelClick(model)}
                                        style={{
                                            backgroundColor: "white",
                                            borderRadius: "12px",
                                            padding: "24px",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                            cursor: "pointer",
                                            transition: "transform 0.2s, box-shadow 0.2s",
                                            border: "1px solid transparent",
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "translateY(-4px)";
                                            e.currentTarget.style.boxShadow =
                                                "0 12px 20px rgba(0,0,0,0.1)";
                                            e.currentTarget.style.borderColor = "#c7d2fe";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "none";
                                            e.currentTarget.style.boxShadow =
                                                "0 2px 4px rgba(0,0,0,0.05)";
                                            e.currentTarget.style.borderColor = "transparent";
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                marginBottom: "16px",
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                    <h3
                                                        style={{
                                                            fontSize: "18px",
                                                            fontWeight: "700",
                                                            color: "#111827",
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {model.campaign_name}
                                                    </h3>
                                                    <span style={{ fontSize: "12px", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "10px", fontWeight: "600" }}>
                                                        ID: {model.campaign_model_id}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "14px",
                                                        color: "#6b7280",
                                                        backgroundColor: "#f3f4f6",
                                                        padding: "4px 8px",
                                                        borderRadius: "4px",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    Model: {model.model_name}
                                                </div>
                                            </div>
                                            {model.total_keywords > 0 ? (
                                                <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>Active</span>
                                            ) : (
                                                <span style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>Empty</span>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: "12px",
                                                paddingTop: "16px",
                                                borderTop: "1px solid #f3f4f6",
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "#9ca3af",
                                                        marginBottom: "2px",
                                                    }}
                                                >
                                                    Categories
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "18px",
                                                        fontWeight: "600",
                                                        color: "#374151",
                                                    }}
                                                >
                                                    {model.total_categories}
                                                </div>
                                            </div>
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "#9ca3af",
                                                        marginBottom: "2px",
                                                    }}
                                                >
                                                    Keywords
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "18px",
                                                        fontWeight: "600",
                                                        color: "#374151",
                                                    }}
                                                >
                                                    {model.total_keywords}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af', textAlign: 'right' }}>
                                            Updated: {model.last_updated ? new Date(model.last_updated).toLocaleDateString() : 'Never'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #4f46e5;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
      `}</style>
        </div >
    );
};

export default AdminCampaignKeywords;
