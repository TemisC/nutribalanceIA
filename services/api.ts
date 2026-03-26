import axios from 'axios';
import { User, BiometricData } from '../types';

const isProduction = import.meta.env.MODE === 'production';
const API_URL = isProduction
    ? (import.meta.env.VITE_API_URL || '/api')
    : 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 600000 // 10 minutes timeout for frontend requests
});

console.log(`[API] Configured Base URL: ${API_URL}`);
console.log(`[API] Environment: ${Boolean(isProduction) ? 'Production' : 'Development'}`);

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('nutrifit_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('[API] 401 Unauthorized detected. Token might be expired. Logging out.');
            localStorage.removeItem('nutrifit_token');
            // Force reload to trigger auth guards and redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authService = {
    register: async (userData: Partial<User>, autoLogin: boolean = true) => {
        const response = await api.post('/auth/register', userData);
        if (autoLogin && response.data.token) {
            localStorage.setItem('nutrifit_token', response.data.token);
        }
        return response.data;
    },

    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('nutrifit_token', response.data.token);
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('nutrifit_token');
    }
};

export const userService = {
    getProfile: async (userId: string) => {
        const response = await api.get(`/users/${userId}`);
        return response.data.user;
    },

    updateBiometrics: async (userId: string, biometrics: Partial<BiometricData>) => {
        const response = await api.put(`/users/${userId}/biometrics`, biometrics);
        return response.data;
    },

    updateProfile: async (userId: string, userData: Partial<User>) => {
        const response = await api.put(`/users/${userId}`, userData);
        return response.data;
    },

    updateStatus: async (userId: string, status: 'active' | 'inactive') => {
        const response = await api.patch(`/users/${userId}/status`, { status });
        return response.data;
    },

    bulkUpdateStatus: async (coachId: string, status: 'active' | 'inactive') => {
        const response = await api.patch(`/users/coach/${coachId}/status`, { status });
        return response.data;
    },

    addTokens: async (userId: string, amount: number, reason?: string) => {
        const response = await api.post(`/users/${userId}/tokens`, { amount, reason });
        return response.data;
    },

    saveMetrics: async (userId: string, metrics: any) => {
        // We assume metrics object matches UserMetrics backend expectation roughly
        // or we map it. 
        const response = await api.post(`/users/${userId}/metrics`, metrics);
        return response.data;
    },

    getProgress: async (userId: string) => {
        const response = await api.get(`/users/${userId}/progress`);
        return response.data.logs;
    },

    logProgress: async (userId: string, data: { date: string, weight?: number, calories?: number, measurements?: any }) => {
        const response = await api.post(`/users/${userId}/progress`, data);
        return response.data;
    },

    getCoachClients: async (coachId: string) => {
        const response = await api.get(`/users/${coachId}/clients`);
        return response.data.users;
    },

    deleteUser: async (userId: string) => {
        const response = await api.delete(`/users/${userId}`);
        return response.data;
    },

    getAllUsers: async () => {
        const response = await api.get('/users');
        return response.data.users;
    },

    saveMealPlan: async (plan: any) => {
        const response = await api.post('/meal-plans', { plan });
        return response.data;
    },

    getMealPlans: async () => {
        const response = await api.get('/meal-plans');
        return response.data; // Expects array of plans
    },

    getCoachStats: async (coachId: string) => {
        const response = await api.get(`/users/${coachId}/coach-stats`);
        return response.data;
    },

    getCommunityStats: async () => {
        const response = await api.get('/users/community-stats');
        return response.data;
    },

    getSuperAdminAnalytics: async () => {
        const response = await api.get('/users/analytics');
        return response.data;
    }
};

export const messageService = {
    // Send a message
    sendMessage: async (senderId: string, receiverId: string, content: string, type: 'chat' | 'system' = 'chat') => {
        const response = await api.post('/messages', { senderId, receiverId, content, type });
        return response.data;
    },

    // Get Inbox
    getInbox: async (userId: string) => {
        const response = await api.get(`/messages/${userId}`);
        return response.data; // Returns array of messages with 'from', 'text', 'read'
    },

    // Mark Read
};

export const subscriptionService = {
    createRequest: async (userId: string, requestedRole: string, amount: number, coachId?: string) => {
        const response = await api.post('/subscriptions', { userId, requestedRole, amount, coachId });
        return response.data;
    },
    getPendingRequests: async () => {
        const response = await api.get('/subscriptions?status=pending');
        return response.data;
    },
    respondToRequest: async (id: number, status: 'approved' | 'rejected', adminNotes?: string) => {
        const response = await api.patch(`/subscriptions/${id}/status`, { status, adminNotes });
        return response.data;
    },
    // New Registration Flow
    getPendingRegistrations: async () => {
        const response = await api.get('/subscriptions/registrations');
        return response.data; // { users: [...] }
    },
    approveRegistration: async (userId: string, plan: 'pro' | 'pro_master') => {
        const response = await api.post('/subscriptions/approve-registration', { userId, plan });
        return response.data;
    }
};

export const communityService = {
    getFeed: async () => {
        const response = await api.get('/community');
        return response.data.posts;
    },
    createPost: async (content: string, type: string, image?: string) => {
        const response = await api.post('/community', { content, type, image });
        return response.data;
    },
    likePost: async (postId: string) => {
        const response = await api.post(`/community/${postId}/like`);
        return response.data;
    },
    addComment: async (postId: string, content: string) => {
        const response = await api.post(`/community/${postId}/comments`, { content });
        return response.data;
    },
    deletePost: async (postId: string) => {
        // Optional endpoint
        // const response = await api.delete(`/community/${postId}`);
        // return response.data;
    },
    updatePostStatus: async (postId: string, status: 'published' | 'rejected' | 'needs_edit') => {
        const response = await api.patch(`/community/${postId}/status`, { status });
        return response.data;
    }
};



export default api;
