'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  User, Mail, Phone, MapPin, Calendar, Link as LinkIcon,
  Edit2, Camera, Settings, Activity, ShoppingCart,
  Package, Boxes, BarChart3, Users, Tag, FileText,
  Shield, Bell, CalendarDays
} from 'lucide-react';
import { getAuthSession, setAuthSession } from '@/app/lib/auth';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '../components/LanguageProvider';

type ProfileForm = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
};

type ProfileMeta = Pick<ProfileForm, 'firstName' | 'lastName' | 'location' | 'bio'>;

const DEFAULT_BIO =
  'Passionate e-commerce enthusiast with over 5 years of experience in managing online stores.';
const DEFAULT_LOCATION = 'New York, USA';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
};

const profileMetaKeys = (params: {
  userId?: string | number | null;
  username?: string | null;
  email?: string | null;
}) => {
  const keys = new Set<string>();
  const push = (raw: unknown) => {
    if (typeof raw !== 'string' && typeof raw !== 'number') return;
    const normalized = String(raw).trim();
    if (!normalized) return;
    keys.add(`kk_profile_meta_${normalized}`);
    keys.add(`kk_profile_meta_${normalized.toLowerCase()}`);
  };

  push(params.userId);
  push(params.username);
  push(params.email);
  keys.add('kk_profile_meta_me');
  return Array.from(keys);
};

const readProfileMeta = (keys: string[]): Partial<ProfileMeta> => {
  if (typeof window === 'undefined') return {};

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<ProfileMeta>;
      return {
        firstName: pickString(parsed.firstName),
        lastName: pickString(parsed.lastName),
        location: pickString(parsed.location),
        bio: pickString(parsed.bio),
      };
    } catch {
      // Ignore invalid local profile metadata.
    }
  }

  return {};
};

const writeProfileMeta = (keys: string[], meta: ProfileMeta) => {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify(meta);
  keys.forEach((key) => {
    window.localStorage.setItem(key, payload);
  });
};

const ACTIVITY_KEY = 'kk_recent_activity';
const MAX_ACTIVITIES = 8;

interface ActivityEntry {
  path: string;
  label: string;
  icon: string;
  timestamp: string;
  type: 'navigation' | 'action';
}

