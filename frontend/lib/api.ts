const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    // Checking if we're on the client side before accessing localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');

      console.log('🔑 [api.ts] Request to:', config.url);
      console.log('🔑 [api.ts] Token exists:', !!token);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }  else {
        console.warn('⚠️ [api.ts] No token found');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// Response interceptor to handle 401 errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ [api.ts] Error:', {
      url: error.config?.url,
      status: error.response?.status,
      detail: error.response?.data?.detail
    });
    
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export { API_URL };
export default apiClient;