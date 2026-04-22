import React, { useState, useEffect } from "react";
import { FaFileCode, FaSearch } from "react-icons/fa";
import Loader from "./components/Loader";

const AdminScripts = () => {
    const [scripts, setScripts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchScripts = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access_token");
            const url = `https://api.xlitecore.xdialnetworks.com/api/v1/script-registry`;
            const response = await fetch(url, {
                headers: { "accept": "application/json", "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch script registry");
            const result = await response.json();
            setScripts(result || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScripts();
    }, []);



    const formatDate = (isoString) => {
        if (!isoString) return "-";
        const d = new Date(isoString);
        return d.toLocaleString();
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const filteredScripts = scripts.filter(script => 
        script.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: "24px", backgroundColor: "#f8f9fa", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0, display: "flex", alignItems: "center" }}>
                    <FaFileCode style={{ marginRight: '10px', color: '#4f46e5' }} />
                    Scripts Registry
                </h2>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <div style={{ position: 'relative', maxWidth: '400px' }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search scripts by file name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '10px 12px 10px 36px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '6px', 
                                fontSize: '14px', 
                                boxSizing: 'border-box' 
                            }}
                        />
                    </div>
                </div>
                <div style={{ padding: '24px' }}>
                    {loading ? (
                        <Loader size="medium" />
                    ) : error ? (
                        <div style={{ color: "#dc2626", padding: "20px", backgroundColor: "#fee2e2", borderRadius: "8px" }}>Error: {error}</div>
                    ) : (
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', minWidth: '600px' }}>
                                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>File Name</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Size</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Created At</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase' }}>Updated At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredScripts.length === 0 ? (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>No scripts found.</td></tr>
                                    ) : filteredScripts.map((script, index) => (
                                        <tr key={index} style={{ borderBottom: index < filteredScripts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                            <td style={{ padding: '16px', fontWeight: '600', color: '#111827', fontSize: '14px' }}>{script.name}</td>
                                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{formatBytes(script.size_bytes)}</td>
                                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{formatDate(script.created_at)}</td>
                                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{formatDate(script.updated_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminScripts;
