import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitleUpdater = () => {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        let title = 'Nanomight AI';

        switch (path) {
            case '/':
                title = 'Login - Nanomight AI';
                break;
            case '/dashboard':
                title = 'Dashboard - Nanomight AI';
                break;
            case '/recordings':
                title = 'Recordings - Nanomight AI';
                break;
            case '/data-export':
                title = 'Data Export - Nanomight AI';
                break;
            case '/integration-form':
                title = 'Integration - Nanomight AI';
                break;
            case '/manage-team':
                title = 'Manage Team - Nanomight AI';
                break;
            case '/admin-dashboard':
                title = 'Admin Dashboard - Nanomight AI';
                break;
            case '/admin-data-export':
                title = 'Admin Data Export - Nanomight AI';
                break;
            case '/admin-landing':
                title = 'Admin Home - Nanomight AI';
                break;
            case '/admin-server-stats':
                title = 'Server Stats - Nanomight AI';
                break;
            case '/admin-campaigns':
                title = 'Campaigns - Nanomight AI';
                break;
            case '/admin-voice-stats':
                title = 'Voice Stats - Nanomight AI';
                break;
            case '/request-campaign':
                title = 'Request Campaign - Nanomight AI';
                break;
            default:
                title = 'Nanomight AI';
        }

        document.title = title;
    }, [location]);

    return null;
};

export default PageTitleUpdater;
