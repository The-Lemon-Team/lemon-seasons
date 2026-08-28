import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthSession } from '@lenta/shared';

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => void;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const STORAGE_KEY = 'lemon_lenta_auth_session_v1';

const SYSTEM_USERS = {
  guest: {
    id: 'usr-guest-000',
    name: 'Гость (Guest)',
    email: 'guest@lemon.team',
    role: 'guest' as UserRole,
  },
  user: {
    id: 'usr-member-001',
    name: 'Пользователь (User)',
    email: 'user@lemon.team',
    role: 'user' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  admin: {
    id: 'usr-admin-999',
    name: 'Администратор (Admin)',
    email: 'admin@lemon.team',
    role: 'admin' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: '2025-11-01T08:00:00.000Z',
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as User;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const role: UserRole = user ? user.role : 'guest';
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === 'admin';

  const login = async (email: string, password?: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = (password || '').trim().toLowerCase();

    if (trimmedEmail.includes('admin') || trimmedPass === 'admin') {
      setUser(SYSTEM_USERS.admin);
    } else if (trimmedEmail.includes('guest') || trimmedPass === 'guest') {
      setUser(null);
    } else {
      setUser({
        id: SYSTEM_USERS.user.id,
        name: trimmedEmail === 'user@lemon.team' ? SYSTEM_USERS.user.name : (trimmedEmail.split('@')[0] || 'Пользователь'),
        email: trimmedEmail,
        role: 'user',
        avatar: SYSTEM_USERS.user.avatar,
        createdAt: new Date().toISOString(),
      });
    }
    setIsAuthModalOpen(false);
    return true;
  };

  const register = async (name: string, email: string, _password?: string): Promise<boolean> => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim() || 'Новый пользователь',
      email: email.trim().toLowerCase(),
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    setIsAuthModalOpen(false);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const switchDemoRole = (targetRole: UserRole) => {
    if (targetRole === 'guest') {
      setUser(null);
    } else if (targetRole === 'admin') {
      setUser(SYSTEM_USERS.admin);
    } else {
      setUser(SYSTEM_USERS.user);
    }
    setIsAuthModalOpen(false);
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        switchDemoRole,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
