import axios from 'axios';
import { message } from '../../node_modules/antd/es/index';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response, config } = error;
    
    console.error('API Error:', {
      url: config?.url,
      method: config?.method,
      status: response?.status,
      data: response?.data,
    });
    
    if (response) {
      switch (response.status) {
        case 500:
          console.error('Server Error Details:', response.data);
          message.error('Server error occurred. Please try again later.');
          break;
        case 401:
          // ONLY redirect if already logged in
          if (localStorage.getItem('access_token')) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Forbidden:', response.data.message);
          break;
        case 404:
          console.error('Not Found:', response.data.message);
          break;
        default:
          console.error('Error:', response.data.message);
      }
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

export default api;