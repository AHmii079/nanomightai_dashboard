import React, { useState, useEffect } from "react";
import Loader from "./components/Loader";
import {
    FaChartPie,
    FaList,
    FaPhoneAlt,
    FaPlus,
    FaEdit,
    FaTrashAlt,
    FaCheck,
    FaBan,
    FaTimes,
    FaChevronDown,
    FaChevronUp
} from "react-icons/fa";

const AdminReporting = () => {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div style={{ padding: "24px", backgroundColor: "#f8f9fa", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center" }}>
                    <FaChartPie style={{ marginRight: '10px', color: '#4f46e5' }} />
                    Reporting Details
                </h2>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {/* Tabs Header */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
                    <button
                        onClick={() => setActiveTab("overview")}
                        style={{
                            flex: 1, padding: '16px 24px', backgroundColor: 'transparent', border: 'none',
                            borderBottom: activeTab === 'overview' ? '2px solid #4f46e5' : '2px solid transparent',
                            color: activeTab === 'overview' ? '#4f46e5' : '#6b7280',
                            fontWeight: activeTab === 'overview' ? '600' : '500',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
                        }}
                    >
                        <FaChartPie style={{ marginRight: '8px' }} /> Analytics Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("categories")}
                        style={{
                            flex: 1, padding: '16px 24px', backgroundColor: 'transparent', border: 'none',
                            borderBottom: activeTab === 'categories' ? '2px solid #4f46e5' : '2px solid transparent',
                            color: activeTab === 'categories' ? '#4f46e5' : '#6b7280',
                            fontWeight: activeTab === 'categories' ? '600' : '500',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
                        }}
                    >
                        <FaList style={{ marginRight: '8px' }} /> Report Categories
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        style={{
                            flex: 1, padding: '16px 24px', backgroundColor: 'transparent', border: 'none',
                            borderBottom: activeTab === 'reports' ? '2px solid #4f46e5' : '2px solid transparent',
                            color: activeTab === 'reports' ? '#4f46e5' : '#6b7280',
                            fontWeight: activeTab === 'reports' ? '600' : '500',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
                        }}
                    >
                        <FaPhoneAlt style={{ marginRight: '8px' }} /> Call Reports
                    </button>
                </div>

                {/* Tab Content */}
                <div style={{ padding: '24px' }}>
                    {activeTab === "overview" && <AnalyticsOverviewTab />}
                    {activeTab === "categories" && <CategoriesTab />}
                    {activeTab === "reports" && <CallReportsTab />}
                </div>
            </div>
        </div>
    );
};



// ----------------------------------------------------------------------
// BADGE COMPONENT
// ----------------------------------------------------------------------
const CustomBadge = ({ children, bg = "primary", style = {} }) => {
    const colors = {
        primary: { bg: '#e0e7ff', text: '#4f46e5' },
        success: { bg: '#dcfce7', text: '#16a34a' },
        danger: { bg: '#fee2e2', text: '#dc2626' },
        warning: { bg: '#fef3c7', text: '#d97706' },
        info: { bg: '#e0f2fe', text: '#0284c7' },
        secondary: { bg: '#f3f4f6', text: '#4b5563' }
    };
    const theme = colors[bg] || colors.primary;

    return (
        <span style={{
            backgroundColor: theme.bg, color: theme.text,
            padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
            display: 'inline-flex', alignItems: 'center', gap: '4px', ...style
        }}>
            {children}
        </span>
    );
};

// ----------------------------------------------------------------------
// 1. ANALYTICS OVERVIEW TAB
// ----------------------------------------------------------------------
const AnalyticsOverviewTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchOverview = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/analytics/overview`;
            const response = await fetch(url, {
                headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch analytics overview");
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    if (loading) return <Loader size="medium" />;
    if (error) return <div style={{ color: "#dc2626", padding: "20px", backgroundColor: "#fee2e2", borderRadius: "8px" }}>Error: {error}</div>;
    if (!data) return <div style={{ color: "#6b7280" }}>No data available</div>;

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '24px', border: '1px solid #bfdbfe' }}>
                    <h5 style={{ color: '#1e40af', fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reports</h5>
                    <div style={{ fontSize: '36px', fontWeight: '700', color: '#1d4ed8' }}>{data.total_reports || 0}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Category Breakdown */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <h5 style={{ margin: 0, fontWeight: '600', color: '#374151', fontSize: '16px' }}>Category Breakdown</h5>
                    </div>
                    <div style={{ padding: '20px' }}>
                        {data.category_counts && data.category_counts.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {data.category_counts.map((c, i) => (
                                        <tr key={c.category_id} style={{ borderBottom: i < data.category_counts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                            <td style={{ padding: '12px 0', color: '#4b5563', fontWeight: '500' }}>{c.category_name}</td>
                                            <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                                <CustomBadge bg="primary">{c.count}</CustomBadge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: '#9ca3af', margin: 0 }}>No category data.</p>
                        )}
                    </div>
                </div>

                {/* Top Campaigns */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <h5 style={{ margin: 0, fontWeight: '600', color: '#374151', fontSize: '16px' }}>Top Reported Campaigns</h5>
                    </div>
                    <div style={{ padding: '20px' }}>
                        {data.top_reported_campaigns && data.top_reported_campaigns.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {data.top_reported_campaigns.map((c, i) => (
                                        <tr key={c.campaign_id} style={{ borderBottom: i < data.top_reported_campaigns.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                            <td style={{ padding: '12px 0' }}>
                                                <div style={{ fontWeight: '600', color: '#1f2937' }}>{c.campaign_name}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{c.client_name}</div>
                                            </td>
                                            <td style={{ padding: '12px 0', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <CustomBadge bg="danger">{c.total_reports}</CustomBadge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: '#9ca3af', margin: 0 }}>No campaign data.</p>
                        )}
                    </div>
                </div>

                {/* Top Clients */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <h5 style={{ margin: 0, fontWeight: '600', color: '#374151', fontSize: '16px' }}>Top Reported Clients</h5>
                    </div>
                    <div style={{ padding: '20px' }}>
                        {data.top_reported_clients && data.top_reported_clients.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {data.top_reported_clients.map((c, i) => (
                                        <tr key={c.client_id} style={{ borderBottom: i < data.top_reported_clients.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                            <td style={{ padding: '12px 0', fontWeight: '600', color: '#1f2937' }}>{c.client_name}</td>
                                            <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                                <CustomBadge bg="warning">{c.total_reports}</CustomBadge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: '#9ca3af', margin: 0 }}>No client data.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. CATEGORIES TAB
// ----------------------------------------------------------------------
const CategoriesTab = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
    const [currentCatId, setCurrentCatId] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState(null);

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/categories`;
            const response = await fetch(url, {
                headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch categories");
            const result = await response.json();
            setCategories(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenAdd = () => {
        setModalMode("add");
        setFormData({ name: "", description: "" });
        setCurrentCatId(null);
        setModalError(null);
        setShowModal(true);
    };

    const handleOpenEdit = (cat) => {
        setModalMode("edit");
        setFormData({ name: cat.name, description: cat.description || "" });
        setCurrentCatId(cat.id);
        setModalError(null);
        setShowModal(true);
    };

    const handleDelete = async (catId) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            const token = localStorage.getItem("access_token");
            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/categories/${catId}`;
            const response = await fetch(url, {
                method: "DELETE",
                headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to delete category");
            fetchCategories();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setModalError("Name is required");
            return;
        }
        setSubmitting(true);
        setModalError(null);
        try {
            const token = localStorage.getItem("access_token");
            const isEdit = modalMode === "edit";
            const url = isEdit
                ? `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/categories/${currentCatId}`
                : `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/categories`;
            const method = isEdit ? "PATCH" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail?.[0]?.msg || errorData.message || "Operation failed");
            }
            setShowModal(false);
            fetchCategories();
        } catch (err) {
            setModalError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                    onClick={handleOpenAdd}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                        backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                    }}
                >
                    <FaPlus /> Add Category
                </button>
            </div>

            {loading ? (
                <Loader size="medium" />
            ) : error ? (
                <div style={{ color: "#dc2626", padding: "20px", backgroundColor: "#fee2e2", borderRadius: "8px" }}>Error: {error}</div>
            ) : (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>ID</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Name</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Description</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>No categories found.</td></tr>
                            ) : categories.map((cat, index) => (
                                <tr key={cat.id} style={{ borderBottom: index < categories.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{cat.id}</td>
                                    <td style={{ padding: '16px', fontWeight: '600', color: '#111827', fontSize: '14px' }}>{cat.name}</td>
                                    <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{cat.description || "-"}</td>
                                    <td style={{ padding: '16px' }}>
                                        {cat.is_active ?
                                            <CustomBadge bg="success"><FaCheck size={10} /> Active</CustomBadge> :
                                            <CustomBadge bg="secondary"><FaBan size={10} /> Inactive</CustomBadge>
                                        }
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleOpenEdit(cat)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#4f46e5', marginRight: '8px', borderRadius: '4px' }}
                                            title="Edit"
                                        >
                                            <FaEdit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444', borderRadius: '4px' }}
                                            title="Delete"
                                        >
                                            <FaTrashAlt size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Category Modal (Custom Implementation) */}
            {showModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
                    justifyContent: "center", alignItems: "center", zIndex: 1050
                }}>
                    <div style={{
                        backgroundColor: "white", padding: "0", borderRadius: "12px",
                        width: "450px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                        overflow: "hidden"
                    }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#111827" }}>
                                {modalMode === "add" ? "Create Category" : "Edit Category"}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                                <FaTimes size={18} />
                            </button>
                        </div>

                        <div style={{ padding: "24px" }}>
                            {modalError && <div style={{ color: "#dc2626", backgroundColor: "#fee2e2", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>{modalError}</div>}

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>Name <span style={{ color: "#ef4444" }}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Audio Issue"
                                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
                                />
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: "10px 16px", backgroundColor: "white", border: "1px solid #d1d5db", color: "#374151", borderRadius: "6px", fontWeight: "500", cursor: "pointer", fontSize: "14px" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    style={{ padding: "10px 16px", backgroundColor: "#4f46e5", border: "none", color: "white", borderRadius: "6px", fontWeight: "600", cursor: submitting ? "not-allowed" : "pointer", fontSize: "14px", minWidth: "100px", opacity: submitting ? 0.7 : 1 }}
                                >
                                    {submitting ? "Saving..." : (modalMode === "add" ? "Create" : "Save Changes")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. CALL REPORTS TAB
// ----------------------------------------------------------------------
const CallReportsTab = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
    const [expandedReportId, setExpandedReportId] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        call_id: "",
        category_id: "",
        client_id: "",
        campaign_id: "",
        start_date: "",
        end_date: ""
    });
    const [categories, setCategories] = useState([]);

    // Fetch Categories for dropdown filter
    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/categories`;
            const response = await fetch(url, { headers: { "accept": "application/json", "Authorization": `Bearer ${token}` } });
            if (response.ok) {
                setCategories(await response.json());
            }
        } catch (err) { }
    };

    const fetchReports = async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");

            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("page_size", "20");

            if (filters.call_id) params.append("call_id", filters.call_id);
            if (filters.category_id) params.append("category_id", filters.category_id);
            if (filters.client_id) params.append("client_id", filters.client_id);
            if (filters.campaign_id) params.append("campaign_id", filters.campaign_id);
            if (filters.start_date) params.append("start_date", filters.start_date);
            if (filters.end_date) params.append("end_date", filters.end_date);

            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/reports?${params.toString()}`;

            const response = await fetch(url, {
                headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch reports");
            const result = await response.json();

            setReports(result.results || []);
            setPagination({
                page: result.page || 1,
                page_size: result.page_size || 20,
                total: result.total || 0,
                total_pages: result.total_pages || 1
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchReports(1);
        // eslint-disable-next-line
    }, []); // Initial fetch

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const applyFilters = () => {
        fetchReports(1);
    };

    const resetFilters = () => {
        const defaultFilters = { call_id: "", category_id: "", client_id: "", campaign_id: "", start_date: "", end_date: "" };
        setFilters(defaultFilters);

        // Explicit full reset via direct fetch bypassing stale state
        setLoading(true);
        const token = localStorage.getItem("access_token");
        fetch(`https://api.xlitecore.xdialnetworks.com/api/v1/reporting/reports?page=1&page_size=20`, {
            headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(res => {
                setReports(res.results || []);
                setPagination({ page: res.page || 1, page_size: res.page_size || 20, total: res.total || 0, total_pages: res.total_pages || 1 });
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm("Are you sure you want to permanently delete this report?")) return;
        try {
            const token = localStorage.getItem("access_token");
            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/reporting/reports/${reportId}`;
            const response = await fetch(url, {
                method: "DELETE",
                headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to delete report");
            fetchReports(pagination.page); // Refresh current page
        } catch (err) {
            alert(err.message);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return "-";
        const d = new Date(isoString);
        return d.toLocaleString();
    };

    const inputStyle = {
        width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box"
    };

    const renderPagination = () => {
        const pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, pagination.page - 2);
        let endPage = Math.min(pagination.total_pages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isCurrent = i === pagination.page;
            pages.push(
                <button
                    key={i}
                    onClick={() => fetchReports(i)}
                    style={{
                        minWidth: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 4px", borderRadius: "6px", fontWeight: "500", fontSize: "14px", cursor: "pointer",
                        backgroundColor: isCurrent ? "#4f46e5" : "white",
                        color: isCurrent ? "white" : "#374151",
                        border: isCurrent ? "1px solid #4f46e5" : "1px solid #d1d5db"
                    }}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div>
            {/* Filters */}
            <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Call ID</label>
                        <input type="number" value={filters.call_id} onChange={(e) => handleFilterChange("call_id", e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Category</label>
                        <select value={filters.category_id} onChange={(e) => handleFilterChange("category_id", e.target.value)} style={inputStyle}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Client ID</label>
                        <input type="number" value={filters.client_id} onChange={(e) => handleFilterChange("client_id", e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Client Campaign ID</label>
                        <input type="number" value={filters.campaign_id} onChange={(e) => handleFilterChange("campaign_id", e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Start Date</label>
                        <input type="date" value={filters.start_date} onChange={(e) => handleFilterChange("start_date", e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>End Date</label>
                        <input type="date" value={filters.end_date} onChange={(e) => handleFilterChange("end_date", e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: '1 1 200px', display: 'flex', gap: '8px' }}>
                        <button
                            onClick={applyFilters}
                            style={{ flex: 1, padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Apply
                        </button>
                        <button
                            onClick={resetFilters}
                            style={{ flex: 1, padding: '8px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <Loader size="medium" />
            ) : error ? (
                <div style={{ color: "#dc2626", padding: "20px", backgroundColor: "#fee2e2", borderRadius: "8px" }}>Error: {error}</div>
            ) : (
                <>
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                        Showing {reports.length > 0 ? ((pagination.page - 1) * pagination.page_size) + 1 : 0} to {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total} reports
                    </div>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', minWidth: '800px' }}>
                            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Report ID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Call ID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Category</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Reported By</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Timestamp</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Notes</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>No call reports found.</td></tr>
                                ) : reports.map((r, index) => (
                                    <React.Fragment key={r.id}>
                                        <tr style={{ borderBottom: expandedReportId === r.id ? 'none' : (index < reports.length - 1 ? '1px solid #f3f4f6' : 'none'), backgroundColor: expandedReportId === r.id ? '#f9fafb' : 'white' }}>
                                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>#{r.id}</td>
                                            <td style={{ padding: '16px', fontWeight: '600', fontSize: '14px' }}>
                                                <a href={`/admin-dashboard?search=${r.call_id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#4f46e5' }}>
                                                    {r.call_id}
                                                </a>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <CustomBadge bg="info">{r.category_name}</CustomBadge>
                                            </td>
                                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{r.reported_by_username || r.reported_by_id}</td>
                                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(r.timestamp)}</td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', color: '#374151' }} title={r.notes}>
                                                    {r.notes || "-"}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button
                                                    onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#4b5563', marginRight: '8px', borderRadius: '4px' }}
                                                    title={expandedReportId === r.id ? "Hide Call Data" : "View Call Data"}
                                                >
                                                    {expandedReportId === r.id ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteReport(r.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#ef4444', borderRadius: '4px' }}
                                                    title="Delete Report"
                                                >
                                                    <FaTimes size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedReportId === r.id && (
                                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: index < reports.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                                <td colSpan={7} style={{ padding: '16px', paddingTop: 0 }}>
                                                    <div style={{ padding: '16px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#111827' }}>Call Data</h4>
                                                        {r.call ? (
                                                            <>
                                                                <div style={{ display: 'flex', gap: '32px', marginBottom: '16px', fontSize: '14px', color: '#374151', flexWrap: 'wrap' }}>
                                                                    <div><strong>Phone Number:</strong> {r.call.number || 'N/A'}</div>
                                                                    <div><strong>Call Category:</strong> {r.call.response_category_name || 'N/A'}</div>
                                                                    <div><strong>Call Time:</strong> {formatDate(r.call.timestamp)}</div>
                                                                </div>
                                                                <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>Transcripts</h5>
                                                                {r.call.stages && r.call.stages.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {r.call.stages.map((stg, i) => (
                                                                            <div key={i} style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px', fontSize: '13px' }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#4b5563' }}>
                                                                                    <span><strong style={{ color: '#111827' }}>Stage {stg.stage}</strong> {stg.response_category_name ? `- ${stg.response_category_name}` : ''}</span>
                                                                                    <span>{formatDate(stg.timestamp)}</span>
                                                                                </div>
                                                                                <div style={{ color: '#1f2937', fontStyle: stg.transcription ? 'normal' : 'italic', whiteSpace: 'pre-wrap' }}>
                                                                                    {stg.transcription || 'No transcription'}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>No stage data available for this call.</div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>No associated call data found.</div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {pagination.total_pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', alignItems: 'center' }}>
                            <button
                                onClick={() => fetchReports(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                style={{
                                    padding: "6px 12px", margin: "0 8px", borderRadius: "6px", fontWeight: "500", fontSize: "14px",
                                    cursor: pagination.page === 1 ? "not-allowed" : "pointer",
                                    backgroundColor: "white", color: pagination.page === 1 ? "#9ca3af" : "#374151",
                                    border: "1px solid #d1d5db"
                                }}
                            >
                                Prev
                            </button>

                            {renderPagination()}

                            <button
                                onClick={() => fetchReports(pagination.page + 1)}
                                disabled={pagination.page === pagination.total_pages}
                                style={{
                                    padding: "6px 12px", margin: "0 8px", borderRadius: "6px", fontWeight: "500", fontSize: "14px",
                                    cursor: pagination.page === pagination.total_pages ? "not-allowed" : "pointer",
                                    backgroundColor: "white", color: pagination.page === pagination.total_pages ? "#9ca3af" : "#374151",
                                    border: "1px solid #d1d5db"
                                }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminReporting;
