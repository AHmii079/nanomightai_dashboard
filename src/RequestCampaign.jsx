import { useState, useEffect } from 'react';
import Loader from './components/Loader';

const RequestCampaign = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');

  // Dynamic configuration from API
  const [campaigns, setCampaigns] = useState([]);
  const [campaignConfig, setCampaignConfig] = useState({});
  const [transferSettings, setTransferSettings] = useState([]);

  const [formData, setFormData] = useState({
    campaign: '',
    model: '',
    numberOfBots: '',
    transferSettingsId: '',
    setupType: 'same',
    primaryIpValidation: '',
    primaryAdminLink: '',
    primaryUser: '',
    primaryPassword: '',
    primaryBotsCampaign: '',
    primaryUserSeries: '',
    primaryPort: '5060',
    closerIpValidation: '',
    closerAdminLink: '',
    closerUser: '',
    closerPassword: '',
    closerCampaign: '',
    closerIngroup: '',
    closerPort: '5060',
    customRequirements: ''
  });

  const [availableModels, setAvailableModels] = useState([]);
  const [availableTransferSettings, setAvailableTransferSettings] = useState([]);

  // Fetch form configuration on mount
  useEffect(() => {
    fetchFormConfig();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem("access_token");
  };

  const getCompanyName = () => {
    return localStorage.getItem("username") || "Client";
  };

  const fetchFormConfig = async () => {
    try {
      setIsLoadingConfig(true);
      setConfigError('');

      const response = await fetch('https://api.xlitecore.xdialnetworks.com/api/v1/integration/form', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load form configuration');
      }

      const config = await response.json();

      console.log('Form config loaded:', config);

      setCampaigns(config.campaigns || []);
      setCampaignConfig(config.campaign_config || {});
      setTransferSettings(config.transfer_settings || []);

    } catch (error) {
      console.error('Error loading form config:', error);
      setConfigError('Failed to load form configuration. Please refresh the page.');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Update available models when campaign changes
  useEffect(() => {
    if (formData.campaign && campaignConfig[formData.campaign]) {
      const models = Object.keys(campaignConfig[formData.campaign]);
      setAvailableModels(models);

      if (!formData.model || !models.includes(formData.model)) {
        setFormData(prev => ({ ...prev, model: models[0] || '', transferSettingsId: '' }));
      }
    } else {
      setAvailableModels([]);
      setAvailableTransferSettings([]);
    }
  }, [formData.campaign, campaignConfig]);

  // Update available transfer settings when model changes
  useEffect(() => {
    if (formData.campaign && formData.model && campaignConfig[formData.campaign]?.[formData.model]) {
      const settings = campaignConfig[formData.campaign][formData.model];
      setAvailableTransferSettings(settings);

      const recommended = settings.find(s => {
        const fullSetting = transferSettings.find(ts => ts.id === s.id);
        return fullSetting?.is_recommended;
      });

      if (!formData.transferSettingsId || !settings.find(s => s.id === formData.transferSettingsId)) {
        setFormData(prev => ({
          ...prev,
          transferSettingsId: recommended ? recommended.id : (settings[0]?.id || '')
        }));
      }
    } else {
      setAvailableTransferSettings([]);
    }
  }, [formData.campaign, formData.model, campaignConfig, transferSettings]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      // Client-side validation for required fields
      const requiredFields = [
        { field: 'campaign', label: 'Campaign Type' },
        { field: 'model', label: 'Model' },
        { field: 'transferSettingsId', label: 'Transfer Quality Settings' },
        { field: 'numberOfBots', label: 'Number of Remote Agents' },
        { field: 'primaryIpValidation', label: 'IP Validation Link' },
        { field: 'primaryAdminLink', label: 'Admin Link' },
        { field: 'primaryUser', label: 'Username' },
        { field: 'primaryPassword', label: 'Password' },
      ];

      const missingFields = requiredFields.filter(f => !formData[f.field] || formData[f.field] === '');

      if (missingFields.length > 0) {
        const fieldNames = missingFields.map(f => f.label).join(', ');
        throw new Error(`Please fill in the following required fields: ${fieldNames}`);
      }

      const apiPayload = {
        company_name: getCompanyName(),
        campaign: formData.campaign,
        model_name: formData.model,
        transfer_settings_id: parseInt(formData.transferSettingsId),
        number_of_bots: parseInt(formData.numberOfBots),
        setup_type: formData.setupType,
        primary_ip_validation: formData.primaryIpValidation,
        primary_admin_link: formData.primaryAdminLink,
        primary_user: formData.primaryUser,
        primary_password: formData.primaryPassword,
        primary_port: parseInt(formData.primaryPort),
      };

      if (formData.primaryBotsCampaign?.trim()) apiPayload.primary_bots_campaign = formData.primaryBotsCampaign;
      if (formData.primaryUserSeries?.trim()) apiPayload.primary_user_series = formData.primaryUserSeries;
      if (formData.closerIpValidation?.trim()) apiPayload.closer_ip_validation = formData.closerIpValidation;
      if (formData.closerAdminLink?.trim()) apiPayload.closer_admin_link = formData.closerAdminLink;
      if (formData.closerUser?.trim()) apiPayload.closer_user = formData.closerUser;
      if (formData.closerPassword?.trim()) apiPayload.closer_password = formData.closerPassword;
      if (formData.closerCampaign?.trim()) apiPayload.closer_campaign = formData.closerCampaign;
      if (formData.closerIngroup?.trim()) apiPayload.closer_ingroup = formData.closerIngroup;
      if (formData.closerPort && formData.closerPort !== '5060') apiPayload.closer_port = parseInt(formData.closerPort);
      if (formData.customRequirements?.trim()) apiPayload.custom_requirements = formData.customRequirements;

      console.log('Submitting payload:', JSON.stringify(apiPayload, null, 2));

      const response = await fetch('https://api.xlitecore.xdialnetworks.com/api/v1/integration/add-campaign', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);

        if (errorData.detail && typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        }

        // Handle validation errors (422)
        if (response.status === 422 && errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            const fieldErrors = errorData.detail.map(err => {
              const fieldPath = err.loc ? err.loc.slice(1).join('.') : 'field';
              const readableField = fieldPath
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              return readableField;
            });

            const uniqueFields = [...new Set(fieldErrors)];

            if (uniqueFields.length === 1) {
              throw new Error(`Please fill in the ${uniqueFields[0]} field correctly.`);
            } else {
              throw new Error(`Please check the following fields: ${uniqueFields.join(', ')}`);
            }
          }
        }

        if (response.status === 400) {
          throw new Error('Invalid form data. Please check all fields and try again.');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later or contact support.');
        }

        throw new Error('Unable to submit the form. Please check all fields and try again.');
      }

      const data = await response.json();
      console.log('Success response:', data);

      setSubmitMessage({
        type: 'success',
        text: 'Campaign request submitted successfully! Our team will review and activate it shortly.'
      });

      setTimeout(() => {
        window.location.href = '/dashboard?view=dashboard';
      }, 2000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitMessage({
        type: 'error',
        text: error.message || 'Unable to submit the form. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransferSettingDetails = (id) => {
    return transferSettings.find(ts => ts.id === id);
  };

  if (isLoadingConfig) {
    return (
      <>
        <style>{styles}</style>
        <div className="integration-form-container">
          <div className="loading-state">
            <Loader size="large" />
            <p>Loading form configuration...</p>
          </div>
        </div>
      </>
    );
  }

  if (configError) {
    return (
      <>
        <style>{styles}</style>
        <div className="integration-form-container">
          <div className="error-state">
            <i className="bi bi-exclamation-triangle"></i>
            <p>{configError}</p>
            <button onClick={fetchFormConfig} className="retry-btn">
              <i className="bi bi-arrow-clockwise"></i>
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="integration-form-container">
        <div className="integration-form-wrapper">
          {/* Header */}
          <div className="form-header">
            <div>
              <h1 className="form-title">Request New Campaign</h1>
              <p className="form-subtitle">Configure your Remote Agent campaign and integration settings</p>
            </div>
            <button
              className="back-btn"
              onClick={() => window.location.href = '/dashboard?view=dashboard'}
            >
              <i className="bi bi-arrow-left"></i>
              Back to Dashboard
            </button>
          </div>

          {/* Form */}
          <div className="integration-form">
            {/* Campaign Configuration */}
            <section className="form-section">
              <div className="section-header">
                <i className="bi bi-robot"></i>
                <h2>Campaign Configuration</h2>
              </div>

              <div className="form-group">
                <label htmlFor="campaign">
                  Campaign Type <span className="required">*</span>
                </label>
                <select
                  id="campaign"
                  name="campaign"
                  value={formData.campaign}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map(campaign => (
                    <option key={campaign} value={campaign}>{campaign}</option>
                  ))}
                </select>
              </div>

              {formData.campaign && availableModels.length > 0 && (
                <div className="form-group">
                  <label htmlFor="model">
                    Model <span className="required">*</span>
                  </label>
                  <select
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Model</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.model && availableTransferSettings.length > 0 && (
                <div className="form-group">
                  <label>
                    Transfer Quality Settings <span className="required">*</span>
                  </label>

                  <div className="transfer-settings-grid">
                    {availableTransferSettings.map(setting => {
                      const fullSetting = getTransferSettingDetails(setting.id);
                      if (!fullSetting) return null;

                      return (
                        <div
                          key={setting.id}
                          className={`transfer-setting-card ${formData.transferSettingsId === setting.id ? 'selected' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, transferSettingsId: setting.id }))}
                        >
                          <div className="transfer-setting-header">
                            <input
                              type="radio"
                              name="transferSettingsId"
                              value={setting.id}
                              checked={formData.transferSettingsId === setting.id}
                              onChange={() => { }}
                              required
                            />
                            <span className="transfer-setting-name">
                              {fullSetting.name}
                              {fullSetting.is_recommended && (
                                <span className="recommended-badge">Recommended</span>
                              )}
                            </span>
                          </div>

                          <p className="transfer-setting-description">
                            {fullSetting.description}
                          </p>

                          <div className="metrics-grid">
                            <div className="metric-card">
                              <div className="metric-circle">
                                <svg viewBox="0 0 36 36" className="circular-chart">
                                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path
                                    className="circle quality"
                                    strokeDasharray={`${fullSetting.quality_score}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                </svg>
                                <div className="metric-number">{fullSetting.quality_score}</div>
                              </div>
                              <span className="metric-label">Quality</span>
                            </div>
                            <div className="metric-card">
                              <div className="metric-circle">
                                <svg viewBox="0 0 36 36" className="circular-chart">
                                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                  <path
                                    className="circle volume"
                                    strokeDasharray={`${fullSetting.volume_score}, 100`}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                </svg>
                                <div className="metric-number">{fullSetting.volume_score}</div>
                              </div>
                              <span className="metric-label">Volume</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="numberOfBots">
                  Number of Remote Agents <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="numberOfBots"
                  name="numberOfBots"
                  value={formData.numberOfBots}
                  onChange={handleChange}
                  placeholder="e.g., 10"
                  min="1"
                  max="1000"
                  required
                />
                <small className="form-hint">Specify how many concurrent remote agents you need (1-1000)</small>
              </div>
            </section>

            {/* Integration Settings */}
            <section className="form-section">
              <div className="section-header">
                <i className="bi bi-hdd-network"></i>
                <h2>Integration Settings</h2>
              </div>

              <div className="form-group">
                <label>Dialler Configuration <span className="required">*</span></label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="setupType"
                      value="same"
                      checked={formData.setupType === 'same'}
                      onChange={handleChange}
                    />
                    <span>Same Dialler</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="setupType"
                      value="separate"
                      checked={formData.setupType === 'separate'}
                      onChange={handleChange}
                    />
                    <span>Separate Closer Dialler</span>
                  </label>
                </div>
              </div>

              <div className="integration-subsection">
                <h3 className="subsection-title">
                  <i className="bi bi-gear-wide-connected"></i>
                  Primary Dialler Settings
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="primaryIpValidation">
                      IP Validation Link <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="primaryIpValidation"
                      name="primaryIpValidation"
                      value={formData.primaryIpValidation}
                      onChange={handleChange}
                      placeholder="e.g., example.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="primaryAdminLink">
                      Admin Link <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="primaryAdminLink"
                      name="primaryAdminLink"
                      value={formData.primaryAdminLink}
                      onChange={handleChange}
                      placeholder="e.g., your-dialer.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="primaryUser">
                      Username <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="primaryUser"
                      name="primaryUser"
                      value={formData.primaryUser}
                      onChange={handleChange}
                      placeholder="Admin username"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="primaryPassword">
                      Password <span className="required">*</span>
                    </label>
                    <input
                      type="password"
                      id="primaryPassword"
                      name="primaryPassword"
                      value={formData.primaryPassword}
                      onChange={handleChange}
                      placeholder="Admin password"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="primaryBotsCampaign">
                      Primary Bots Campaign
                    </label>
                    <input
                      type="text"
                      id="primaryBotsCampaign"
                      name="primaryBotsCampaign"
                      value={formData.primaryBotsCampaign}
                      onChange={handleChange}
                      placeholder="Enter primary bots campaign name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="primaryUserSeries">
                      Verifier Campaign
                    </label>
                    <input
                      type="text"
                      id="primaryUserSeries"
                      name="primaryUserSeries"
                      value={formData.primaryUserSeries}
                      onChange={handleChange}
                      placeholder="Enter verifier campaign"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="primaryPort">
                    Port
                  </label>
                  <input
                    type="text"
                    id="primaryPort"
                    name="primaryPort"
                    value={formData.primaryPort}
                    onChange={handleChange}
                    placeholder="e.g., 7788"
                  />
                </div>
              </div>

              {/* Closer Dialler Settings */}
              {formData.setupType === 'separate' && (
                <div className="integration-subsection closer-section">
                  <h3 className="subsection-title">
                    <i className="bi bi-diagram-3"></i>
                    Closer Dialler Settings (Optional)
                  </h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="closerIpValidation">
                        IP Validation Link
                      </label>
                      <input
                        type="text"
                        id="closerIpValidation"
                        name="closerIpValidation"
                        value={formData.closerIpValidation}
                        onChange={handleChange}
                        placeholder="e.g., example.com"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="closerAdminLink">
                        Admin Link
                      </label>
                      <input
                        type="text"
                        id="closerAdminLink"
                        name="closerAdminLink"
                        value={formData.closerAdminLink}
                        onChange={handleChange}
                        placeholder="e.g., closer-dialer.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="closerUser">
                        Username
                      </label>
                      <input
                        type="text"
                        id="closerUser"
                        name="closerUser"
                        value={formData.closerUser}
                        onChange={handleChange}
                        placeholder="Admin username"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="closerPassword">
                        Password
                      </label>
                      <input
                        type="password"
                        id="closerPassword"
                        name="closerPassword"
                        value={formData.closerPassword}
                        onChange={handleChange}
                        placeholder="Admin password"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="closerCampaign">
                        Campaign
                      </label>
                      <input
                        type="text"
                        id="closerCampaign"
                        name="closerCampaign"
                        value={formData.closerCampaign}
                        onChange={handleChange}
                        placeholder="Closer campaign name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="closerIngroup">
                        Ingroup
                      </label>
                      <input
                        type="text"
                        id="closerIngroup"
                        name="closerIngroup"
                        value={formData.closerIngroup}
                        onChange={handleChange}
                        placeholder="Inbound group name"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="closerPort">
                      Port
                    </label>
                    <input
                      type="text"
                      id="closerPort"
                      name="closerPort"
                      value={formData.closerPort}
                      onChange={handleChange}
                      placeholder="e.g., 7788"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Custom Requirements */}
            <section className="form-section">
              <div className="section-header">
                <i className="bi bi-chat-square-text"></i>
                <h2>Current Remote Agents</h2>
              </div>

              <div className="form-group">
                <label htmlFor="customRequirements">
                  What company's remote agents are you currently using? (Optional)
                </label>
                <textarea
                  id="customRequirements"
                  name="customRequirements"
                  value={formData.customRequirements}
                  onChange={handleChange}
                  rows="6"
                />
              </div>
            </section>

            {/* Submit Button */}
            <div className="form-actions">
              <button onClick={handleSubmit} className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <i className="bi bi-hourglass-split"></i>
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill"></i>
                    Submit Campaign Request
                  </>
                )}
              </button>
            </div>

            {/* Submit Message */}
            {submitMessage.text && (
              <div className={`submit-message ${submitMessage.type}`}>
                {submitMessage.type === 'success' && <i className="bi bi-check-circle-fill"></i>}
                {submitMessage.type === 'error' && <i className="bi bi-exclamation-circle-fill"></i>}
                {submitMessage.type === 'info' && <i className="bi bi-info-circle-fill"></i>}
                <span>{submitMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const styles = `
  @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #f8fafc;
    color: #111827;
  }

  .integration-form-container {
    min-height: 100vh;
    padding: 3rem 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }

  .integration-form-wrapper {
    max-width: 1000px;
    margin: 0 auto;
  }

  /* Loading & Error States */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1.5rem;
    background: white;
    border-radius: 16px;
    padding: 3rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #E5E7EB;
    border-top: 4px solid #4F46E5;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-state i {
    font-size: 4rem;
    color: #DC2626;
  }

  .error-state p {
    font-size: 1.125rem;
    color: #6B7280;
    text-align: center;
  }

  .retry-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.75rem;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.938rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  .retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
  }

  .retry-btn:active {
    transform: translateY(0);
  }

  /* Header */
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2.5rem;
    padding: 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .form-title {
    font-size: 2.25rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .form-subtitle {
    font-size: 1.063rem;
    color: #6B7280;
    line-height: 1.6;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1.5rem;
    background-color: white;
    border: 2px solid #E5E7EB;
    border-radius: 10px;
    color: #6B7280;
    font-size: 0.938rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .back-btn:hover {
    background-color: #F9FAFB;
    border-color: #4F46E5;
    color: #4F46E5;
    transform: translateX(-4px);
  }

  .back-btn i {
    font-size: 1.125rem;
    transition: transform 0.3s ease;
  }

  .back-btn:hover i {
    transform: translateX(-2px);
  }

  /* Form Container */
  .integration-form {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  /* Form Sections */
  .form-section {
    margin-bottom: 2.5rem;
    padding-bottom: 2.5rem;
    border-bottom: 2px solid #F3F4F6;
  }

  .form-section:last-of-type {
    margin-bottom: 2rem;
    border-bottom: none;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .section-header i {
    font-size: 1.75rem;
    color: #4F46E5;
    background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%);
    padding: 0.75rem;
    border-radius: 12px;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  /* Form Groups */
  .form-group {
    margin-bottom: 1.75rem;
  }

  .form-group label {
    display: block;
    font-size: 0.938rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.625rem;
  }

  .required {
    color: #DC2626;
    margin-left: 0.25rem;
    font-weight: 700;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #E5E7EB;
    border-radius: 10px;
    font-size: 0.938rem;
    color: #111827;
    transition: all 0.3s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #FAFBFC;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #4F46E5;
    background-color: white;
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #9CA3AF;
  }

  .form-hint {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.813rem;
    color: #6B7280;
    line-height: 1.5;
  }

  /* Form Rows */
  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  /* Radio Groups */
  .radio-group {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1.25rem;
    border: 2px solid #E5E7EB;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: #FAFBFC;
    font-weight: 500;
  }

  .radio-label:hover {
    border-color: #4F46E5;
    background-color: #F5F3FF;
    transform: translateY(-2px);
  }

  .radio-label input[type="radio"] {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
    cursor: pointer;
    accent-color: #4F46E5;
  }

  .radio-label input[type="radio"]:checked {
    background-color: #4F46E5;
  }

  .radio-label:has(input[type="radio"]:checked) {
    border-color: #4F46E5;
    background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
  }

  .radio-label:has(input[type="radio"]:checked) span {
    color: #4F46E5;
    font-weight: 600;
  }

  /* Subsections */
  .integration-subsection {
    background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%);
    border: 2px solid #E5E7EB;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1.75rem;
  }

  .subsection-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #E5E7EB;
  }

  .subsection-title i {
    font-size: 1.5rem;
    color: #4F46E5;
  }

  .closer-section {
    background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
    border-color: #FDE68A;
  }

  .closer-section .subsection-title {
    border-bottom-color: #FDE68A;
  }

  .closer-section .subsection-title i {
    color: #F59E0B;
  }

  /* Transfer Settings Grid */
  .transfer-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
  }

  .transfer-setting-card {
    background: white;
    border: 2px solid #E5E7EB;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .transfer-setting-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  .transfer-setting-card:hover {
    border-color: #4F46E5;
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.2);
    transform: translateY(-4px);
  }

  .transfer-setting-card:hover::before {
    transform: scaleX(1);
  }

  .transfer-setting-card.selected {
    border-color: #4F46E5;
    background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.25);
  }

  .transfer-setting-card.selected::before {
    transform: scaleX(1);
  }

  .transfer-setting-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-bottom: 1rem;
  }

  .transfer-setting-header input[type="radio"] {
    width: 1.25rem;
    height: 1.25rem;
    margin: 0;
    cursor: pointer;
    accent-color: #4F46E5;
  }

  .transfer-setting-name {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 1.063rem;
    font-weight: 700;
    color: #111827;
    flex-wrap: wrap;
  }

  .recommended-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.625rem;
    background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
    color: #1E40AF;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .transfer-setting-description {
    font-size: 0.875rem;
    color: #6B7280;
    margin-bottom: 1.25rem;
    line-height: 1.6;
  }

  /* Metrics Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid #E5E7EB;
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
  }

  .metric-circle {
    position: relative;
    width: 90px;
    height: 90px;
  }

  .circular-chart {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .circle-bg {
    fill: none;
    stroke: #E5E7EB;
    stroke-width: 3.5;
  }

  .circle {
    fill: none;
    stroke-width: 3.5;
    stroke-linecap: round;
    animation: progress 1.5s ease-out forwards;
  }

  .circle.quality {
    stroke: #10B981;
  }

  .circle.volume {
    stroke: #3B82F6;
  }

  @keyframes progress {
    0% {
      stroke-dasharray: 0 100;
    }
  }

  .metric-number {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  .metric-label {
    font-size: 0.875rem;
    color: #6B7280;
    font-weight: 600;
  }

  /* Form Actions */
  .form-actions {
    margin-top: 2.5rem;
    padding-top: 2.5rem;
    border-top: 2px solid #F3F4F6;
  }

  .submit-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.125rem 2rem;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.063rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    letter-spacing: 0.3px;
  }

  .submit-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #3730A3 0%, #6D28D9 100%);
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
    transform: translateY(-2px);
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .submit-btn i {
    font-size: 1.25rem;
  }

  /* Submit Message */
  .submit-message {
    margin-top: 1.75rem;
    padding: 1.25rem 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.938rem;
    font-weight: 600;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .submit-message.success {
    background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
    color: #065F46;
    border: 2px solid #10B981;
  }

  .submit-message.error {
    background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
    color: #991B1B;
    border: 2px solid #DC2626;
  }

  .submit-message.info {
    background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
    color: #1E40AF;
    border: 2px solid #3B82F6;
  }

  .submit-message i {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .integration-form-container {
      padding: 1.5rem 1rem;
    }

    .form-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.5rem;
      padding: 1.5rem;
    }

    .form-title {
      font-size: 1.75rem;
    }

    .form-subtitle {
      font-size: 0.938rem;
    }

    .back-btn {
      width: 100%;
      justify-content: center;
    }

    .integration-form {
      padding: 1.5rem;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .section-header h2 {
      font-size: 1.25rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .transfer-settings-grid {
      grid-template-columns: 1fr;
    }

    .radio-group {
      flex-direction: column;
      width: 100%;
    }

    .radio-label {
      width: 100%;
      justify-content: flex-start;
    }

    .integration-subsection {
      padding: 1.5rem;
    }

    .metrics-grid {
      gap: 1rem;
    }

    .metric-circle {
      width: 75px;
      height: 75px;
    }

    .metric-number {
      font-size: 1.25rem;
    }
  }

  @media (max-width: 480px) {
    .form-title {
      font-size: 1.5rem;
    }

    .integration-form {
      padding: 1.25rem;
    }

    .submit-btn {
      font-size: 0.938rem;
      padding: 1rem 1.5rem;
    }
  }
`;


export default RequestCampaign;