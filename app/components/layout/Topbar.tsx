'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, Sun, Moon, ChevronDown, Check, Globe, ChevronRight, LogOut, Loader2, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme, Theme } from '../ThemeProvider';
import { useLanguage } from '../LanguageProvider';
import { clearAuthSession, getAuthSession } from '@/app/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getNotifications, type NotificationItem } from '@/services/notificationsService';

const themeOptions: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'theme.light', icon: Sun },
  { value: 'dark', labelKey: 'theme.dark', icon: Moon },
];

interface NotificationPreview {
  id: number;
  type: 'order' | 'payment' | 'product' | 'user' | 'system' | 'email' | 'alert' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const getNotificationIcon = (type: string, className: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    order: Bell, payment: Bell, product: Bell, user: Bell,
    system: Bell, email: Bell, alert: Bell, info: Bell
  };
  const Icon = icons[type] || Bell;
  return <Icon className={className} />;
};

const getNotificationColor = (type: string) => {
  const colors: Record<string, string> = {
    order: 'bg-blue-100 text-blue-600',
    payment: 'bg-green-100 text-green-600',
    product: 'bg-purple-100 text-purple-600',
    user: 'bg-yellow-100 text-yellow-600',
    system: 'bg-gray-100 text-gray-600',
    email: 'bg-indigo-100 text-indigo-600',
    alert: 'bg-red-100 text-red-600',
    info: 'bg-cyan-100 text-cyan-600'
  };
  return colors[type] || 'bg-gray-100 text-gray-600';
};

