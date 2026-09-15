import { create } from 'zustand';
import { User } from '../../types';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

function getInitialUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      // ignore
    }
  }
  const token = localStorage.getItem('token');
  if (token && token.includes('.')) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return {
        id: payload.user_id || payload.id || '1',
        email: payload.email || '',
        role: (payload.role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      };
    } catch {
      return null;
    }
  }
  return null;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: getInitialUser(),
  login: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ token, user });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ token: null, user: null });
  },
}));
