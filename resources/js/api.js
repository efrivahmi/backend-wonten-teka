import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    withCredentials: true, // Crucial for Sanctum cookie-based auth
});

// Request interceptor (Optional: if we fall back to Bearer tokens)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/web/login') {
                window.location.href = '/web/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