const toValidDate = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toRelativeTime = (value: string): string => {
  const parsed = toValidDate(value);
  if (!parsed) return '';

  const seconds = Math.max(1, Math.round((Date.now() - parsed.getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (seconds < 60) return rtf.format(-seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  return rtf.format(-days, 'day');
};

const toPreview = (notification: NotificationItem): NotificationPreview => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  time: toRelativeTime(notification.created_at),
  read: notification.read,
});

interface TopbarProps {
  canToggleSidebarCollapse?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export default function Topbar({
  canToggleSidebarCollapse = false,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}: TopbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();
  const clearAuthData = useAuthStore((state) => state.clearAuthData);
  const authUser = useAuthStore((state) => state.user);
  const authRoleName = useAuthStore((state) => state.role?.name);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userLabel, setUserLabel] = useState('Admin');
  const [userSubLabel, setUserSubLabel] = useState('admin@kingkunta.com');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);

  const currentTheme = themeOptions.find(t => t.value === theme) || themeOptions[0];
  const CurrentIcon = currentTheme.icon;

  const currentLanguage = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  useEffect(() => {
    const updateUserInfo = () => {
      const session = getAuthSession();
      const displayName =
        authUser?.first_name ||
        authUser?.username ||
        session?.user?.firstName ||
        session?.user?.username ||
        authRoleName ||
        session?.role ||
        'Admin';
      setUserLabel(displayName ? String(displayName) : 'Admin');
      setUserSubLabel(
        authUser?.email ||
        session?.user?.email ||
        `${authRoleName || session?.role || 'user'}@kingkunta.local`
      );
      setUserAvatar(
        authUser?.avatar ||
        authUser?.profile_image ||
        session?.user?.avatar ||
        null
      );
    };

    updateUserInfo();

    window.addEventListener('storage', updateUserInfo);
    window.addEventListener('kk_profile_updated', updateUserInfo);

    return () => {
      window.removeEventListener('storage', updateUserInfo);
      window.removeEventListener('kk_profile_updated', updateUserInfo);
    };
  }, [authRoleName, authUser]);

  useEffect(() => {
    let isCancelled = false;

    const loadNotifications = async () => {
      try {
        const payload = await getNotifications();
        if (!isCancelled) {
          setNotifications(payload.map(toPreview));
        }
      } catch {
        if (!isCancelled) {
          setNotifications([]);
        }
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 60000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notifications-dropdown')) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isNotificationsOpen]);

  const handleNotificationClick = () => {
    router.push('/notifications');
    setIsNotificationsOpen(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const session = getAuthSession();
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: session?.accessToken,
          refreshToken: session?.refreshToken,
        }),
      });
    } catch {
      // Local logout continues even if API logout fails.
    } finally {
      clearAuthSession();
      clearAuthData();
      router.replace('/login');
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="shadow-sm border-b" style={{ background: 'var(--topbar-bg)', borderColor: 'var(--border)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-4 gap-2 sm:gap-4">
        {/* Desktop Search - Only visible on desktop */}
        <div className="hidden sm:flex items-center flex-1">
          {canToggleSidebarCollapse && (
            <button
              type="button"
              onClick={onToggleSidebarCollapse}
              className="mr-2 p-2 rounded-lg border transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
              }}
              title={isSidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              aria-label={isSidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={t('common.search')}
              className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                background: 'var(--card-bg)'
              }}
            />
          </div>
        </div>

        {/* Right section - All actions aligned to right on mobile */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
              style={{
                color: 'var(--text-primary)',
                background: 'var(--hover-bg)',
                border: '1px solid var(--border)'
              }}
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#6366f1' }} />
              <span className="text-xs sm:text-sm font-medium hidden xs:inline">{currentLanguage?.flag} {currentLanguage?.nativeName}</span>
              <ChevronDown className={`w-3 sm:w-4 h-3 sm:h-4 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {isLanguageDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsLanguageDropdownOpen(false)}
                ></div>
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-20 overflow-y-auto max-h-60 scrollbar-thin"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--card-shadow)'
                  }}
                >
                  {supportedLanguages.map((lang) => {
                    const isActive = lang.code === language;

                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLanguageDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-opacity-50"
                        style={{
                          color: 'var(--text-primary)',
                          background: isActive ? 'var(--hover-bg)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--hover-bg)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{lang.flag}</span>
                          <div className="flex flex-col">
                            <span className="text-sm">{lang.nativeName}</span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lang.name}</span>
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4" style={{ color: '#6366f1' }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Theme Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
              style={{
                color: 'var(--text-primary)',
                background: 'var(--hover-bg)',
                border: '1px solid var(--border)'
              }}
            >
              <CurrentIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{
                color: theme === 'dark' ? '#fbbf24' : '#f59e0b'
              }} />
              <ChevronDown className={`w-3 sm:w-4 h-3 sm:h-4 transition-transform ${isThemeDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {isThemeDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsThemeDropdownOpen(false)}
                ></div>
                <div
                  className="absolute right-0 mt-2 w-28 rounded-lg shadow-lg z-20 overflow-hidden"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--card-shadow)'
                  }}
                >
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = option.value === theme;

                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTheme(option.value);
                          setIsThemeDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-opacity-50"
                        style={{
                          color: 'var(--text-primary)',
                          background: isActive ? 'var(--hover-bg)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--hover-bg)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4" style={{
                            color: option.value === 'dark' ? '#fbbf24' : '#f59e0b'
                          }} />
                        </div>
                        {isActive && <Check className="w-4 h-4" style={{ color: '#6366f1' }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Notifications with Badge and Dropdown */}
          <div className="relative notifications-dropdown">
            <button
              className="relative p-1.5 sm:p-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Bell className="w-4 sm:w-5 h-4 sm:h-5" />
              {/* Red badge with unread count */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] sm:text-xs text-white flex items-center justify-center font-medium px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Preview */}
            {isNotificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsNotificationsOpen(false)}
                ></div>
                <div
                  className="absolute right-0 mt-2 w-72 sm:w-80 rounded-lg shadow-lg z-20 overflow-hidden"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--card-shadow)'
                  }}
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {t('pages.notifications.title') || 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-64 sm:max-h-80 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className="px-4 py-3 border-b cursor-pointer transition-colors"
                        style={{
                          borderColor: 'var(--border)',
                          background: notification.read ? 'transparent' : 'var(--hover-bg)'
                        }}
                        onClick={handleNotificationClick}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = notification.read ? 'transparent' : 'var(--hover-bg)';
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type, "w-3 h-3 sm:w-4 sm:h-4")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs sm:text-sm font-medium truncate ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{notification.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        {t('pages.notifications.noNotifications')}
                      </div>
                    )}
                  </div>

                  {/* Footer - View All */}
                  <div
                    className="px-4 py-3 border-t flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border)', background: 'var(--hover-bg)' }}
                    onClick={handleNotificationClick}
                  >
                    <span className="text-xs sm:text-sm font-medium" style={{ color: '#6366f1' }}>
                      View all notifications
                    </span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: '#6366f1' }} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Info */}
          <div
            className="relative"
            onMouseEnter={() => setIsUserMenuOpen(true)}
            onMouseLeave={() => setIsUserMenuOpen(false)}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 px-2 py-1 rounded-lg cursor-pointer" style={{ background: 'transparent' }}>
              <div className="hidden sm:block text-right">
                <p className="text-xs sm:text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{userLabel}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{userSubLabel}</p>
              </div>
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden"
                style={{ background: userAvatar ? 'transparent' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                onClick={() => router.push('/profile')}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-44 rounded-lg shadow-lg z-30 overflow-hidden"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>{t('user.logout')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
