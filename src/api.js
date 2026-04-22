// api.js - Create this file in your src folder
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'https://api.xlitecore.xdialnetworks.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json',
  },
});

// Helper to check if a JWT is expired
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    const decoded = JSON.parse(decodedJson);
    const exp = decoded.exp;
    if (!exp) return false;
    // Check if current time is past expiration (add a small 1-minute buffer)
    return (Date.now() >= (exp * 1000) - 60000);
  } catch (e) {
    console.error('Error decoding token:', e);
    return true; // if we can't decode it, treat as expired to be safe
  }
};

// Request interceptor - automatically attaches token to all requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or sessionStorage
    const token = 
      localStorage.getItem('access_token');
    
    // If token exists, add it to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors globally
api.interceptors.response.use(
  (response) => {
    // If response is successful, just return it
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // 401 Unauthorized - check if token is actually expired
      if (error.response.status === 401) {
        const token = localStorage.getItem('access_token');
        if (isTokenExpired(token)) {
          console.error('Token expired, clearing session');
          // Clear stored tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
    
          // Redirect to login
          window.location.href = '/';
        } else {
          console.warn('Received 401 but token is still valid. Ignoring logout.');
        }
      }
      
      // 403 Forbidden
      if (error.response.status === 403) {
        console.error('Access denied');
        // Do NOT log the user out on 403. Let the individual components handle the UI feedback.
      }
      
      // 404 Not Found
      if (error.response.status === 404) {
        console.error('Resource not found');
      }
      
      // 500 Server Error
      if (error.response.status >= 500) {
        console.error('Server error occurred');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from server');
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;