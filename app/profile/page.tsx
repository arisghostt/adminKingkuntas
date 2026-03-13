'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { User, Mail, Phone, MapPin, Calendar, Link as LinkIcon, Edit2, Camera, Settings, Activity, ShoppingBag, CreditCard, Star } from 'lucide-react';
import { getAuthSession, setAuthSession } from '@/app/lib/auth';
import { usersApi } from '@/lib/api';

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

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);
  const [roleName, setRoleName] = useState('User');
  const [joinedDate, setJoinedDate] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    location: DEFAULT_LOCATION,
    bio: DEFAULT_BIO,
  });

  const userStats = [
    { label: 'Total Orders', value: '156', icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Total Spent', value: '$12,345', icon: CreditCard, color: 'bg-green-500' },
    { label: 'Points', value: '2,450', icon: Star, color: 'bg-yellow-500' },
    { label: 'Member Since', value: joinedDate ? new Date(joinedDate).getFullYear().toString() : '-', icon: Calendar, color: 'bg-purple-500' },
  ];

  const recentActivity = [
    { action: 'Profile synchronized with API', date: 'Now', type: 'update' },
    { action: 'Security session active (JWT)', date: 'Today', type: 'account' },
  ];

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

        const session = getAuthSession();
        if (!session) {
          setError('Session introuvable. Veuillez vous reconnecter.');
          return;
        }

        setRoleName(session.role || 'User');
        if (session.user?.avatar) setProfileImage(session.user.avatar);

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
          if (apiAvatar) setProfileImage(apiAvatar);
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
            } catch {}
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
      setSuccess('Informations personnelles mises a jour avec succes.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erreur lors de la mise a jour du profil.');
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

    try {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);

      await usersApi.uploadAvatar(file);
      
      const session = getAuthSession();
      if (session) {
        const me = await usersApi.getMe();
        const meRecord = toRecord(me);
        const avatarUrl = pickString(meRecord.avatar, meRecord.profile_image);
        
        setAuthSession({
          ...session,
          user: {
            ...session.user,
            avatar: avatarUrl,
          },
        });
        
        if (avatarUrl) setProfileImage(avatarUrl);
        window.dispatchEvent(new Event('kk_profile_updated'));
      }

      setSuccess('Photo de profil mise à jour avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload de l\'image.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your personal information and account details</p>
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
          <div className="lg:col-span-1">
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
                    <span>{form.email || '-'}</span>
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
                    <span>{joinedDate ? `Joined ${new Date(joinedDate).toLocaleDateString()}` : 'Joined -'}</span>
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
                  {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                {userStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + index * 0.05, duration: 0.22 }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      className="text-center p-4 bg-gray-50 rounded-lg"
                    >
                      <div className={`inline-flex p-2 rounded-full ${stat.color} mb-2`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
              <p className="text-gray-600 leading-relaxed">{form.bio || DEFAULT_BIO}</p>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <motion.button whileHover={{ x: 2 }} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  View All
                </motion.button>
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.24, delay: index * 0.06 }}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'update' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.date}</p>
                    </div>
                  </motion.div>
                ))}
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => updateField('username', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
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
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2">
                  <Settings className="w-6 h-6 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Settings</span>
                </motion.button>
                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">My Orders</span>
                </motion.button>
                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2">
                  <Star className="w-6 h-6 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Wishlist</span>
                </motion.button>
                <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex flex-col items-center gap-2">
                  <LinkIcon className="w-6 h-6 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Integrations</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
}
