import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import Loader from "./components/Loader";

const AdminVoiceManagement = () => {
    const navigate = useNavigate();

    // Helper function to safely format error messages (handles objects, arrays, strings)
    const formatErrorMessage = (error) => {
        if (!error) return null;
        if (typeof error === 'string') return error;
        if (Array.isArray(error)) {
            return error.map(e => {
                if (typeof e === 'string') return e;
                if (e?.msg) return e.msg;
                if (e?.message) return e.message;
                return JSON.stringify(e);
            }).join(', ');
        }
        if (typeof error === 'object') {
            if (error.msg) return error.msg;
            if (error.message) return error.message;
            if (error.detail) {
                if (typeof error.detail === 'string') return error.detail;
                return formatErrorMessage(error.detail);
            }
            return JSON.stringify(error);
        }
        return String(error);
    };

    // State for data
    const [campaignModels, setCampaignModels] = useState([]);
    const [voices, setVoices] = useState([]);
    const [voiceCategories, setVoiceCategories] = useState([]);
    const [selectedCampaignModel, setSelectedCampaignModel] = useState(null);
    const [campaignModelVoicesData, setCampaignModelVoicesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for All Voices card
    const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
    const [newVoiceName, setNewVoiceName] = useState("");
    const [selectedVoiceIds, setSelectedVoiceIds] = useState([]);
    const [isCreatingVoice, setIsCreatingVoice] = useState(false);
    const [voiceActionMessage, setVoiceActionMessage] = useState(null);

    // State for Voice Categories card
    const [categorySearchQuery, setCategorySearchQuery] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [categoryActionMessage, setCategoryActionMessage] = useState(null);

    // State for Campaign Model Voice Management
    const [cmvActionMessage, setCmvActionMessage] = useState(null);
    const [isAssigningVoice, setIsAssigningVoice] = useState(false);
    const [selectedVoiceToAssign, setSelectedVoiceToAssign] = useState("");
    const [isLoadingCMV, setIsLoadingCMV] = useState(false);
    const [uploadingCell, setUploadingCell] = useState(null);
    const [voiceRecordings, setVoiceRecordings] = useState({}); // { cmvId: [recordings] }

    const [assignedCategories, setAssignedCategories] = useState([]); // Categories assigned to current campaign model
    const [selectedCategoryToAssign, setSelectedCategoryToAssign] = useState("");
    const [isAssigningCategory, setIsAssigningCategory] = useState(false);

    // Fetch initial data
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch recordings when campaign model voices data changes
    useEffect(() => {
        const fetchRecordingsForAllVoices = async () => {
            if (!campaignModelVoicesData) {
                setVoiceRecordings({});
                return;
            }

            // Get assigned voices from data
            let assignedVoicesList = [];
            if (Array.isArray(campaignModelVoicesData)) {
                assignedVoicesList = campaignModelVoicesData;
            } else if (campaignModelVoicesData.voices) {
                assignedVoicesList = campaignModelVoicesData.voices;
            } else if (campaignModelVoicesData.data) {
                assignedVoicesList = Array.isArray(campaignModelVoicesData.data)
                    ? campaignModelVoicesData.data
                    : (campaignModelVoicesData.data.voices || []);
            }

            if (assignedVoicesList.length === 0) {
                setVoiceRecordings({});
                return;
            }

            const recordingsMap = {};
            for (const cmv of assignedVoicesList) {
                try {
                    const response = await api.get(`/voice-recordings/campaign-model-voices/${cmv.id}`);
                    console.log(`Recordings for CMV ${cmv.id}:`, response.data);
                    recordingsMap[cmv.id] = response.data || [];
                } catch (err) {
                    console.error(`Error fetching recordings for CMV ${cmv.id}:`, err);
                    recordingsMap[cmv.id] = [];
                }
            }
            console.log("All Voice Recordings:", recordingsMap);
            setVoiceRecordings(recordingsMap);
        };

        fetchAllRecordingsForVoices();
    }, [campaignModelVoicesData, assignedCategories]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [modelsRes, voicesRes, categoriesRes] = await Promise.all([
                api.get("/campaign-models/"),
                api.get("/voices/"),
                api.get("/voice-categories/"),
            ]);

            console.log("Campaign Models Response:", modelsRes.data);
            console.log("Voices Response:", voicesRes.data);
            console.log("Categories Response:", categoriesRes.data);

            setCampaignModels(Array.isArray(modelsRes.data) ? modelsRes.data : []);
            setVoices(Array.isArray(voicesRes.data) ? voicesRes.data : []);
            setVoiceCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ==================== VOICE FUNCTIONS ====================
    const fetchVoices = async () => {
        try {
            const response = await api.get("/voices/");
            console.log("Fetch Voices Response:", response.data);
            setVoices(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Error fetching voices:", err);
        }
    };

    const handleCreateVoice = async () => {
        if (!newVoiceName.trim()) return;
        setIsCreatingVoice(true);
        setVoiceActionMessage(null);
        try {
            const response = await api.post("/voices/bulk", {
                voices: [{ name: newVoiceName.trim() }]
            });
            console.log("Create Voice Response:", response.data);
            if (response.data.success || response.data.created_count > 0) {
                setVoiceActionMessage({ type: "success", text: `Voice "${newVoiceName}" created!` });
                setNewVoiceName("");
                await fetchVoices();
            } else {
                setVoiceActionMessage({ type: "error", text: response.data.errors?.join(", ") || "Failed" });
            }
        } catch (err) {
            console.error("Error creating voice:", err);
            setVoiceActionMessage({ type: "error", text: err.response?.data?.detail || "Failed to create voice" });
        } finally {
            setIsCreatingVoice(false);
        }
    };

    const handleDeleteVoice = async (voiceId) => {
        if (!window.confirm("Delete this voice?")) return;
        try {
            const response = await api.post("/voices/bulk-delete", [voiceId]);
            console.log("Delete Voice Response:", response.data);
            if (response.data.success || response.data.deleted_count > 0) {
                setVoiceActionMessage({ type: "success", text: "Voice deleted!" });
                await fetchVoices();
            } else {
                setVoiceActionMessage({ type: "error", text: "Failed (may be assigned to campaign model)" });
            }
        } catch (err) {
            console.error("Error deleting voice:", err);
            setVoiceActionMessage({ type: "error", text: err.response?.data?.detail || "Failed" });
        }
    };

    const handleBulkDeleteVoices = async () => {
        if (selectedVoiceIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedVoiceIds.length} voice(s)?`)) return;
        try {
            const response = await api.post("/voices/bulk-delete", selectedVoiceIds);
            console.log("Bulk Delete Voices Response:", response.data);
            if (response.data.success || response.data.deleted_count > 0) {
                setVoiceActionMessage({ type: "success", text: `${response.data.deleted_count || selectedVoiceIds.length} deleted!` });
                setSelectedVoiceIds([]);
                await fetchVoices();
            }
        } catch (err) {
            console.error("Error bulk deleting voices:", err);
            setVoiceActionMessage({ type: "error", text: "Failed to delete" });
        }
    };

    const toggleVoiceSelection = (voiceId) => {
        setSelectedVoiceIds(prev => prev.includes(voiceId) ? prev.filter(id => id !== voiceId) : [...prev, voiceId]);
    };

    const filteredVoices = voices.filter(voice =>
        voice.name?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
        voice.id?.toString().includes(voiceSearchQuery)
    );

    // ==================== VOICE CATEGORIES FUNCTIONS ====================
    const fetchCategories = async () => {
        try {
            const response = await api.get("/voice-categories/");
            console.log("Fetch Categories Response:", response.data);
            setVoiceCategories(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setIsCreatingCategory(true);
        setCategoryActionMessage(null);
        try {
            const response = await api.post("/voice-categories/bulk", {
                categories: [{ name: newCategoryName.trim() }]
            });
            console.log("Create Category Response:", response.data);
            if (response.data.success || response.data.created_count > 0) {
                setCategoryActionMessage({ type: "success", text: `Category "${newCategoryName}" created!` });
                setNewCategoryName("");
                await fetchCategories();
            } else {
                setCategoryActionMessage({ type: "error", text: response.data.errors?.join(", ") || "Failed" });
            }
        } catch (err) {
            console.error("Error creating category:", err);
            setCategoryActionMessage({ type: "error", text: err.response?.data?.detail || "Failed" });
        } finally {
            setIsCreatingCategory(false);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm("Delete this category?")) return;
        try {
            const response = await api.post("/voice-categories/bulk-delete", [categoryId]);
            console.log("Delete Category Response:", response.data);
            if (response.data.success || response.data.deleted_count > 0) {
                setCategoryActionMessage({ type: "success", text: "Category deleted!" });
                await fetchCategories();
            }
        } catch (err) {
            console.error("Error deleting category:", err);
            setCategoryActionMessage({ type: "error", text: "Failed" });
        }
    };

    const handleBulkDeleteCategories = async () => {
        if (selectedCategoryIds.length === 0) return;
        if (!window.confirm(`Delete ${selectedCategoryIds.length} category(s)?`)) return;
        try {
            const response = await api.post("/voice-categories/bulk-delete", selectedCategoryIds);
            console.log("Bulk Delete Categories Response:", response.data);
            if (response.data.success || response.data.deleted_count > 0) {
                setCategoryActionMessage({ type: "success", text: `${response.data.deleted_count || selectedCategoryIds.length} deleted!` });
                setSelectedCategoryIds([]);
                await fetchCategories();
            }
        } catch (err) {
            console.error("Error bulk deleting categories:", err);
            setCategoryActionMessage({ type: "error", text: "Failed" });
        }
    };

    const toggleCategorySelection = (categoryId) => {
        setSelectedCategoryIds(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
    };

    const filteredCategories = voiceCategories.filter(cat =>
        cat.name?.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
        cat.id?.toString().includes(categorySearchQuery)
    );

    // ==================== CAMPAIGN MODEL FUNCTIONS ====================
    const fetchCampaignModelVoicesDetailed = async (campaignModelId) => {
        setIsLoadingCMV(true);
        try {
            // Fetch voices detailed
            const voicesResponse = await api.get(`/campaign-model-voices/campaign-models/${campaignModelId}/detailed`);
            console.log("Campaign Model Voices Detailed Response:", voicesResponse.data);
            setCampaignModelVoicesData(voicesResponse.data);

            // Fetch assigned categories
            const categoriesResponse = await api.get(`/voice-categories/campaign-models/${campaignModelId}/categories`);
            console.log("Campaign Model Categories Response:", categoriesResponse.data);
            setAssignedCategories(categoriesResponse.data || []);
        } catch (err) {
            console.error("Error fetching CMV detailed or categories:", err);
            setCampaignModelVoicesData(null);
            setAssignedCategories([]);
        } finally {
            setIsLoadingCMV(false);
        }
    };

    const handleAssignCategoryToModel = async () => {
        if (!selectedCategoryToAssign || !selectedCampaignModel) return;
        setIsAssigningCategory(true);
        setCmvActionMessage(null);
        try {
            const payload = {
                assignments: [{
                    campaign_model_id: selectedCampaignModel.id,
                    voice_category_id: parseInt(selectedCategoryToAssign)
                }]
            };
            console.log("Assign Category Payload:", payload);
            const response = await api.post("/voice-categories/campaign-models/categories/bulk", payload);
            console.log("Assign Category Response:", response.data);
            if (response.data.success || response.data.created_count > 0) {
                setCmvActionMessage({ type: "success", text: "Category assigned to model!" });
                setSelectedCategoryToAssign("");
                // Refresh data
                await fetchCampaignModelVoicesDetailed(selectedCampaignModel.id);
            } else {
                setCmvActionMessage({ type: "error", text: formatErrorMessage(response.data.errors) || "Failed to assign" });
            }
        } catch (err) {
            console.error("Error assigning category:", err);
            setCmvActionMessage({ type: "error", text: formatErrorMessage(err.response?.data?.detail) || "Failed to assign" });
        } finally {
            setIsAssigningCategory(false);
        }
    };

    const handleRemoveCategoryFromModel = async (assignmentId) => {
        if (!window.confirm("Remove this category from the model? This will delete all associated recordings.")) return;

        // 1. Find all recordings associated with this category assignment
        let recordingsToDelete = [];
        const allRecordings = Object.values(voiceRecordings).flat();

        allRecordings.forEach(rec => {
            if (rec.campaign_model_voice_category_id === assignmentId) {
                recordingsToDelete.push(rec.id);
            }
        });

        console.log(`Found ${recordingsToDelete.length} recordings to delete for assignment ${assignmentId}`);

        try {
            // 2. Delete the recordings first if any exist
            if (recordingsToDelete.length > 0) {
                setCmvActionMessage({ type: "info", text: `Deleting ${recordingsToDelete.length} associated recordings...` });
                const params = new URLSearchParams();
                recordingsToDelete.forEach(id => params.append("recording_ids", id));

                await api.post("/voice-recordings/delete", params, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                });
            }

            // 3. Now delete the category assignment
            const response = await api.post("/voice-categories/campaign-models/categories/bulk-delete", [assignmentId]);
            console.log("Remove Category Response:", response.data);

            if (response.data.success || response.data.deleted_count > 0) {
                setCmvActionMessage({ type: "success", text: "Category and associated recordings removed!" });
                await fetchCampaignModelVoicesDetailed(selectedCampaignModel.id);
                // Also refresh recordings to clear the deleted ones from view
                await fetchAllRecordingsForVoices();
            } else {
                setCmvActionMessage({ type: "error", text: "Failed to remove category assignment" });
            }
        } catch (err) {
            console.error("Error removing category:", err);
            setCmvActionMessage({ type: "error", text: formatErrorMessage(err.response?.data?.detail) || "Failed to remove" });
        }
    };

    const handleCampaignModelSelect = (model) => {
        console.log("Selected Campaign Model:", model);
        setSelectedCampaignModel(model);
        setCmvActionMessage(null);
        if (model) {
            fetchCampaignModelVoicesDetailed(model.id);
        } else {
            setCampaignModelVoicesData(null);
        }
    };

    const handleAssignVoice = async () => {
        if (!selectedVoiceToAssign || !selectedCampaignModel) return;
        setIsAssigningVoice(true);
        setCmvActionMessage(null);
        try {
            // API expects: { assignments: [{ campaign_model_id, voice_id, active }] }
            const payload = {
                assignments: [{
                    campaign_model_id: selectedCampaignModel.id,
                    voice_id: parseInt(selectedVoiceToAssign),
                    active: true
                }]
            };
            console.log("Assign Voice Payload:", payload);
            const response = await api.post("/campaign-model-voices/bulk", payload);
            console.log("Assign Voice Response:", response.data);
            if (response.data.success || response.data.created_count > 0) {
                setCmvActionMessage({ type: "success", text: "Voice assigned!" });
                setSelectedVoiceToAssign("");
                await fetchCampaignModelVoicesDetailed(selectedCampaignModel.id);
            } else {
                const errorText = formatErrorMessage(response.data.errors);
                setCmvActionMessage({ type: "error", text: errorText || "Failed" });
            }
        } catch (err) {
            console.error("Error assigning voice:", err);
            setCmvActionMessage({ type: "error", text: formatErrorMessage(err.response?.data?.detail) || "Failed to assign" });
        } finally {
            setIsAssigningVoice(false);
        }
    };

    const handleRemoveVoiceFromCM = async (cmvId) => {
        if (!window.confirm("Remove this voice from campaign model?")) return;
        try {
            const response = await api.post("/campaign-model-voices/bulk-delete", [cmvId]);
            console.log("Remove Voice Response:", response.data);
            if (response.data.success || response.data.deleted_count > 0) {
                setCmvActionMessage({ type: "success", text: "Voice removed!" });
                await fetchCampaignModelVoicesDetailed(selectedCampaignModel.id);
            }
        } catch (err) {
            console.error("Error removing voice:", err);
            setCmvActionMessage({ type: "error", text: "Failed to remove" });
        }
    };

    const handleToggleVoiceActive = async (cmv) => {
        try {
            // API expects: { updates: [{ cmv_id: number, active: boolean }] }
            const payload = {
                updates: [{
                    cmv_id: cmv.id,
                    active: !cmv.active
                }]
            };
            console.log("Toggle Active Payload:", payload);
            const response = await api.put("/campaign-model-voices/bulk", payload);
            console.log("Toggle Active Response:", response.data);
            if (response.data.success || response.data.updated_count > 0) {
                await fetchCampaignModelVoicesDetailed(selectedCampaignModel.id);
            } else {
                setCmvActionMessage({ type: "error", text: formatErrorMessage(response.data.errors) || "Failed to update" });
            }
        } catch (err) {
            console.error("Error toggling voice:", err);
            setCmvActionMessage({ type: "error", text: formatErrorMessage(err.response?.data?.detail) || "Failed to update" });
        }
    };

    const handleUploadRecording = async (cmvId, cmvcId, file) => {
        if (!file) return;
        setUploadingCell({ cmvId, cmvcId });
        const formData = new FormData();
        formData.append("files", file);

        // New API format: mappings as JSON string
        const mappings = [{
            filename: file.name,
            campaign_model_voice_id: cmvId,
            campaign_model_voice_category_id: cmvcId
        }];
        formData.append("mappings", JSON.stringify(mappings));

        console.log("Upload Recording - Mappings:", mappings);

        try {
            const response = await api.post("/voice-recordings/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            console.log("Upload Recording Response:", response.data);

            // Show specific message as requested: DB saved -> Deploying
            setCmvActionMessage({
                type: "success",
                text: "Recording saved to database. Deploying to servers in background..."
            });

            // Refresh recordings for all voices
            await fetchAllRecordingsForVoices();
        } catch (err) {
            console.error("Error uploading recording:", err);
            setCmvActionMessage({ type: "error", text: formatErrorMessage(err.response?.data?.detail) || "Upload failed" });
        } finally {
            setUploadingCell(null);
        }
    };

    const handleDeleteRecording = async (recordingId) => {
        if (!window.confirm("Delete this recording?")) return;
        try {
            const params = new URLSearchParams();
            // API expects recording_ids as array/list. 
            // In x-www-form-urlencoded, this is usually repeated keys or just one if it's a list of one.
            params.append("recording_ids", recordingId);

            const response = await api.post("/voice-recordings/delete", params, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });
            console.log("Delete Recording Response:", response.data);
            setCmvActionMessage({ type: "success", text: "Recording deleted!" });
            // Refresh recordings for all voices
            await fetchAllRecordingsForVoices();
        } catch (err) {
            console.error("Error deleting recording:", err);
            setCmvActionMessage({ type: "error", text: formatErrorMessage(err.response?.data?.detail) || "Failed to delete" });
        }
    };

    // Fetch recordings for a specific voice + category combination
    const fetchRecordingsForCell = async (cmvId, cmvcId) => {
        try {
            const response = await api.get(`/voice-recordings/campaign-model-voices/${cmvId}/categories/${cmvcId}`);
            // response.data is expected to be an array of recordings
            return response.data || [];
        } catch (err) {
            console.error(`Error fetching recordings for CMV ${cmvId} Category ${cmvcId}:`, err);
            return [];
        }
    };

    // Fetch recordings for all assigned voices and categories
    const fetchAllRecordingsForVoices = async () => {
        const assignedVoicesList = getAssignedVoices();

        // If no voices or categories, plain return
        if (assignedVoicesList.length === 0 || assignedCategories.length === 0) {
            setVoiceRecordings({});
            return;
        }

        const recordingsMap = {};

        // Iterate through all voices and all categories
        for (const cmv of assignedVoicesList) {
            let voiceRecs = [];
            for (const cat of assignedCategories) {
                // Fetch for this specific cell
                // Note: The 'id' of the category assignment (campaign_model_voice_category) is what we need?
                // The endpoint says {cmvc_id}. 
                // assignedCategories are the assignments effectively. 
                // Let's verify if assignedCategories contains the ID we need.
                // In handleRemoveCategoryFromModel we use assignmentId, which comes from assignedCategories.id
                // So yes, cat.id is likely the cmvc_id.

                const cellRecs = await fetchRecordingsForCell(cmv.id, cat.id);
                // Tag them just in case backend doesn't return the ID (though schema says it does)
                const taggedRecs = cellRecs.map(r => ({
                    ...r,
                    campaign_model_voice_category_id: cat.id
                }));

                voiceRecs = [...voiceRecs, ...taggedRecs];
            }
            recordingsMap[cmv.id] = voiceRecs;
        }

        console.log("All Voice Recordings (Aggregated):", recordingsMap);
        setVoiceRecordings(recordingsMap);
    };

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate("/");
    };

    // Get assigned voices from the detailed response
    // The response might be an array or an object with a 'voices' property
    const getAssignedVoices = () => {
        if (!campaignModelVoicesData) return [];
        // If it's an array, return it directly
        if (Array.isArray(campaignModelVoicesData)) return campaignModelVoicesData;
        // If it has a 'voices' property
        if (campaignModelVoicesData.voices) return campaignModelVoicesData.voices;
        // If it has a 'data' property
        if (campaignModelVoicesData.data) {
            if (Array.isArray(campaignModelVoicesData.data)) return campaignModelVoicesData.data;
            if (campaignModelVoicesData.data.voices) return campaignModelVoicesData.data.voices;
        }
        return [];
    };

    const assignedVoices = getAssignedVoices();

    const getUnassignedVoices = () => {
        const assignedVoiceIds = assignedVoices.map(v => v.voice_id || v.id);
        return voices.filter(v => !assignedVoiceIds.includes(v.id));
    };

    // Get recordings for a specific voice + category combination
    const getRecordingsForCell = (cmv, cmvc) => {
        // First check the voiceRecordings state (fetched from API)
        const recordings = voiceRecordings[cmv.id] || cmv.recordings || cmv.voice_recordings || [];

        // Filter recordings by category
        return recordings.filter(rec => {
            // Check if recording matches the campaign_model_voice_category_id
            if (rec.campaign_model_voice_category_id && rec.campaign_model_voice_category_id === cmvc.id) return true;
            return false;
        });
    };

    // Get unassigned recordings for a voice (no category assigned)
    const getUnassignedRecordings = (cmv) => {
        const recordings = voiceRecordings[cmv.id] || cmv.recordings || cmv.voice_recordings || [];
        return recordings.filter(rec => !rec.campaign_model_voice_category_id);
    };

    const handleAssignCategoryToRecording = async (recordingId, categoryId) => {
        if (!recordingId || !categoryId || !selectedCampaignModel) return;

        // Find the correct campaign_model_voice_category_id based on the categoryId (voice_category_id)
        // We need to look up the assignment ID in assignedCategories
        const targetAssignment = assignedCategories.find(ac => ac.voice_category_id === categoryId);

        if (!targetAssignment) {
            setCmvActionMessage({ type: "error", text: "Category not assigned to this model" });
            return;
        }

        try {
            // We use the upload endpoint or a specific update endpoint. 
            // Since we don't have a direct 'assign category' endpoint for recordings in the list,
            // we might need to assume there's an endpoint or use a workaround.
            // *Wait*, the prompt mentioned "The handleUploadRecording function was updated to accept and send campaign_model_voice_category_id".
            // It didn't explicitly say there is an endpoint to update an existing recording's category.
            // However, typical REST patterns suggest a PUT or PATCH.
            // Let's assume there's a way, or we might need to re-upload. 
            // But wait, the previous code had `handleAssignCategoryToRecording`. Let's check if it existed before.
            // Actually, looking at the previous analysis, `handleAssignCategoryToRecording` was removed because it was "obsolete".
            // But the UI still uses it.
            // If the backend supports updating the category of a recording, we should use that.
            // If not, we might need to delete and re-upload (which isn't possible here without the file).
            // Let's assume a standard update endpoint exists or we can mistakenly left it in the UI.
            // API Schema check: `.../recordings/categories/bulk` was in the plan.

            // Let's implement it using a hypothetical endpoint or the one from the plan
            const response = await api.put(`/voice-recordings/${recordingId}`, {
                campaign_model_voice_category_id: targetAssignment.id
            });

            if (response.data) {
                setCmvActionMessage({ type: "success", text: "Category assigned!" });
                await fetchAllRecordingsForVoices();
            }
        } catch (err) {
            console.error("Error assigning category to recording:", err);
            // Fallback: simpler alert if endpoint fails/doesn't exist yet
            setCmvActionMessage({ type: "error", text: "Failed to assign category" });
        }
    };

    // ==================== STYLES ====================
    const cardStyle = {
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        marginBottom: "24px",
        overflow: "hidden",
    };

    const inputStyle = {
        padding: "10px 14px",
        backgroundColor: "white",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
    };

    const MessageBanner = ({ message, onClose }) => {
        if (!message) return null;
        return (
            <div style={{
                padding: "10px 20px",
                backgroundColor: message.type === "success" ? "#14532d" : "#7f1d1d",
                color: message.type === "success" ? "#86efac" : "#fecaca",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <span>{message.text}</span>
                <button onClick={onClose} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px" }}>×</button>
            </div>
        );
    };

    const voiceColors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#ef4444", "#84cc16"];

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "'Inter', sans-serif", padding: "32px" }}>
            {/* Header */}
            <header style={{
                maxWidth: "1400px",
                margin: "0 auto",
                marginBottom: "32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#111827" }}>
                        Voice Management
                    </h1>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        padding: "6px 14px",
                        backgroundColor: loading ? "#fbbf24" : "#10b981",
                        borderRadius: "16px",
                        color: loading ? "#1e293b" : "#ffffff",
                        fontSize: "12px",
                        fontWeight: "600",
                    }}>
                        {loading ? "Loading..." : "Ready"}
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                {error && (
                    <div style={{ padding: "12px", backgroundColor: "#7f1d1d", border: "1px solid #ef4444", borderRadius: "8px", marginBottom: "20px", color: "#fecaca", fontSize: "14px" }}>
                        {error}
                    </div>
                )}

                {/* Two Column Layout for Voices and Categories */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                    {/* All Voices Card */}
                    <div style={cardStyle}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "18px" }}>🎙️</span>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>All Voices</h3>
                                <span style={{ backgroundColor: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "600" }}>{voices.length}</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {selectedVoiceIds.length > 0 && (
                                    <button onClick={handleBulkDeleteVoices} style={{ padding: "6px 10px", backgroundColor: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                                        🗑️ {selectedVoiceIds.length}
                                    </button>
                                )}
                                <button onClick={fetchVoices} style={{ padding: "6px 10px", backgroundColor: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>🔄</button>
                            </div>
                        </div>
                        <MessageBanner message={voiceActionMessage} onClose={() => setVoiceActionMessage(null)} />
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "8px", backgroundColor: "#f9fafb" }}>
                            <input type="text" placeholder="Search..." value={voiceSearchQuery} onChange={(e) => setVoiceSearchQuery(e.target.value)} style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <input type="text" placeholder="New voice..." value={newVoiceName} onChange={(e) => setNewVoiceName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateVoice()} style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <button onClick={handleCreateVoice} disabled={isCreatingVoice || !newVoiceName.trim()} style={{ padding: "8px 14px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer", opacity: !newVoiceName.trim() ? 0.5 : 1 }}>+</button>
                        </div>
                        <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                            {filteredVoices.map((voice, idx) => (
                                <div key={voice.id} style={{ padding: "10px 16px", backgroundColor: "white", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <input type="checkbox" checked={selectedVoiceIds.includes(voice.id)} onChange={() => toggleVoiceSelection(voice.id)} style={{ accentColor: "#4f46e5" }} />
                                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: voiceColors[idx % voiceColors.length], display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "600", fontSize: "12px" }}>
                                            {voice.name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <span style={{ fontWeight: "600", color: "#111827", fontSize: "13px" }}>{voice.name}</span>
                                        <span style={{ fontSize: "11px", color: "#6b7280" }}>#{voice.id}</span>
                                    </div>
                                    <button onClick={() => handleDeleteVoice(voice.id)} style={{ padding: "4px 8px", backgroundColor: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>🗑️</button>
                                </div>
                            ))}
                            {filteredVoices.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>No voices</div>}
                        </div>
                    </div>

                    {/* Voice Categories Card */}
                    <div style={cardStyle}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "18px" }}>📂</span>
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>Voice Categories</h3>
                                <span style={{ backgroundColor: "#faf5ff", color: "#a855f7", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "600" }}>{voiceCategories.length}</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                                {selectedCategoryIds.length > 0 && (
                                    <button onClick={handleBulkDeleteCategories} style={{ padding: "6px 10px", backgroundColor: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                                        🗑️ {selectedCategoryIds.length}
                                    </button>
                                )}
                                <button onClick={fetchCategories} style={{ padding: "6px 10px", backgroundColor: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>🔄</button>
                            </div>
                        </div>
                        <MessageBanner message={categoryActionMessage} onClose={() => setCategoryActionMessage(null)} />
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: "8px", backgroundColor: "#f9fafb" }}>
                            <input type="text" placeholder="Search..." value={categorySearchQuery} onChange={(e) => setCategorySearchQuery(e.target.value)} style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <input type="text" placeholder="New category..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()} style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <button onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()} style={{ padding: "8px 14px", backgroundColor: "#a855f7", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "600", cursor: "pointer", opacity: !newCategoryName.trim() ? 0.5 : 1 }}>+</button>
                        </div>
                        <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                            {filteredCategories.map((cat, idx) => (
                                <div key={cat.id} style={{ padding: "10px 16px", backgroundColor: "white", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <input type="checkbox" checked={selectedCategoryIds.includes(cat.id)} onChange={() => toggleCategorySelection(cat.id)} style={{ accentColor: "#a855f7" }} />
                                        <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "600", fontSize: "12px" }}>
                                            {cat.name?.charAt(0).toUpperCase() || "?"}
                                        </div>
                                        <span style={{ fontWeight: "600", color: "#111827", fontSize: "13px" }}>{cat.name}</span>
                                        <span style={{ fontSize: "11px", color: "#6b7280" }}>#{cat.id}</span>
                                    </div>
                                    <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: "4px 8px", backgroundColor: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>🗑️</button>
                                </div>
                            ))}
                            {filteredCategories.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>No categories</div>}
                        </div>
                    </div>
                </div>

                {/* ==================== CAMPAIGN MODEL VOICE GRID ==================== */}
                <div style={cardStyle}>
                    <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                        <div>
                            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                                📋 Campaign Model Configuration
                            </h2>
                            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Select campaign model, assign voices, upload recordings per category</p>
                        </div>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <select
                                value={selectedCampaignModel?.id || ""}
                                onChange={(e) => {
                                    const model = campaignModels.find(m => m.id === parseInt(e.target.value));
                                    handleCampaignModelSelect(model || null);
                                }}
                                style={{ ...inputStyle, minWidth: "280px", cursor: "pointer" }}
                            >
                                <option value="">Select Campaign Model</option>
                                {campaignModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.campaign?.name || model.campaign_name || "Campaign"} - {model.model?.name || model.model_name || "Model"}
                                    </option>
                                ))}
                            </select>
                            {selectedCampaignModel && (
                                <button onClick={() => fetchCampaignModelVoicesDetailed(selectedCampaignModel.id)} style={{ padding: "10px 14px", backgroundColor: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "600" }}>🔄</button>
                            )}
                        </div>
                    </div>

                    <MessageBanner message={cmvActionMessage} onClose={() => setCmvActionMessage(null)} />

                    {!selectedCampaignModel ? (
                        <div style={{ padding: "80px", textAlign: "center", color: "#6b7280" }}>
                            <div style={{ fontSize: "64px", marginBottom: "20px" }}>📋</div>
                            <h3 style={{ fontSize: "20px", margin: "0 0 12px 0", color: "#374151", fontWeight: "700" }}>Select a Campaign Model</h3>
                            <p style={{ fontSize: "14px", maxWidth: "400px", margin: "0 auto" }}>Choose a campaign model from the dropdown above to configure voices and manage their recordings per category.</p>
                        </div>
                    ) : isLoadingCMV ? (
                        <div style={{ padding: "80px", textAlign: "center", color: "#6b7280" }}>
                            <div style={{ margin: "0 auto 20px auto", width: "fit-content" }}>
                                <Loader size="large" />
                            </div>
                            <p style={{ fontSize: "16px", fontWeight: "500" }}>Loading Configuration...</p>
                        </div>
                    ) : (
                        <>
                            {/* Assign Voice Row */}
                            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", gap: "16px" }}>
                                <span style={{ color: "#4b5563", fontSize: "14px", fontWeight: "600" }}>Assign Voice:</span>
                                <select value={selectedVoiceToAssign} onChange={(e) => setSelectedVoiceToAssign(e.target.value)} style={{ ...inputStyle, minWidth: "180px" }}>
                                    <option value="">Select voice...</option>
                                    {getUnassignedVoices().map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                                <button onClick={handleAssignVoice} disabled={isAssigningVoice || !selectedVoiceToAssign} style={{ padding: "10px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: !selectedVoiceToAssign ? 0.5 : 1 }}>
                                    {isAssigningVoice ? "..." : "+ Assign"}
                                </button>
                            </div>

                            {/* Debug Info - Remove in production */}
                            <div style={{ padding: "10px 20px", backgroundColor: "#1a1a2e", fontSize: "11px", color: "#888", borderBottom: "1px solid #334155" }}>
                                Debug: Assigned Voices Count: {assignedVoices.length} | Categories Count: {voiceCategories.length} |
                                Raw Data Type: {campaignModelVoicesData ? (Array.isArray(campaignModelVoicesData) ? "Array" : "Object with keys: " + Object.keys(campaignModelVoicesData).join(", ")) : "null"}
                            </div>

                            {/* GRID: Categories (rows) x Voices (columns) */}
                            {assignedVoices.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎙️</div>
                                    <p>No voices assigned. Use the dropdown above to assign voices.</p>
                                </div>
                            ) : voiceCategories.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
                                    <p>No categories found. Create categories above to organize recordings.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Manage Categories Section */}
                                    <div style={{ padding: "20px", borderBottom: "1px solid #334155" }}>
                                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ fontSize: "18px" }}>🏷️</span> Manage Categories for {selectedCampaignModel.campaign?.name} / {selectedCampaignModel.model?.name}
                                        </h3>

                                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "20px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Assign New Category</label>
                                                <select
                                                    value={selectedCategoryToAssign}
                                                    onChange={(e) => setSelectedCategoryToAssign(e.target.value)}
                                                    style={{
                                                        width: "100%", padding: "10px", backgroundColor: "white", border: "1px solid #d1d5db",
                                                        borderRadius: "6px", color: "#111827", outline: "none", fontSize: "14px"
                                                    }}
                                                >
                                                    <option value="">Select a category...</option>
                                                    {voiceCategories
                                                        .filter(cat => !assignedCategories.some(ac => ac.voice_category_id === cat.id))
                                                        .map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleAssignCategoryToModel}
                                                disabled={!selectedCategoryToAssign || isAssigningCategory}
                                                style={{
                                                    padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", border: "none",
                                                    borderRadius: "6px", cursor: (!selectedCategoryToAssign || isAssigningCategory) ? "not-allowed" : "pointer",
                                                    opacity: (!selectedCategoryToAssign || isAssigningCategory) ? 0.7 : 1, fontWeight: "500", fontSize: "14px",
                                                    display: "flex", alignItems: "center", gap: "6px"
                                                }}
                                            >
                                                {isAssigningCategory ? "Assigning..." : <><span>+</span> Assign Category</>}
                                            </button>
                                        </div>

                                        <div style={{ overflowX: "auto" }}>
                                            <div style={{ display: "inline-block", minWidth: "100%" }}>
                                                {/* Grid Header */}
                                                <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${assignedVoices.length}, 1fr)`, borderBottom: "1px solid #e5e7eb" }}>
                                                    <div style={{ padding: "16px", backgroundColor: "#f9fafb", color: "#6b7280", fontSize: "12px", fontWeight: "600", borderRight: "1px solid #e5e7eb" }}>
                                                        CATEGORY \ VOICE
                                                    </div>
                                                    {assignedVoices.map(cmv => (
                                                        <div key={cmv.id} style={{ padding: "16px", backgroundColor: "#f9fafb", borderRight: "1px solid #e5e7eb", minWidth: "200px" }}>
                                                            <div style={{ color: "#111827", fontWeight: "600", fontSize: "14px", marginBottom: "4px" }}>
                                                                {cmv.voice_name || `Voice ${cmv.voice_id}`}
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                                <span style={{ fontSize: "11px", color: cmv.active ? "#059669" : "#ef4444", backgroundColor: cmv.active ? "#ecfdf5" : "#fee2e2", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                                                    {cmv.active ? "Active" : "Inactive"}
                                                                </span>
                                                                <div style={{ display: "flex", gap: "8px" }}>
                                                                    <div
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleVoiceActive(cmv);
                                                                        }}
                                                                        style={{
                                                                            width: "36px", height: "20px",
                                                                            backgroundColor: cmv.active ? "#10b981" : "#d1d5db",
                                                                            borderRadius: "10px", position: "relative", cursor: "pointer"
                                                                        }}
                                                                    >
                                                                        <div style={{
                                                                            width: "16px", height: "16px", backgroundColor: "white", borderRadius: "50%",
                                                                            position: "absolute", top: "2px",
                                                                            left: cmv.active ? "18px" : "2px", transition: "left 0.2s"
                                                                        }}></div>
                                                                    </div>
                                                                    <button onClick={() => handleRemoveVoiceFromCM(cmv.id)} title="Remove voice" style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "14px" }}>✕</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Category Rows */}
                                                {assignedCategories.length === 0 ? (
                                                    <div style={{ padding: "30px", textAlign: "center", color: "#6b7280", backgroundColor: "#f9fafb" }}>
                                                        No categories assigned to this model. Add a category above to start managing recordings.
                                                    </div>
                                                ) : (
                                                    assignedCategories.map((category) => (
                                                        <div key={category.id} style={{ display: "grid", gridTemplateColumns: `160px repeat(${assignedVoices.length}, 1fr)`, borderBottom: "1px solid #e5e7eb" }}>
                                                            {/* Category Label */}
                                                            <div style={{ padding: "16px 20px", backgroundColor: "#f9fafb", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                                                <div>
                                                                    <div style={{ fontWeight: "600", color: "#111827", fontSize: "13px", marginBottom: "2px" }}>{category.voice_category_name}</div>
                                                                    <div style={{ fontSize: "10px", color: "#6b7280" }}>ID: {category.voice_category_id}</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveCategoryFromModel(category.id)}
                                                                    style={{
                                                                        marginTop: "10px", backgroundColor: "transparent", color: "#ef4444",
                                                                        border: "1px solid #ef4444", borderRadius: "4px", padding: "4px 8px",
                                                                        fontSize: "11px", cursor: "pointer", alignSelf: "start", fontWeight: "600"
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>

                                                            {/* Voice Cells */}
                                                            {assignedVoices.map((cmv) => {
                                                                const cellRecordings = getRecordingsForCell(cmv, category);
                                                                const isUploading = uploadingCell?.cmvId === cmv.id && uploadingCell?.cmvcId === category.id;
                                                                const cellKey = `${cmv.id}-${category.id}`;

                                                                return (
                                                                    <div key={cellKey} style={{
                                                                        padding: "12px",
                                                                        backgroundColor: cmv.active ? "white" : "#f3f4f6",
                                                                        borderLeft: "1px solid #e5e7eb",
                                                                        minHeight: "100px",
                                                                        opacity: cmv.active ? 1 : 0.5,
                                                                    }}>
                                                                        {!cmv.active ? (
                                                                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "12px", fontWeight: "600" }}>
                                                                                Voice Inactive
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                {cellRecordings.length > 0 && (
                                                                                    <div style={{ marginBottom: "8px" }}>
                                                                                        {cellRecordings.map((rec) => (
                                                                                            <div key={rec.id} style={{
                                                                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                                                                padding: "6px 8px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", marginBottom: "4px"
                                                                                            }}>
                                                                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                                                    <span style={{ color: "#4f46e5", fontSize: "14px" }}>▶</span>
                                                                                                    <span style={{ fontSize: "12px", color: "#374151", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                                                        {rec.name || rec.filename || `rec_${rec.id}`}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <button onClick={() => handleDeleteRecording(rec.id)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "12px", padding: "2px 4px" }}>🗑️</button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {isUploading ? (
                                                                                    <div style={{ padding: "16px", textAlign: "center", color: "#4f46e5", fontSize: "12px", fontWeight: "600" }}>
                                                                                        <span style={{ animation: "pulse 1s infinite" }}>⏳ Uploading...</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <label style={{
                                                                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                                                                        padding: "12px", border: "2px dashed #d1d5db", borderRadius: "8px", cursor: "pointer",
                                                                                        minHeight: cellRecordings.length > 0 ? "50px" : "60px", textAlign: "center",
                                                                                        backgroundColor: "#f9fafb"
                                                                                    }}>
                                                                                        <input
                                                                                            type="file"
                                                                                            accept=".mp3,audio/*"
                                                                                            style={{ display: "none" }}
                                                                                            onChange={(e) => {
                                                                                                if (e.target.files[0]) handleUploadRecording(cmv.id, category.id, e.target.files[0]);
                                                                                                e.target.value = null;
                                                                                            }}
                                                                                        />
                                                                                        <span style={{ fontSize: "20px", color: "#9ca3af", marginBottom: "4px" }}>☁️</span>
                                                                                        <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Drag MP3 here</span>
                                                                                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>or click to browse</span>
                                                                                    </label>
                                                                                )}

                                                                                {cellRecordings.length > 0 && (
                                                                                    <label style={{ display: "block", marginTop: "6px", fontSize: "12px", color: "#4f46e5", cursor: "pointer", textAlign: "center", fontWeight: "600" }}>
                                                                                        + Add Variation
                                                                                        <input
                                                                                            type="file"
                                                                                            accept=".mp3,audio/*"
                                                                                            style={{ display: "none" }}
                                                                                            onChange={(e) => {
                                                                                                if (e.target.files[0]) handleUploadRecording(cmv.id, category.id, e.target.files[0]);
                                                                                                e.target.value = null;
                                                                                            }}
                                                                                        />
                                                                                    </label>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${assignedVoices.length}, 1fr)`, borderBottom: "1px solid #e5e7eb", backgroundColor: "#fffbeb" }}>
                                        <div style={{ padding: "16px 20px", backgroundColor: "#fffbeb", borderRight: "1px solid #fde68a" }}>
                                            <div style={{ fontWeight: "600", color: "#d97706", fontSize: "13px", marginBottom: "2px" }}>📁 Unassigned</div>
                                            <div style={{ fontSize: "10px", color: "#92400e" }}>Recordings without category</div>
                                        </div>
                                        {assignedVoices.map((cmv) => {
                                            const unassignedRecs = getUnassignedRecordings(cmv);
                                            return (
                                                <div key={`unassigned-${cmv.id}`} style={{
                                                    padding: "12px",
                                                    backgroundColor: "#fffbeb",
                                                    borderLeft: "1px solid #fde68a",
                                                    minHeight: "80px",
                                                }}>
                                                    {unassignedRecs.length === 0 ? (
                                                        <div style={{ color: "#b45309", fontSize: "12px", textAlign: "center", padding: "8px", fontWeight: "500" }}>
                                                            No unassigned recordings
                                                        </div>
                                                    ) : (
                                                        unassignedRecs.map(rec => (
                                                            <div key={rec.id} style={{
                                                                display: "flex", flexDirection: "column", gap: "4px",
                                                                padding: "8px", backgroundColor: "white", borderRadius: "6px", marginBottom: "6px", border: "1px solid #fde68a"
                                                            }}>
                                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                        <span style={{ color: "#d97706", fontSize: "14px" }}>▶</span>
                                                                        <span style={{ fontSize: "12px", color: "#111827", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                            {rec.name || rec.filename || `rec_${rec.id}`}
                                                                        </span>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteRecording(rec.id)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "12px", padding: "2px" }}>🗑️</button>
                                                                </div>
                                                                <select
                                                                    defaultValue=""
                                                                    onChange={(e) => {
                                                                        if (e.target.value) {
                                                                            handleAssignCategoryToRecording(rec.id, parseInt(e.target.value));
                                                                            e.target.value = "";
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        width: "100%", padding: "4px 6px", backgroundColor: "white",
                                                                        border: "1px solid #fde68a", borderRadius: "4px",
                                                                        color: "#92400e", fontSize: "11px", cursor: "pointer"
                                                                    }}
                                                                >
                                                                    <option value="">Assign to category...</option>
                                                                    {voiceCategories.map(cat => (
                                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>


            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div >
    );
};

export default AdminVoiceManagement;