const iconMap: Record<string, React.ElementType> = {
  'Home': User, 'Package': Package, 'ShoppingCart': ShoppingCart,
  'Boxes': Boxes, 'Users': Users, 'BarChart3': BarChart3,
  'Settings': Settings, 'User': User, 'Tag': Tag,
  'CreditCard': MapPin, 'Mail': Mail, 'MessageCircle': Activity,
  'FileText': FileText, 'Calendar': CalendarDays, 'Bell': Bell,
};

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const authUser = useAuthStore((state) => state.user);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);
  const [roleName, setRoleName] = useState('User');
  const [joinedDate, setJoinedDate] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityEntry[]>([]);
  const [sessionInfo] = useState({
    lastLogin: new Date().toLocaleDateString(),
    sessionActive: true,
  });

  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    location: DEFAULT_LOCATION,
    bio: DEFAULT_BIO,
  });

  const quickLinks = [
    {
      href: '/settings',
      icon: Settings,
      labelKey: 'pages.profile.quickLinks.settings',
      color: 'text-gray-600', bg: 'bg-gray-100'
    },
    {
      href: '/orders',
      icon: ShoppingCart,
      labelKey: 'pages.profile.quickLinks.orders',
      color: 'text-blue-600', bg: 'bg-blue-100'
    },
    {
      href: '/products',
      icon: Package,
      labelKey: 'pages.profile.quickLinks.products',
      color: 'text-green-600', bg: 'bg-green-100'
    },
    {
      href: '/inventory',
      icon: Boxes,
      labelKey: 'pages.profile.quickLinks.inventory',
      color: 'text-orange-600', bg: 'bg-orange-100'
    },
    {
      href: '/analytics',
      icon: BarChart3,
      labelKey: 'pages.profile.quickLinks.analytics',
      color: 'text-purple-600', bg: 'bg-purple-100'
    },
    {
      href: '/promotions',
      icon: Tag,
      labelKey: 'pages.profile.quickLinks.promotions',
      color: 'text-red-600', bg: 'bg-red-100'
    },
  ];

  const formatTimeAgo = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('common.justNow') || 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const logPageVisit = (path: string, label: string, icon: string) => {
    if (typeof window === 'undefined') return;
    const existing: ActivityEntry[] = JSON.parse(
      localStorage.getItem(ACTIVITY_KEY) || '[]'
    );
    const filtered = existing.filter(a => a.path !== path);
    const newEntry: ActivityEntry = {
      path, label, icon,
      timestamp: new Date().toISOString(),
      type: 'navigation'
    };
    const updated = [newEntry, ...filtered].slice(0, MAX_ACTIVITIES);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
    setRecentActivities(updated);
  };

  const displayName = useMemo(() => {
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    return fullName || form.username || 'User';
  }, [form.firstName, form.lastName, form.username]);

  const initials = useMemo(() => {
    const letters = displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
    return letters || 'U';
  }, [displayName]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        // Tracker la visite du profil
        logPageVisit('/profile', 'Profile', 'User');

        // Charger les activités récentes
        const raw = localStorage.getItem(ACTIVITY_KEY);
        if (raw) {
          setRecentActivities(JSON.parse(raw));
        }

        const session = getAuthSession();
        if (!session) {
          setError(t('common.sessionExpired'));
          return;
        }

        setRoleName(session.role || 'User');

        // Priorité avatar : authUser.avatar > session.user.avatar
        const initialAvatar = authUser?.avatar || authUser?.profile_image || session.user?.avatar;
        if (initialAvatar) setProfileImage(initialAvatar);

        const sessionUsername = session.user?.username ?? '';
        const sessionEmail = session.user?.email ?? '';
        const sessionFirstName = session.user?.firstName ?? '';
        const sessionLastName = session.user?.lastName ?? '';
        const sessionUserId = session.user?.id ?? null;

        let username = sessionUsername;
        let email = sessionEmail;
        let phone = '';
        let dateJoined = '';
        let resolvedId = sessionUserId;
        let resolvedRoleName = session.role || 'User';
        let apiFirstName = '';
        let apiLastName = '';
        let apiLocation = '';
        let apiBio = '';
        let apiAvatar = '';

        try {
          const me = await usersApi.getMe();
          const meRecord = toRecord(me);
          username = me.username || username;
          email = me.email || email;
          phone = me.phone || phone;
          dateJoined = me.date_joined || dateJoined;
          resolvedId = me.id ?? resolvedId;
          resolvedRoleName = me.role?.name || resolvedRoleName;
          apiFirstName = pickString(meRecord.first_name, meRecord.firstName);
          apiLastName = pickString(meRecord.last_name, meRecord.lastName);
          apiLocation = pickString(meRecord.location, meRecord.city);
          apiBio = pickString(meRecord.bio, meRecord.about, meRecord.description);
          apiAvatar = pickString(meRecord.avatar, meRecord.profile_image);

          const resolvedAvatar = authUser?.avatar || authUser?.profile_image
            || session?.user?.avatar || apiAvatar;
          if (resolvedAvatar) setProfileImage(resolvedAvatar);
        } catch {
          if (sessionUserId !== null && sessionUserId !== undefined) {
            try {
              const byId = await usersApi.getById(sessionUserId);
              const byIdRecord = toRecord(byId);
              username = byId.username || username;
              email = byId.email || email;
              phone = byId.phone || phone;
              dateJoined = byId.date_joined || dateJoined;
              resolvedId = byId.id;
              resolvedRoleName = byId.role?.name || resolvedRoleName;
              apiFirstName = pickString(byIdRecord.first_name, byIdRecord.firstName);
              apiLastName = pickString(byIdRecord.last_name, byIdRecord.lastName);
              apiLocation = pickString(byIdRecord.location, byIdRecord.city);
              apiBio = pickString(byIdRecord.bio, byIdRecord.about, byIdRecord.description);
              apiAvatar = pickString(byIdRecord.avatar, byIdRecord.profile_image);
              if (apiAvatar) setProfileImage(apiAvatar);
            } catch { }
          }
        }

        setCurrentUserId(resolvedId ?? null);
        setRoleName(resolvedRoleName);
        setJoinedDate(dateJoined);

        const metaKeys = profileMetaKeys({
          userId: resolvedId ?? sessionUserId,
          username,
          email,
        });
        const localMeta = readProfileMeta(metaKeys);

        setForm({
          firstName: pickString(apiFirstName, sessionFirstName, localMeta.firstName),
          lastName: pickString(apiLastName, sessionLastName, localMeta.lastName),
          username,
          email,
          phone,
          location: pickString(apiLocation, localMeta.location) || DEFAULT_LOCATION,
          bio: pickString(apiBio, localMeta.bio) || DEFAULT_BIO,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const basePayload = {
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };

      const extendedPayload = {
        ...basePayload,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
      };

      let resolvedUserId = currentUserId;
      const runWithFallbackPayload = async (
        request: (data: Record<string, string>) => Promise<unknown>
      ) => {
        try {
          await request(extendedPayload);
        } catch {
          await request(basePayload);
        }
      };

      try {
        await runWithFallbackPayload((data) => usersApi.updateMe(data));
      } catch (updateMeError) {
        if (resolvedUserId === null || resolvedUserId === undefined) {
          throw updateMeError;
        }
        await runWithFallbackPayload((data) => usersApi.update(resolvedUserId as string | number, data));
      }

      if (resolvedUserId === null || resolvedUserId === undefined) {
        try {
          const refreshedMe = await usersApi.getMe();
          resolvedUserId = refreshedMe.id ?? null;
          setCurrentUserId(refreshedMe.id ?? null);
        } catch {
          // Keep saving local session metadata even if this extra lookup fails.
        }
      }

      const activeSession = getAuthSession();
      if (activeSession) {
        setAuthSession({
          ...activeSession,
          user: {
            ...activeSession.user,
            id: activeSession.user?.id ?? resolvedUserId ?? undefined,
            username: basePayload.username,
            email: basePayload.email,
            firstName: form.firstName,
            lastName: form.lastName,
          },
        });
      }

      if (typeof window !== 'undefined') {
        const meta: ProfileMeta = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          location: form.location.trim(),
          bio: form.bio.trim(),
        };
        const saveKeys = profileMetaKeys({
          userId: resolvedUserId,
          username: basePayload.username,
          email: basePayload.email,
        });
        writeProfileMeta(saveKeys, meta);
      }

      setIsEditing(false);
      setSuccess(t('pages.profile.profileUpdated'));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('pages.profile.profileUpdateError') || 'Erreur lors de la mise a jour du profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setProfileImage(base64); // Preview immédiat

      try {
        await usersApi.uploadAvatar(file);
        const me = await usersApi.getMe();
        const meRecord = toRecord(me);
        const avatarUrl = pickString(meRecord.avatar, meRecord.profile_image);
        const finalAvatar = avatarUrl || base64;

        setProfileImage(finalAvatar);

        // Mettre à jour authStore (utilisé par Topbar)
        setAuthData({ user: { ...authUser, avatar: finalAvatar, profile_image: finalAvatar } as any });

        // Mettre à jour la session
        const session = getAuthSession();
        if (session) {
          setAuthSession({ ...session, user: { ...session.user, avatar: finalAvatar } });
        }

        // Notifier tous les composants
        window.dispatchEvent(new Event('kk_profile_updated'));
        setSuccess(t('pages.profile.avatarUpdated'));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('pages.profile.avatarError'));
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.profile.title')}</h1>
        <p className="text-gray-600">{t('pages.profile.subtitle')}</p>
      </motion.div>

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <motion.div
                    initial={{ scale: 0.8, rotate: -8, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
                    className="w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden"
                  >
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </motion.div>
                  <input
                    type="file"
                    id="profile-image-input"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => document.getElementById('profile-image-input')?.click()}
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </motion.button>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                <p className="text-gray-500 mb-4">{roleName}</p>

                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{form.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{form.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{form.location || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{joinedDate ? `${t('pages.profile.security.memberSince')} ${new Date(joinedDate).toLocaleDateString()}` : `${t('pages.profile.security.memberSince')} -`}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setIsEditing((prev) => !prev);
                  }}
                  className="w-full mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {isEditing ? t('pages.profile.cancelEdit') : t('pages.profile.editProfile')}
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                {t('pages.profile.security.title')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('pages.profile.security.sessionStatus')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {t('pages.profile.security.active')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('pages.profile.security.role')}
                  </span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {roleName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('pages.profile.security.memberSince')}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {joinedDate ? new Date(joinedDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => router.push('/settings')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t('pages.profile.security.manageSettings')} →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.profile.about')}</h3>
              <p className="text-gray-600 leading-relaxed">{form.bio || DEFAULT_BIO}</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.profile.recentActivity')}</h3>
                <motion.button
                  whileHover={{ x: 2 }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  onClick={() => router.push('/dashboard')}
                >
                  <Activity className="w-4 h-4" />
                  {t('pages.profile.viewAll')}
                </motion.button>
              </div>
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {t('pages.profile.noRecentActivity')}
                  </p>
                ) : (
                  recentActivities.map((activity, index) => {
                    const IconComp = iconMap[activity.icon] || Activity;
                    const timeAgo = formatTimeAgo(activity.timestamp);
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => router.push(activity.path)}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <IconComp className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{activity.label}</p>
                          <p className="text-xs text-gray-500">{activity.path}</p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>

            <AnimatePresence>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.profile.editProfile')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.firstName')}</label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.lastName')}</label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.username')}</label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => updateField('username', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.email')}</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.phone')}</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.location')}</label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.profile.personalInfo.bio')}</label>
                      <textarea
                        rows={4}
                        value={form.bio}
                        onChange={(e) => updateField('bio', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={isSaving}
                    >
                      {t('pages.profile.cancelEdit')}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isSaving ? t('pages.profile.saving') : t('pages.profile.saveChanges')}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.profile.quickLinks.title')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <motion.button
                      key={link.href}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push(link.href)}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 
                                 transition-colors flex flex-col items-center gap-2 
                                 border border-transparent hover:border-gray-200"
                    >
                      <div className={`p-2 rounded-full ${link.bg}`}>
                        <Icon className={`w-5 h-5 ${link.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 text-center">
                        {t(link.labelKey)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
