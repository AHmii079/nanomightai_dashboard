import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

// Create Context for Admin State (WebSocket data)
const AdminContext = createContext(null);

export const useAdminContext = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdminContext must be used within an AdminLayout');
    }
    return context;
};

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [connected, setConnected] = useState(false);
    const [agents, setAgents] = useState({});

    // WebSocket Logic
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        const ws = new WebSocket(
            "wss://loadmetrics.xdialnetworks.com/ws/dashboard",
        );

        ws.onopen = () => {
            console.log("Connected to monitoring server");
            setConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const metrics = JSON.parse(event.data);
                setAgents((prev) => ({
                    ...prev,
                    [metrics.ip]: {
                        ...metrics,
                        lastUpdate: Date.now(),
                    },
                }));
            } catch (err) {
                console.error("Failed to parse metrics:", err);
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("Disconnected from monitoring server");
            setConnected(false);
            wsRef.current = null;

            reconnectTimeoutRef.current = setTimeout(() => {
                console.log("Attempting to reconnect...");
                connectWebSocket();
            }, 5000);
        };

        wsRef.current = ws;
    };

    // Agent cleanup interval
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setAgents((prev) => {
                const updated = { ...prev };
                let changed = false;
                Object.keys(updated).forEach((key) => {
                    if (now - updated[key].lastUpdate > 30000) {
                        delete updated[key];
                        changed = true;
                    }
                });
                return changed ? updated : prev;
            });
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const agentList = Object.values(agents);

    return (
        <AdminContext.Provider value={{ agents, connected, agentCount: agentList.length }}>
            <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
                <AdminSidebar
                    isOpen={isSidebarOpen}
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    connected={connected}
                    agentCount={agentList.length}
                />
                <div style={{ flex: 1, height: '100vh', overflowY: 'auto', position: 'relative' }}>
                    <Outlet context={{ isSidebarOpen }} />
                </div>
            </div>
        </AdminContext.Provider>
    );
};

export default AdminLayout;
