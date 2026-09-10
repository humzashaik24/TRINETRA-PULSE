import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  read: boolean;
  timestamp: string;
}

import type { AppLanguage } from '@/lib/i18n';

interface AppState {
  searchOpen: boolean;
  commandOpen: boolean;
  notificationsOpen: boolean;
  profileOpen: boolean;
  activeCaseId: string | null;
  contextLabel: string | null;
  language: AppLanguage;
  notifications: NotificationItem[];
  setSearchOpen: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setNotificationsOpen: (v: boolean) => void;
  setProfileOpen: (v: boolean) => void;
  setActiveCase: (id: string | null) => void;
  setContextLabel: (label: string | null) => void;
  setLanguage: (lang: AppLanguage) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: () => number;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      searchOpen: false,
      commandOpen: false,
      notificationsOpen: false,
      profileOpen: false,
      activeCaseId: null,
      contextLabel: null,
      language: 'en',
      notifications: [
        {
          id: '1',
          title: 'New entity match found',
          description: 'Rahul Kumar matches candidate in FIR-2026-089',
          read: false,
          timestamp: '5m ago',
        },
        {
          id: '2',
          title: 'Network analysis complete',
          description: 'Graph clustering finished for Case CR-2026-003',
          read: false,
          timestamp: '12m ago',
        },
        {
          id: '3',
          title: 'Evidence uploaded',
          description: '3 new documents added to Case CR-2026-001',
          read: true,
          timestamp: '1h ago',
        },
      ],
      setSearchOpen: (v) => set({ searchOpen: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      setNotificationsOpen: (v) => set({ notificationsOpen: v }),
      setProfileOpen: (v) => set({ profileOpen: v }),
      setActiveCase: (id) => set({ activeCaseId: id }),
      setContextLabel: (label) => set({ contextLabel: label }),
      setLanguage: (language) => set({ language }),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    { name: 'trinetra-app' }
  )
);
