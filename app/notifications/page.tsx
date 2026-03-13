'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useLanguage } from '../hooks/useLanguage';
import {
  Bell,
  Search,
  Check,
  CheckCheck,
  Trash2,
  User,
  ShoppingCart,
  CreditCard,
  Package,
  Settings,
  Mail,
  AlertTriangle,
  Info,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  deleteNotification,
  getNotifications,
  markNotificationAsRead,
  type NotificationItem,
} from '@/services/notificationsService';

const getTypeIcon = (type: string, className: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    order: ShoppingCart,
    payment: CreditCard,
    product: Package,
    user: User,
    system: Settings,
    email: Mail,
    alert: AlertTriangle,
    info: Info,
  };
  const Icon = icons[type] || Bell;
  return <Icon className={className} />;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    order: 'bg-blue-100 text-blue-600',
    payment: 'bg-green-100 text-green-600',
    product: 'bg-purple-100 text-purple-600',
    user: 'bg-yellow-100 text-yellow-600',
    system: 'bg-gray-100 text-gray-600',
    email: 'bg-indigo-100 text-indigo-600',
    alert: 'bg-red-100 text-red-600',
    info: 'bg-cyan-100 text-cyan-600',
  };
  return colors[type] || 'bg-gray-100 text-gray-600';
};

const getPriorityBadge = (priority: string, t: (key: string) => string) => {
  const badges: Record<string, { className: string; label: string }> = {
    high: { className: 'bg-red-100 text-red-700', label: t('common.high') },
    medium: { className: 'bg-yellow-100 text-yellow-700', label: t('common.medium') },
    low: { className: 'bg-green-100 text-green-700', label: t('common.low') },
  };

  const badge = badges[priority] ?? badges.medium;
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>{badge.label}</span>;
};

const toDate = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toRelativeTime = (value: string): string => {
  const parsed = toDate(value);
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

export default function NotificationsPage() {
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setError('');
    try {
      const payload = await getNotifications();
      setNotificationsList(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      setNotificationsList([]);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    };

    void bootstrap();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleMarkAsRead = async (id: number) => {
    setNotificationsList((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );

    try {
      await markNotificationAsRead(id);
    } catch {
      await loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notificationsList.filter((notification) => !notification.read).map((notification) => notification.id);
    if (unreadIds.length === 0) return;

    setNotificationsList((previous) => previous.map((notification) => ({ ...notification, read: true })));

    await Promise.allSettled(unreadIds.map((id) => markNotificationAsRead(id)));
    await loadNotifications();
  };

  const handleDelete = async (id: number) => {
    setNotificationsList((previous) => previous.filter((notification) => notification.id !== id));

    try {
      await deleteNotification(id);
    } catch {
      await loadNotifications();
    }
  };

  const handleClearAll = async () => {
    const ids = notificationsList.map((notification) => notification.id);
    if (ids.length === 0) return;

    setNotificationsList([]);
    await Promise.allSettled(ids.map((id) => deleteNotification(id)));
    await loadNotifications();
  };

  const filteredNotifications = useMemo(
    () =>
      notificationsList.filter((notification) => {
        const search = searchQuery.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          notification.title.toLowerCase().includes(search) ||
          notification.message.toLowerCase().includes(search);
        const matchesType = selectedType === 'all' || notification.type === selectedType;
        const matchesPriority = selectedPriority === 'all' || notification.priority === selectedPriority;
        const matchesUnread = !showUnreadOnly || !notification.read;

        return matchesSearch && matchesType && matchesPriority && matchesUnread;
      }),
    [notificationsList, searchQuery, selectedType, selectedPriority, showUnreadOnly]
  );

  const unreadCount = useMemo(
    () => notificationsList.filter((notification) => !notification.read).length,
    [notificationsList]
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.notifications.title')}</h1>
            <p className="text-gray-600">{t('pages.notifications.subtitle')}</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                {t('common.markAllRead')}
              </button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{notificationsList.length}</p>
              <p className="text-sm text-gray-500">{t('pages.notifications.summary.totalNotifications')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {notificationsList.filter((notification) => notification.priority === 'high').length}
              </p>
              <p className="text-sm text-gray-500">{t('pages.notifications.summary.highPriority')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Info className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
              <p className="text-sm text-gray-500">{t('pages.notifications.summary.unread')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{notificationsList.length - unreadCount}</p>
              <p className="text-sm text-gray-500">{t('pages.notifications.summary.read')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('pages.notifications.search.placeholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('pages.notifications.filters.allTypes')}</option>
            <option value="order">{t('pages.notifications.types.order')}</option>
            <option value="payment">{t('pages.notifications.types.payment')}</option>
            <option value="product">{t('pages.notifications.types.product')}</option>
            <option value="user">{t('pages.notifications.types.user')}</option>
            <option value="system">{t('pages.notifications.types.system')}</option>
            <option value="email">{t('pages.notifications.types.email')}</option>
            <option value="alert">{t('pages.notifications.types.alert')}</option>
            <option value="info">{t('pages.notifications.types.info')}</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(event) => setSelectedPriority(event.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('pages.notifications.filters.allPriority')}</option>
            <option value="high">{t('common.high')}</option>
            <option value="medium">{t('common.medium')}</option>
            <option value="low">{t('common.low')}</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(event) => setShowUnreadOnly(event.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('pages.notifications.filters.unreadOnly')}</span>
          </label>
          {notificationsList.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.clearAll')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                    {getTypeIcon(notification.type, 'w-5 h-5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        {getPriorityBadge(notification.priority, t)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{toRelativeTime(notification.created_at)}</span>
                        {!notification.read && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => void handleMarkAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        {t('pages.notifications.actions.markAsRead')}
                      </button>
                      <button
                        onClick={() => void handleDelete(notification.id)}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('pages.notifications.actions.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('pages.notifications.noNotifications')}</h3>
            <p className="text-gray-500">{t('common.noResults')}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {t('pages.notifications.showingNotifications', {
              count: filteredNotifications.length,
              total: notificationsList.length,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50" disabled>
              {t('common.previousPage')}
            </button>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100" disabled>
              {t('common.nextPage')}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
