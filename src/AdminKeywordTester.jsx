import React, { useState, useEffect } from 'react';
import api from './api';

const AdminKeywordTester = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [categories, setCategories] = useState([]);

    const [campaign, setCampaign] = useState('');
    const [stage, setStage] = useState('');
    const [speechText, setSpeechText] = useState('');

    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [responseTime, setResponseTime] = useState(null);

    useEffect(() => {
        // Fetch campaigns
        api.get('/campaigns/keywords/all')
            .then(res => {
                if (res.data && res.data.campaign_keywords) {
                    setCampaigns(res.data.campaign_keywords);
                }
            })
            .catch(err => console.error('Failed to load campaigns:', err));

        // Fetch categories
        api.get('/response-categories/')
            .then(res => {
                if (res.data && res.data.categories) {
                    setCategories(res.data.categories);
                }
            })
            .catch(err => console.error('Failed to load categories:', err));
    }, []);

    const handleTest = async () => {
        if (!campaign) {
            alert('Please select a campaign');
            return;
        }
        if (!stage.trim()) {
            alert('Please enter a stage');
            return;
        }
        if (!speechText.trim()) {
            alert('Please enter speech text');
            return;
        }

        setLoading(true);
        setTestResult(null);
        setErrorMsg('');

        const startTime = Date.now();

        try {
            const payload = {
                campaign_id: Number(campaign),
                stage: stage,
                speech_text: speechText,
            };

            const response = await api.post('/campaigns/keywords/test-matcher', payload);
            const data = response.data;
            const timeTaken = Date.now() - startTime;
            setResponseTime(timeTaken);

            // Extract result string from response body
            const resultValue = data?.response?.result ?? data?.result ?? null;
            if (resultValue !== null && resultValue !== undefined) {
                setTestResult(String(resultValue));
            } else {
                setErrorMsg('No result returned from matcher');
            }
        } catch (error) {
            setResponseTime(null);
            const serverMsg = error?.response?.data?.error || error?.message;
            setErrorMsg(`Network error: ${serverMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleTest();
        }
    };

    // Helper functions to mirror JS result logic in the example
    const getResultDetails = () => {
        if (!testResult) return null;

        // testResult may be a plain string (we store only result)
        const value = (typeof testResult === 'string') ? testResult : (testResult?.result || 'N/A');
        let title = '';
        let titleColor = '';
        let valueColor = '';

        if (value === 'unknown') {
            valueColor = '#4b5563'; // gray-600
            title = 'No Match Found';
            titleColor = '#4b5563';
        } else if (typeof value === 'string' && (value.toLowerCase().includes('dnq') || value.toLowerCase().includes('not') || value.toLowerCase().includes('no'))) {
            valueColor = '#dc2626'; // red-600
            title = 'Match Found: ' + value;
            titleColor = '#dc2626';
        } else {
            valueColor = '#16a34a'; // green-600
            title = 'Match Found: ' + value;
            titleColor = '#16a34a';
        }

        return { value, title, titleColor, valueColor };
    };

    const details = getResultDetails();

    return (
        <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Top Navigation */}
            <nav style={{ backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Keyword Matcher Testing</h1>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 16px' }}>
                
                {/* Info Panel */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '12px', fontSize: '18px', marginTop: 0 }}>How the Keyword Matcher Works</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <h4 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Filename Format</h4>
                            <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px 0' }}>
                                <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>responsecategory_p[priority]_s[stage].json</span>
                            </p>
                            <ul style={{ fontSize: '14px', color: '#374151', margin: '0 0 0 16px', padding: 0, paddingLeft: '16px' }}>
                                <li style={{ marginBottom: '4px' }}><strong>responsecategory:</strong> The response category name (case-insensitive, e.g., interested, NotInterested, CALLBACK)</li>
                                <li style={{ marginBottom: '4px' }}><strong>p[number]:</strong> Priority level - lower numbers checked first (p1, p2, p3, etc.)</li>
                                <li style={{ marginBottom: '4px' }}><strong>s[number]:</strong> Stage identifier matching your campaign stages (s1, s2, s3, etc.)</li>
                            </ul>
                            <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px', marginBottom: 0 }}>
                                Examples: <span style={{ fontFamily: 'monospace' }}>interested_p1_s1.json</span>, <span style={{ fontFamily: 'monospace' }}>NotInterested_p2_s3.json</span>
                            </p>
                        </div>

                        <div>
                            <h4 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Matching Logic (Sequential Order)</h4>
                            <div style={{ fontSize: '14px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                    <strong>1. Exact Match:</strong> The entire speech text must match a keyword exactly (case-insensitive).
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#4b5563' }}>Example: Speech "yes" matches keyword "yes" exactly</div>
                                </div>
                                <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                    <strong>2. Phrase Match:</strong> The keyword phrase is found anywhere within the speech text.
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#4b5563' }}>Example: Speech "i am interested in this" contains keyword "interested"</div>
                                </div>
                                <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                    <strong>3. Longest String Match:</strong> Finds the longest keyword that appears as a substring in the speech.
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#4b5563' }}>Example: Speech "how much does it cost" matches "how much" (longest match)</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Priority System</h4>
                            <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.5' }}>
                                Files are checked in priority order: p1 files are checked first, then p2, then p3, and so on.
                                Once a match is found, the search stops and returns the result. This allows you to control which
                                keywords take precedence when multiple matches could occur.
                            </p>
                        </div>

                        <div>
                            <h4 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 8px 0', fontSize: '16px' }}>Hardcoded Priority</h4>
                            <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px 0' }}>
                                When "hardcoded" appears in the priority position, it enforces strict matching rules:
                            </p>
                            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#374151' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontFamily: 'monospace', backgroundColor: '#e5e7eb', padding: '4px 8px', borderRadius: '4px' }}>responsecategory_hardcoded_s[stage].json</span>
                                </div>
                                <ul style={{ margin: '0 0 0 16px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <li><strong>Exact Match Only:</strong> Keywords must match the speech text exactly (no phrase or substring matching)</li>
                                    <li><strong>Stage Lock:</strong> The stage in the filename must match the current stage exactly</li>
                                    <li><strong>Highest Priority:</strong> Hardcoded files are checked before any p1, p2, p3 files</li>
                                </ul>
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#4b5563' }}>
                                    Example: <span style={{ fontFamily: 'monospace' }}>callback_hardcoded_s2.json</span> will only match at stage s2, and only for exact keyword matches
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Version Tabs */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '24px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ flex: 1, padding: '16px 24px', textAlign: 'center', fontWeight: '600', color: '#4f46e5', borderBottom: '2px solid #4f46e5' }}>
                            V2 Matcher
                        </div>
                    </div>
                </div>

                {/* Test Input */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 24px 0' }}>Test Configuration</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Campaign */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Campaign
                            </label>
                            <select 
                                value={campaign} 
                                onChange={(e) => setCampaign(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', backgroundColor: 'white', color: '#1f2937', fontSize: '16px' }}
                            >
                                <option value="">Select a campaign...</option>
                                {campaigns.map((c, i) => (
                                    <option key={i} value={c.campaign_model_id}>
                                        {c.campaign_name} {c.model_name ? `(${c.model_name})` : ''}
                                    </option>
                                ))}
                            </select>

                        </div>

                        {/* Stage V2 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Stage (e.g., s1, s2, s3)
                            </label>
                            <input 
                                type="text" 
                                value={stage} 
                                onChange={(e) => setStage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter stage like s1, s2, s3" 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', backgroundColor: 'white', color: '#1f2937', fontSize: '16px', boxSizing: 'border-box' }} 
                            />
                        </div>

                        {/* Speech Text */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Speech Text
                            </label>
                            <textarea 
                                rows="4" 
                                value={speechText} 
                                onChange={(e) => setSpeechText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter the speech text to test..." 
                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', backgroundColor: 'white', color: '#1f2937', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' }}
                            ></textarea>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0 0' }}>Press Ctrl+Enter to test</p>
                        </div>

                        {/* Test Button */}
                        <button 
                            onClick={handleTest} 
                            disabled={loading}
                            style={{ 
                                width: '100%', 
                                backgroundColor: '#4f46e5', 
                                color: 'white', 
                                padding: '16px 24px', 
                                border: 'none',
                                borderRadius: '8px', 
                                fontWeight: '600', 
                                fontSize: '18px', 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                marginTop: '8px'
                            }}
                        >
                            {loading ? "Testing..." : "Run Test"}
                        </button>
                    </div>
                </div>

                {/* Available Categories */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>Available Response Categories</h3>
                    {categories.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {categories.map((cat, idx) => (
                                <span 
                                    key={idx} 
                                    style={{ 
                                        backgroundColor: cat.color, 
                                        padding: '8px 12px', 
                                        color: 'white', 
                                        fontSize: '14px', 
                                        fontWeight: '500', 
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {cat.name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: '#6b7280' }}>Loading categories...</div>
                    )}
                </div>

                {/* Loading Indicator */}
                {loading && (
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
                        <p style={{ color: '#4b5563', fontWeight: '500', margin: 0 }}>Testing keyword matcher...</p>
                    </div>
                )}

                {/* Error Result */}
                {errorMsg && !loading && (
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 8px 0' }}>Error</h3>
                        <p style={{ color: '#4b5563', margin: 0 }}>{errorMsg}</p>
                    </div>
                )}

                {/* API Result */}
                {testResult && !loading && details && (
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: details.titleColor, margin: '0 0 12px 0' }}>{details.title}</h3>
                        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                            <p style={{ fontSize: '18px', fontWeight: '600', color: details.valueColor, margin: 0 }}>{details.value}</p>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>Response Time: {responseTime || 'N/A'}ms</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminKeywordTester;
