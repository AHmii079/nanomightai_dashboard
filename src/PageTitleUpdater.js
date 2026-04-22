import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitleUpdater = () => {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        let title = 'xDial - Networks';

        switch (path) {
            case '/':
                title = 'Login - XDIAL Networks';
                break;
            case '/dashboard':
                title = 'Dashboard - XDIAL Networks';
                break;
            case '/client-landing':
                title = 'Landing Page - XDIAL Networks';
                break;
            case '/recordings':
                title = 'Recordings - XDIAL Networks';
                break;
            case '/data-export':
                title = 'Data Export - XDIAL Networks';
                break;
            case '/integration-form':
                title = 'Integration - XDIAL Networks';
                break;
            case '/manage-team':
                title = 'Manage Team - XDIAL Networks';
                break;
            case '/admin-dashboard':
                title = 'Admin Dashboard - XDIAL Networks';
                break;
            case '/admin-data-export':
                title = 'Admin Data Export - XDIAL Networks';
                break;
            case '/admin-landing':
                title = 'Admin Home - XDIAL Networks';
                break;
            case '/admin-server-stats':
                title = 'Server Stats - XDIAL Networks';
                break;
            case '/admin-campaigns':
                title = 'Campaigns - XDIAL Networks';
                break;
            case '/admin-voice-stats':
                title = 'Voice Stats - XDIAL Networks';
                break;
            case '/request-campaign':
                title = 'Request Campaign - XDIAL Networks';
                break;
            default:
                title = 'XDIAL Networks';
        }

        document.title = title;
    }, [location]);

    return null;
};

export default PageTitleUpdater;
