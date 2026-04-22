import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PageTitleUpdater from './PageTitleUpdater';

import ClientDashboard from './ClientDashboard';
import Login from './login';
import ClientRecordings from './Clientrecordings';
import IntegrationForm from './IntegrationForm';
import RequestCampaign from './RequestCampaign';
import ManageTeam from './ManageTeam';
import HistoricalTransferMetrics from './HistoricalTransferMetrics';
import ClientTransferSettings from './ClientTransferSettings';
import AdminDataExport from './AdminDataExport';
import AdminDashboard from './AdminDashboard';
import AdminLanding from './AdminLanding';
import AdminServerStats from './AdminServerStats';
import AdminCampaigns from './AdminCampaigns';
import AdminVoiceStats from './AdminVoiceStats';
import AdminVoiceManagement from './AdminVoiceManagement';
import AdminCampaignKeywords from './AdminCampaignKeywords';
import AdminReporting from './AdminReporting';
import AdminScripts from './AdminScripts';
import AdminKeywordTester from './AdminKeywordTester';
import AdminStageData from './AdminStageData';

import AdminLayout from './components/AdminLayout';

function App() {
    return (
        <Router>
            <PageTitleUpdater />
            <Routes>
                <Route path="/" element={<Login />} />

                {/* Client Routes */}
                <Route path="/dashboard" element={<ClientDashboard />} />
                <Route path="/recordings" element={<ClientRecordings />} />
                <Route path="/request-campaign" element={<RequestCampaign />} />
                <Route path="/manage-team" element={<ManageTeam />} />
                <Route path="/historical-transfer-metrics" element={<HistoricalTransferMetrics />} />

                {/* Admin Routes with Sidebar Layout */}
                <Route element={<AdminLayout />}>
                    <Route path="/admin-landing" element={<AdminLanding />} />
                    <Route path="/admin-dashboard" element={<AdminDashboard />} />
                    <Route path="/admin-data-export" element={<AdminDataExport />} />
                    <Route path="/admin-server-stats" element={<AdminServerStats />} />
                    <Route path="/admin-campaigns" element={<AdminCampaigns />} />
                    <Route path="/admin-voice-stats" element={<AdminVoiceStats />} />
                    <Route path="/admin-voice-management" element={<AdminVoiceManagement />} />
                    <Route path="/admin-campaign-keywords" element={<AdminCampaignKeywords />} />
                    <Route path="/admin-reporting" element={<AdminReporting />} />
                    <Route path="/admin-scripts" element={<AdminScripts />} />
                    <Route path="/admin-keyword-tester" element={<AdminKeywordTester />} />
                    <Route path="/admin-stage-data" element={<AdminStageData />} />
                </Route>

                {/* Integration Form Route (No Sidebar) - Temporarily hidden 
                <Route path="/integration-form" element={<IntegrationForm />} />
                */}
            </Routes>
        </Router>
    );
}

export default App;
