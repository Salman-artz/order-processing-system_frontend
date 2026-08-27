import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;

// Mock functions
export const mockApi = {
  get: async (url: string) => {
    console.log(`Mock GET ${url}`);
    return { data: {} };
  },
  post: async (url: string, data: any) => {
    console.log(`Mock POST ${url}`, data);
    return { data: {} };
  },
  put: async (url: string, data: any) => {
    console.log(`Mock PUT ${url}`, data);
    return { data: {} };
  },
  delete: async (url: string) => {
    console.log(`Mock DELETE ${url}`);
    return { data: {} };
  },
};

export const api = useMock ? mockApi : apiClient;
