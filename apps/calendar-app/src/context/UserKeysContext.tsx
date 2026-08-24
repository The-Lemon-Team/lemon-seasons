import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserKey, KeyProvider, KeyProviderMeta } from '@lenta/shared';
import { useAuth } from './AuthContext';

export const KEY_PROVIDERS: KeyProviderMeta[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Vault Sync',
    icon: '🟣',
    description: 'Интеграция и синхронизация с локальными хранилищами Obsidian Markdown',
    keyPrefix: 'lenta_obs_',
    available: true,
  },
  {
    id: 'telegram',
    name: 'Telegram Bot Sync',
    icon: '✈️',
    description: 'Получение уведомлений и быстрый ввод заметок через Telegram',
    keyPrefix: 'lenta_tg_',
    available: false,
  },
  {
    id: 'github',
    name: 'GitHub Repository',
    icon: '🐙',
    description: 'Синхронизация коммитов и публикаций с репозиториями GitHub',
    keyPrefix: 'lenta_gh_',
    available: false,
  },
  {
    id: 'api',
    name: 'REST API Access',
    icon: '🔑',
    description: 'Персональный токен для доступа к REST API приложения',
    keyPrefix: 'lenta_api_',
    available: false,
  },
];

const INITIAL_KEYS: UserKey[] = [
  {
    id: 'key-obsidian-demo-001',
    userId: 'usr-member-001',
    name: 'Obsidian Main Vault Laptop',
    provider: 'obsidian',
    key: 'lenta_obs_8f7b2c9a1d4e6f30a91b2c4d5e6f7a8b',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    isRevoked: false,
  },
];

const STORAGE_KEY = 'lemon_lenta_user_keys_v1';

interface UserKeysContextValue {
  keys: UserKey[];
  providers: KeyProviderMeta[];
  generateKey: (provider: KeyProvider, name: string) => UserKey;
  revokeKey: (keyId: string) => void;
  getKeysByProvider: (provider: KeyProvider) => UserKey[];
}

const UserKeysContext = createContext<UserKeysContextValue | undefined>(undefined);

export const UserKeysProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr-member-001';

  const [keys, setKeys] = useState<UserKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as UserKey[];
      }
    } catch {
      // ignore
    }
    return INITIAL_KEYS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // ignore
    }
  }, [keys]);

  const generateRandomToken = () => {
    const chars = 'abcdef0123456789';
    let res = '';
    for (let i = 0; i < 32; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const generateKey = (provider: KeyProvider, name: string): UserKey => {
    const meta = KEY_PROVIDERS.find((p) => p.id === provider) || KEY_PROVIDERS[0];
    const prefix = meta.keyPrefix;
    const secret = `${prefix}${generateRandomToken()}`;

    const newKey: UserKey = {
      id: `key-${provider}-${Date.now()}`,
      userId: currentUserId,
      name: name.trim() || `${meta.name} Key`,
      provider,
      key: secret,
      createdAt: new Date().toISOString(),
      isRevoked: false,
    };

    setKeys((prev) => [newKey, ...prev]);
    return newKey;
  };

  const revokeKey = (keyId: string) => {
    setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, isRevoked: true } : k)));
  };

  const getKeysByProvider = (provider: KeyProvider): UserKey[] => {
    return keys.filter((k) => k.provider === provider && k.userId === currentUserId && !k.isRevoked);
  };

  const activeUserKeys = keys.filter((k) => k.userId === currentUserId && !k.isRevoked);

  return (
    <UserKeysContext.Provider
      value={{
        keys: activeUserKeys,
        providers: KEY_PROVIDERS,
        generateKey,
        revokeKey,
        getKeysByProvider,
      }}
    >
      {children}
    </UserKeysContext.Provider>
  );
};

export const useUserKeys = (): UserKeysContextValue => {
  const context = useContext(UserKeysContext);
  if (!context) {
    throw new Error('useUserKeys must be used within a UserKeysProvider');
  }
  return context;
};
