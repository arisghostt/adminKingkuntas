import { apiClient } from './apiClient';

export type NotificationType =
  | 'order'
  | 'payment'
  | 'product'
  | 'user'
  | 'system'
  | 'email'
  | 'alert'
  | 'info';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  priority: NotificationPriority;
  created_at: string;
}

interface NotificationPayload {
  id?: number | string;
  type?: string;
  category?: string;
  title?: string;
  subject?: string;
  message?: string;
  body?: string;
  content?: string;
  read?: boolean;
  is_read?: boolean;
  priority?: string;
  created_at?: string;
  createdAt?: string;
  date?: string;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeType = (value: unknown): NotificationType => {
  const normalized = toText(value).toLowerCase();
  if (
    normalized === 'order' ||
    normalized === 'payment' ||
    normalized === 'product' ||
    normalized === 'user' ||
    normalized === 'system' ||
    normalized === 'email' ||
    normalized === 'alert'
  ) {
    return normalized;
  }
  return 'info';
};

const normalizePriority = (value: unknown): NotificationPriority => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
};

const normalizeDate = (value: unknown): string => {
  const text = toText(value);
  if (!text) return '';
  return text;
};

const normalizeNotification = (payload: NotificationPayload): NotificationItem => ({
  id: toNumber(payload.id),
  type: normalizeType(payload.type ?? payload.category),
  title: toText(payload.title ?? payload.subject) || 'Notification',
  message: toText(payload.message ?? payload.body ?? payload.content),
  read: Boolean(payload.read ?? payload.is_read),
  priority: normalizePriority(payload.priority),
  created_at: normalizeDate(payload.created_at ?? payload.createdAt ?? payload.date),
});

const extractList = (payload: unknown): NotificationPayload[] => {
  if (Array.isArray(payload)) return payload as NotificationPayload[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const candidates = ['results', 'items', 'notifications', 'data'];
  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as NotificationPayload[];
  }

  return [];
};

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await apiClient.get<unknown>('/api/notifications/');
  return extractList(response.data).map(normalizeNotification);
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await apiClient.patch(`/api/notifications/${id}/read/`, {});
};

export const deleteNotification = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/notifications/${id}/`);
};

