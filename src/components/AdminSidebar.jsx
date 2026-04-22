import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FaChartLine,
    FaBullhorn,
    FaKey,
    FaMicrophone,
    FaWaveSquare,
    FaFileDownload,
    FaUserPlus,
    FaSignOutAlt,
    FaServer,
    FaChevronLeft,
    FaChevronRight,
    FaBars,
    FaClipboardList,
    FaFileCode,
    FaVial
} from 'react-icons/fa';

const AdminSidebar = ({ isOpen, toggleSidebar, connected, agentCount }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const role = localStorage.getItem('role');

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate("/");
    };

    const menuItems = [
        {
            path: '/admin-landing',
            label: 'Server Monitor',
            icon: <FaServer />,
            show: true
        },
        {
            path: '/admin-server-stats',
            label: 'Server Stats',
            icon: <FaChartLine />,
            show: role !== 'qa'
        },
        {
            path: '/admin-campaigns',
            label: 'Campaigns',
            icon: <FaBullhorn />,
            show: true
        },
        {
            path: '/admin-campaign-keywords',
            label: 'Keywords',
            icon: <FaKey />,
            show: true
        },
        {
            path: '/admin-voice-management',
            label: 'Voice Management',
            icon: <FaMicrophone />,
            show: true
        },
        {
            path: '/admin-voice-stats',
            label: 'Voice Stats',
            icon: <FaWaveSquare />,
            show: true
        },
        {
            path: '/admin-data-export',
            label: 'Data Export',
            icon: <FaFileDownload />,
            show: true
        },
        {
            path: '/admin-reporting',
            label: 'Reporting',
            icon: <FaClipboardList />,
            show: true
        },
        {
            path: '/admin-scripts',
            label: 'Scripts',
            icon: <FaFileCode />,
            show: true
        },
        {
            path: '/admin-keyword-tester',
            label: 'Keyword Tester',
            icon: <FaVial />,
            show: true
        },
        {
            path: '/integration-form',
            label: 'Add Client',
            icon: <FaUserPlus />,
            show: role !== 'qa'
        }
    ];

    return (
        <div
            style={{
                width: isOpen ? '260px' : '70px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                height: '100vh',
                position: 'sticky',
                top: 0,
                left: 0,
                transition: 'width 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #e2e8f0',
                zIndex: 1000,
                overflowX: 'hidden',
                boxShadow: '4px 0 24px 0 rgba(0, 0, 0, 0.02)'
            }}
        >
            {/* Header / Logo Area */}
            <div
                style={{
                    padding: isOpen ? '20px 24px' : '20px 12px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOpen ? 'space-between' : 'center',
                    height: '70px',
                    boxSizing: 'border-box'
                }}
            >
                {isOpen && (
                    <h1
                        style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                    >
                        Xdial Admin
                    </h1>
                )}
                <button
                    onClick={toggleSidebar}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#0f172a'}
                    onMouseLeave={(e) => e.target.style.color = '#64748b'}
                >
                    {isOpen ? <FaChevronLeft /> : <FaBars />}
                </button>
            </div>

            {/* Connection Status (Mini) */}
            <div
                style={{
                    padding: isOpen ? '16px 20px' : '16px 10px',
                    display: 'flex',
                    flexDirection: isOpen ? 'row' : 'column',
                    alignItems: 'center',
                    gap: isOpen ? '12px' : '6px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                }}
            >
                <div
                    style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: connected ? '#10b981' : '#ef4444',
                        boxShadow: connected ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                        animation: connected ? 'pulse 2s infinite' : 'none',
                        flexShrink: 0
                    }}
                />
                {isOpen ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: connected ? '#10b981' : '#ef4444' }}>
                            {connected ? 'System Online' : 'Disconnected'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {agentCount} Servers Active
                        </span>
                    </div>
                ) : (
                    <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
                        {agentCount}
                    </span>
                )}
            </div>

            {/* Navigation Links */}
            <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {menuItems.filter(item => item.show).map((item) => (
                        <li key={item.path} style={{ marginBottom: '4px' }}>
                            <div
                                onClick={() => navigate(item.path)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: isOpen ? '12px 24px' : '12px',
                                    justifyContent: isOpen ? 'flex-start' : 'center',
                                    cursor: 'pointer',
                                    backgroundColor: isActive(item.path) ? '#f1f5f9' : 'transparent',
                                    color: isActive(item.path) ? '#0284c7' : '#64748b',
                                    borderLeft: isActive(item.path) ? '3px solid #0284c7' : '3px solid transparent',
                                    transition: 'all 0.2s ease',
                                    fontWeight: isActive(item.path) ? '600' : '500'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive(item.path)) {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                        e.currentTarget.style.color = '#0f172a';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive(item.path)) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#64748b';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                                    {item.icon}
                                </span>
                                {isOpen && (
                                    <span style={{ marginLeft: '16px', fontSize: '14px' }}>
                                        {item.label}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer / Logout */}
            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isOpen ? 'flex-start' : 'center',
                        padding: '10px',
                        backgroundColor: '#dc2626', // Red for logout
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                    <FaSignOutAlt />
                    {isOpen && <span style={{ marginLeft: '12px', fontWeight: '600' }}>Logout</span>}
                </button>
            </div>
        </div>
    );
};

export default AdminSidebar;
