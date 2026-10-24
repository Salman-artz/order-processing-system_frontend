import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { User } from '@/types';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<{ token: string; user: User }> {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const isAdmin = credentials.email.includes('admin');
      const mockUser: User = {
        id: isAdmin ? "usr-admin-01" : "usr-cust-01",
        email: credentials.email,
        name: isAdmin ? "Operations Lead" : "Valued Customer",
        role: isAdmin ? "ADMIN" : "CUSTOMER",
      };
      const token = `mock-jwt-${isAdmin ? "admin" : "customer"}-token`;
      useAuthStore.getState().login(token, mockUser);
      return { token, user: mockUser };
    }

    const res = await api.post('/auth/login', {
      email: credentials.email,
      password: credentials.password || 'password123',
    });

    const token = res.data.token;
    let loggedUser: User = { id: '1', email: credentials.email, role: 'CUSTOMER' };

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      loggedUser = {
        id: payload.user_id,
        email: payload.email,
        role: (payload.role || "").toUpperCase() === "ADMIN" ? "ADMIN" : "CUSTOMER",
      };
    } catch {
      // fallback
    }

    useAuthStore.getState().login(token, loggedUser);
    return { token, user: loggedUser };
  }

  static logout(): void {
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('logged_out', 'true');
      window.location.href = '/login';
    }
  }

  static getCurrentUser(): User | null {
    return useAuthStore.getState().user;
  }
}
