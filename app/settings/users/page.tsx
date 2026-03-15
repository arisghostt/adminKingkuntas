'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import DashboardLayout from '@/app/components/layout/DashboardLayout';
import RolePermissionsModal from '@/app/components/modals/RolePermissionsModal';
import { useLanguage } from '@/app/hooks/useLanguage';
import { getAuthSession } from '@/app/lib/auth';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useAuthStore } from '@/store/authStore';
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getPermissions,
  getRoles,
  getUsers,
  resetPassword,
  toggleRole,
  updateRole,
  updateUser,
  type AdminUser,
  type PermissionGroup,
  type RoleProfile,
} from '@/services/userRoleService';
import {
  CheckCircle2,
  Edit2,
  KeyRound,
  Loader2,
  Plus,
  Power,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ActiveTab = 'users' | 'roles';

type UserFormState = {
  username: string;
  phone: string;
  email: string;
  password: string;
  role_id: string;
  is_active: boolean;
};

type UserFieldErrors = Partial<
  Record<'username' | 'phone' | 'email' | 'password' | 'role_id' | 'global', string>
>;
type RoleFieldErrors = Partial<Record<'name' | 'description' | 'module_permissions' | 'global', string>>;

const createDefaultUserForm = (): UserFormState => ({
  username: '',
  phone: '',
  email: '',
  password: '',
  role_id: '',
  is_active: true,
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordStrength = (value: string): 'weak' | 'medium' | 'strong' => {
  if (value.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const score = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

  if (score >= 3 && value.length >= 10) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
};

const toDateLabel = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const toShortDateLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(parsed);
};

const getInitials = (value: string) => {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = tokens[0]?.charAt(0).toUpperCase() ?? '';
  const second = tokens[1]?.charAt(0).toUpperCase() ?? '';
  const fallback = value.trim().charAt(0).toUpperCase();
  return `${first}${second}` || fallback || '?';
};

const parseApiFieldErrors = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return {} as Record<string, string>;
  const record = payload as Record<string, unknown>;

  const errors: Record<string, string> = {};

  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value) && typeof value[0] === 'string') {
      errors[key] = value[0];
      return;
    }

    if (typeof value === 'string') {
      errors[key] = value;
    }
  });

  if (typeof record.detail === 'string') {
    errors.global = record.detail;
  }

  if (typeof record.message === 'string') {
    errors.global = record.message;
  }

  return errors;
};

const derivePermissionGroupsFromRoles = (rolesPayload: RoleProfile[]): PermissionGroup[] => {
  const grouped = new Map<string, Map<number, PermissionGroup['permissions'][number]>>();

  rolesPayload.forEach((role) => {
    role.permissions.forEach((permission) => {
      const source = permission.codename || permission.name || 'general';
      const keyPart = source.includes('_') ? source.split('_')[1] || 'general' : 'general';
      const groupName = keyPart
        .replace(/[_.-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase()) || 'General';

      const bucket = grouped.get(groupName) ?? new Map<number, PermissionGroup['permissions'][number]>();
      bucket.set(permission.id, permission);
      grouped.set(groupName, bucket);
    });
  });

  return [...grouped.entries()]
    .map(([group, permissionsMap]) => ({
      group,
      permissions: [...permissionsMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
};

export default function SettingsUsersPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const tx = useCallback(
    (key: string, fallback: string) => {
      const translated = t(key);
      return translated === key ? fallback : translated;
    },
    [t]
  );

  const { isSuperAdmin, canManageUsers, canManageRoles } = usePermissions();
  const hydrateFromSession = useAuthStore((state) => state.hydrateFromSession);
  const currentUser = useAuthStore((state) => state.user);

  const currentUserId = useMemo(() => {
    if (currentUser?.id !== undefined && currentUser?.id !== null) {
      return String(currentUser.id);
    }

    const sessionUserId = getAuthSession()?.user?.id;
    return sessionUserId !== undefined && sessionUserId !== null ? String(sessionUserId) : null;
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('users');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleProfile[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [permissionsLoadError, setPermissionsLoadError] = useState<string | null>(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(createDefaultUserForm);
  const [userFieldErrors, setUserFieldErrors] = useState<UserFieldErrors>({});
  const [userSubmitting, setUserSubmitting] = useState(false);

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleteUserSubmitting, setDeleteUserSubmitting] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<RoleProfile | null>(null);
  const [roleFieldErrors, setRoleFieldErrors] = useState<RoleFieldErrors>({});
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const [showDeleteRoleConfirm, setShowDeleteRoleConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleProfile | null>(null);
  const [deleteRoleSubmitting, setDeleteRoleSubmitting] = useState(false);

  useEffect(() => {
    hydrateFromSession();
  }, [hydrateFromSession]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'roles') {
      setActiveTab('roles');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const resolveErrorMessage = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          return t('pages.login.errorInvalidTokenRole');
        }
        if (status === 403) {
          return tx('common.forbidden', 'Access denied for this resource.');
        }

        const fieldErrors = parseApiFieldErrors(err.response?.data);
        if (fieldErrors.global) return fieldErrors.global;
      }

      if (err instanceof Error && err.message.trim()) return err.message;
      return tx('common.failed', 'Request failed');
    },
    [t, tx]
  );

  const reloadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionsLoadError(null);

    try {
      const [permissionsResult, rolesResult, usersResult] = await Promise.allSettled([
        getPermissions(),
        getRoles(),
        getUsers(),
      ]);
      const resolvedRoles =
        rolesResult.status === 'fulfilled' ? rolesResult.value : [];
      const resolvedUsers =
        usersResult.status === 'fulfilled' ? usersResult.value : [];

      setRoles(resolvedRoles);
      setUsers(resolvedUsers);

      const accessErrors: string[] = [];
      if (rolesResult.status === 'rejected') {
        accessErrors.push(tx('pages.settingsUsers.roles.fetchDenied', 'Roles access denied.'));
      }
      if (usersResult.status === 'rejected') {
        accessErrors.push(tx('pages.settingsUsers.users.fetchDenied', 'Users access denied.'));
      }
      if (accessErrors.length > 0) {
        setError(accessErrors.join(' '));
      }

      const derivedGroups = derivePermissionGroupsFromRoles(resolvedRoles);

      if (permissionsResult.status === 'fulfilled') {
        if (permissionsResult.value.length > 0) {
          setPermissionGroups(permissionsResult.value);
        } else {
          setPermissionGroups(derivedGroups);
          if (derivedGroups.length === 0) {
            setPermissionsLoadError(
              tx(
                'pages.settingsUsers.roles.permissionsEmpty',
                "Aucune permission disponible depuis l'API."
              )
            );
          }
        }
      } else {
        setPermissionGroups(derivedGroups);
        if (derivedGroups.length === 0) {
          setPermissionsLoadError(resolveErrorMessage(permissionsResult.reason));
        } else {
          setPermissionsLoadError(
            tx(
              'pages.settingsUsers.roles.permissionsFallback',
              'Les permissions détaillées ne sont pas accessibles. Données dérivées des rôles.'
            )
          );
        }
      }
    } catch (err) {
      setError(resolveErrorMessage(err));
      setPermissionGroups([]);
    } finally {
      setLoading(false);
    }
  }, [resolveErrorMessage, tx]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const activeUsers = users.filter((user) => user.is_active).length;
  const roleUsersCountById = useMemo(() => {
    const mapped = new Map<number, number>();

    users.forEach((user) => {
      const roleId = user.role?.id;
      if (typeof roleId !== 'number' || !Number.isInteger(roleId) || roleId <= 0) return;
      mapped.set(roleId, (mapped.get(roleId) ?? 0) + 1);
    });

    return mapped;
  }, [users]);

  const rolePermissionCountById = useMemo(() => {
    const mapped = new Map<number, number>();
    roles.forEach((role) => {
      mapped.set(role.id, role.permissions.length);
    });
    return mapped;
  }, [roles]);

  const permissionMetaById = useMemo(() => {
    const mapped = new Map<number, { codename: string; sourceId: number | null }>();

    permissionGroups.forEach((group) => {
      group.permissions.forEach((permission) => {
        mapped.set(permission.id, {
          codename: permission.codename,
          sourceId: typeof permission.source_id === 'number' ? permission.source_id : null,
        });
      });
    });

    return mapped;
  }, [permissionGroups]);

  const openCreateUserModal = () => {
    setUserModalMode('create');
    setEditingUser(null);
    setUserFieldErrors({});
    setUserForm(createDefaultUserForm());
    setShowUserModal(true);
  };

  const openEditUserModal = (user: AdminUser) => {
    setUserModalMode('edit');
    setEditingUser(user);
    setUserFieldErrors({});
    setUserForm({
      username: user.username,
      phone: user.phone,
      email: user.email,
      password: '',
      role_id: user.role?.id ? String(user.role.id) : '',
      is_active: user.is_active,
    });
    setShowUserModal(true);
  };

  const openResetPasswordModal = (user: AdminUser) => {
    setResetTarget(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordError(null);
    setShowResetPasswordModal(true);
  };

  const openDeleteUserModal = (user: AdminUser) => {
    setUserToDelete(user);
    setShowDeleteUserConfirm(true);
  };

  const openCreateRoleModal = () => {
    setRoleModalMode('create');
    setEditingRole(null);
    setRoleFieldErrors({});
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role: RoleProfile) => {
    setRoleModalMode('edit');
    setEditingRole(role);
    setRoleFieldErrors({});
    setShowRoleModal(true);
  };

  const openDeleteRoleModal = (role: RoleProfile) => {
    setRoleToDelete(role);
    setShowDeleteRoleConfirm(true);
  };

  const validateUserForm = () => {
    const validationErrors: UserFieldErrors = {};

    if (!userForm.username.trim()) {
      validationErrors.username = tx(
        'pages.settingsUsers.users.validation.usernameRequired',
        'Username is required.'
      );
    }

    if (!userForm.phone.trim()) {
      validationErrors.phone = tx(
        'pages.settingsUsers.users.validation.phoneRequired',
        'Phone is required.'
      );
    }

    if (!emailRegex.test(userForm.email.trim())) {
      validationErrors.email = tx('pages.settingsUsers.users.validation.emailInvalid', 'Please enter a valid email address.');
    }

    if (!userForm.role_id) {
      validationErrors.role_id = tx(
        'pages.settingsUsers.users.validation.roleRequired',
        'Role is required.'
      );
    }

    if (userModalMode === 'create' && userForm.password.length < 8) {
      validationErrors.password = tx('pages.settingsUsers.users.validation.passwordMin', 'Password must be at least 8 characters.');
    }

    if (userModalMode === 'edit' && userForm.password && userForm.password.length < 8) {
      validationErrors.password = tx('pages.settingsUsers.users.validation.passwordMin', 'Password must be at least 8 characters.');
    }

    setUserFieldErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageUsers && !isSuperAdmin) {
      setUserFieldErrors({
        global: tx('pages.settingsUsers.users.validation.noPermission', 'You do not have permission to manage users.'),
      });
      return;
    }

    if (!validateUserForm()) return;

    setUserSubmitting(true);
    setUserFieldErrors({});

    try {
      if (userModalMode === 'create') {
        await createUser({
          username: userForm.username.trim(),
          phone: userForm.phone.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role_id: userForm.role_id ? Number(userForm.role_id) : null,
          is_active: userForm.is_active,
        });

        setToast({
          type: 'success',
          message: tx('pages.settingsUsers.users.toast.created', 'User created successfully.'),
        });
      } else if (editingUser) {
        await updateUser(editingUser.id, {
          username: userForm.username.trim(),
          phone: userForm.phone.trim(),
          email: userForm.email.trim(),
          password: userForm.password ? userForm.password : undefined,
          role_id: userForm.role_id ? Number(userForm.role_id) : null,
          is_active: userForm.is_active,
        });

        setToast({
          type: 'success',
          message: tx('pages.settingsUsers.users.toast.updated', 'User updated.'),
        });
      }

      setShowUserModal(false);
      setEditingUser(null);
      setUserForm(createDefaultUserForm());
      await reloadData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const fields = parseApiFieldErrors(err.response?.data);
        const mapped: UserFieldErrors = {
          username: fields.username,
          phone: fields.phone,
          email: fields.email,
          password: fields.password,
          role_id: fields.role_id,
          global: fields.global,
        };

        if (fields.email) {
          mapped.email = fields.email;
        }

        if (!mapped.global && err.response?.status === 409) {
          mapped.email = tx(
            'pages.settingsUsers.users.validation.emailExists',
            'This email is already in use.'
          );
        }

        if (!mapped.global && (mapped.email || mapped.username || mapped.phone)) {
          mapped.global = tx('pages.settingsUsers.users.validation.fixErrors', 'Please fix highlighted fields.');
        }

        setUserFieldErrors(mapped);
      } else {
        setUserFieldErrors({ global: resolveErrorMessage(err) });
      }
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: AdminUser, isActive: boolean) => {
    if (!canManageUsers && !isSuperAdmin) return;

    try {
      const updated = await updateUser(user.id, { is_active: isActive });
      setUsers((previous) => previous.map((entry) => (entry.id === user.id ? updated : entry)));
    } catch (err) {
      setToast({ type: 'error', message: resolveErrorMessage(err) });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleteUserSubmitting(true);
    try {
      await deleteUser(userToDelete.id);
      setShowDeleteUserConfirm(false);
      setUserToDelete(null);
      setToast({
        type: 'success',
        message: tx('pages.settingsUsers.users.toast.deleted', 'User deleted successfully.'),
      });
      await reloadData();
    } catch (err) {
      setToast({ type: 'error', message: resolveErrorMessage(err) });
    } finally {
      setDeleteUserSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetTarget) return;

    if (newPassword.length < 8) {
      setResetPasswordError(tx('pages.settingsUsers.users.validation.passwordMin', 'Password must be at least 8 characters.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetPasswordError(tx('pages.settingsUsers.users.validation.passwordMismatch', 'Passwords do not match.'));
      return;
    }

    setResetSubmitting(true);
    setResetPasswordError(null);

    try {
      await resetPassword(resetTarget.id, newPassword);
      setShowResetPasswordModal(false);
      setResetTarget(null);
      setToast({
        type: 'success',
        message: tx('pages.settingsUsers.users.toast.passwordReset', 'Password reset successfully.'),
      });
    } catch (err) {
      setResetPasswordError(resolveErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleSubmitRole = async (payload: {
    name: string;
    description?: string;
    module_permissions: any[];
  }) => {
    if (!payload.name.trim()) {
      setRoleFieldErrors({
        name: tx('pages.settingsUsers.roles.validation.nameRequired', 'Role name is required.'),
      });
      return;
    }

    if ((roleModalMode === 'create' || roleModalMode === 'edit') && !(isSuperAdmin || canManageRoles)) {
      setRoleFieldErrors({
        global: tx('pages.settingsUsers.roles.validation.noPermission', 'You do not have permission to manage roles.'),
      });
      return;
    }

    setRoleSubmitting(true);
    setRoleFieldErrors({});

    try {
      if (roleModalMode === 'create') {
        await createRole(payload);
        setToast({
          type: 'success',
          message: tx('pages.settingsUsers.roles.toast.created', 'Role created successfully.'),
        });
      } else if (editingRole) {
        await updateRole(editingRole.id, payload);
        setToast({
          type: 'success',
          message: tx('pages.settingsUsers.roles.toast.updated', 'Role updated successfully.'),
        });
      }

      setShowRoleModal(false);
      setEditingRole(null);
      await reloadData();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const fields = parseApiFieldErrors(err.response?.data);
        setRoleFieldErrors({
          name: fields.name,
          description: fields.description,
          module_permissions: fields.module_permissions ?? fields.permission_ids ?? fields.permissions,
          global: fields.global,
        });
      } else {
        setRoleFieldErrors({ global: resolveErrorMessage(err) });
      }
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleToggleRole = async (role: RoleProfile) => {
    if (!(isSuperAdmin || canManageRoles)) return;

    try {
      const updated = await toggleRole(role.id, !role.is_active);
      setRoles((previous) => previous.map((entry) => (entry.id === role.id ? updated : entry)));
      setToast({
        type: 'success',
        message: tx('pages.settingsUsers.roles.toast.toggled', 'Role status updated.'),
      });
    } catch (err) {
      setToast({ type: 'error', message: resolveErrorMessage(err) });
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setDeleteRoleSubmitting(true);
    try {
      await deleteRole(roleToDelete.id);
      setShowDeleteRoleConfirm(false);
      setRoleToDelete(null);
      setToast({
        type: 'success',
        message: tx('pages.settingsUsers.roles.toast.deleted', 'Role deleted successfully.'),
      });
      await reloadData();
    } catch (err) {
      setToast({ type: 'error', message: resolveErrorMessage(err) });
    } finally {
      setDeleteRoleSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tx('pages.settingsUsers.title', 'User Management')}
            </h1>
            <p className="text-sm text-gray-600">
              {tx('pages.settingsUsers.subtitle', 'Manage admin users and their roles')}
            </p>
          </div>

          {activeTab === 'users' && (isSuperAdmin || canManageUsers) ? (
            <button
              type="button"
              onClick={openCreateUserModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {tx('pages.settingsUsers.users.addUser', 'Add User')}
            </button>
          ) : null}

          {activeTab === 'roles' && (isSuperAdmin || canManageRoles) ? (
            <button
              type="button"
              onClick={openCreateRoleModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {tx('pages.settingsUsers.roles.createRole', 'Create Role')}
            </button>
          ) : null}
        </div>

        <div className="flex w-fit rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === 'users' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tx('pages.settingsUsers.tabs.users', 'Users')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === 'roles' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tx('pages.settingsUsers.tabs.roles', 'Roles & Permissions')}
          </button>
        </div>
      </motion.div>

      {toast ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {permissionsLoadError ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {permissionsLoadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : null}

      {!loading && activeTab === 'users' ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-600">{tx('pages.settingsUsers.users.stats.total', 'Total Users')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-600">{tx('pages.settingsUsers.users.stats.active', 'Active Users')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{activeUsers}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-600">{tx('pages.settingsUsers.users.stats.roles', 'Roles Defined')}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{roles.length}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {tx('pages.settingsUsers.users.table.username', 'Username')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {tx('pages.settingsUsers.users.table.contact', 'Contact')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {tx('pages.settingsUsers.users.table.role', 'Role')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {tx('pages.settingsUsers.users.table.status', 'Status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {tx('pages.settingsUsers.users.table.lastLogin', 'Last Login')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {tx('pages.settingsUsers.users.table.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => {
                    const isCurrentUser = currentUserId !== null && String(user.id) === currentUserId;
                    const canMutate = (isSuperAdmin || canManageUsers) && !isCurrentUser;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                              {getInitials(user.username)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.username || user.email}
                              </p>
                              {user.is_superuser ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                  {tx('pages.settingsUsers.users.superadmin', 'Superadmin')}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{user.email || '—'}</p>
                          <p className="text-xs text-gray-500">{user.phone || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {user.role?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={user.is_active}
                              disabled={user.is_superuser || !canMutate}
                              onChange={(event) => handleToggleUserStatus(user, event.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="peer h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-blue-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
                            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
                          </label>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {toDateLabel(user.last_login) ?? tx('pages.settingsUsers.users.never', 'Never')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => openEditUserModal(user)}
                              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title={tx('common.edit', 'Edit')}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => openResetPasswordModal(user)}
                              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title={tx('pages.settingsUsers.users.resetPassword', 'Reset password')}
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => openDeleteUserModal(user)}
                              className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title={tx('common.delete', 'Delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {!loading && activeTab === 'roles' ? (
        <>
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {tx('pages.settingsUsers.roles.title', 'Roles & Permissions')}
            </h2>
            <p className="text-sm text-gray-600">
              {tx('pages.settingsUsers.roles.subtitle', 'Define role scopes and assign permission sets for admin access.')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role, index) => {
              const assignedUsersCount = Math.max(role.users_count, roleUsersCountById.get(role.id) ?? 0);
              const canDelete = (isSuperAdmin || canManageRoles) && assignedUsersCount === 0;
              const rolePermissions = role.permissions.slice(0, 4);
              const remainingPermissions = Math.max(0, role.permissions.length - rolePermissions.length);

              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{role.name}</h3>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          role.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {role.is_active
                          ? tx('pages.settingsUsers.roles.active', 'Active')
                          : tx('pages.settingsUsers.roles.inactive', 'Inactive')}
                      </span>
                    </div>
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>

                  <p className="mb-3 text-sm text-gray-600">
                    {(role.description || tx('pages.settingsUsers.roles.noDescription', 'No description provided.')).slice(0, 80)}
                    {(role.description || '').length > 80 ? '…' : ''}
                  </p>

                  <p className="mb-3 text-sm text-gray-500">
                    {assignedUsersCount} {tx('pages.settingsUsers.roles.usersAssigned', 'users assigned')}
                  </p>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {rolePermissions.map((permission) => (
                      <span
                        key={permission.id}
                        className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                      >
                        {permission.name}
                      </span>
                    ))}
                    {remainingPermissions > 0 ? (
                      <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                        + {remainingPermissions} {tx('pages.settingsUsers.roles.more', 'more')}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditRoleModal(role)}
                      disabled={!(isSuperAdmin || canManageRoles)}
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {tx('pages.settingsUsers.roles.editPermissions', 'Edit Permissions')}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleRole(role)}
                      disabled={!(isSuperAdmin || canManageRoles)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        role.is_active
                          ? tx('pages.settingsUsers.roles.deactivate', 'Deactivate')
                          : tx('pages.settingsUsers.roles.activate', 'Activate')
                      }
                    >
                      <Power className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteRoleModal(role)}
                      disabled={!canDelete}
                      className="rounded-lg border border-gray-300 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        assignedUsersCount > 0
                          ? tx('pages.settingsUsers.roles.usersAssignedTooltip', `${assignedUsersCount} users assigned`)
                          : tx('common.delete', 'Delete')
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      ) : null}

      {showUserModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmitUser}
            className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {userModalMode === 'create'
                  ? tx('pages.settingsUsers.users.modal.createTitle', 'Create User')
                  : tx('pages.settingsUsers.users.modal.editTitle', 'Edit User')}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.username', 'Username')}
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {userFieldErrors.username ? <p className="mt-1 text-xs text-red-600">{userFieldErrors.username}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.phone', 'Phone')}
                </label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {userFieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{userFieldErrors.phone}</p> : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.email', 'Email')}
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {userFieldErrors.email ? <p className="mt-1 text-xs text-red-600">{userFieldErrors.email}</p> : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.password', 'Password')}
                  {userModalMode === 'edit'
                    ? ` (${tx('pages.settingsUsers.users.modal.passwordOptional', 'optional')})`
                    : ''}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {tx('pages.settingsUsers.users.modal.strength', 'Strength')}: {passwordStrength(userForm.password)}
                </p>
                {userFieldErrors.password ? <p className="mt-1 text-xs text-red-600">{userFieldErrors.password}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.role', 'Role')}
                </label>
                <select
                  value={userForm.role_id}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, role_id: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">{tx('pages.settingsUsers.users.modal.selectRole', 'Select role')}</option>
                  {roles
                    .filter((role) => role.is_active)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} ({rolePermissionCountById.get(role.id) ?? 0}{' '}
                        {tx('pages.settingsUsers.roles.permissions', 'permissions')})
                      </option>
                    ))}
                </select>
                {userFieldErrors.role_id ? <p className="mt-1 text-xs text-red-600">{userFieldErrors.role_id}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.status', 'Status')}
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={userForm.is_active}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {userForm.is_active
                    ? tx('pages.settingsUsers.users.active', 'Active')
                    : tx('pages.settingsUsers.users.inactive', 'Inactive')}
                </label>
              </div>
            </div>

            {userFieldErrors.global ? (
              <p className="px-6 pb-2 text-sm text-red-600">{userFieldErrors.global}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {tx('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={userSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {userSubmitting
                  ? tx('common.saving', 'Saving...')
                  : userModalMode === 'create'
                    ? tx('pages.settingsUsers.users.modal.createAction', 'Create User')
                    : tx('pages.settingsUsers.users.modal.saveAction', 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showResetPasswordModal && resetTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {tx('pages.settingsUsers.users.resetPassword', 'Reset Password')}
              </h3>
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.newPassword', 'New Password')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {tx('pages.settingsUsers.users.modal.strength', 'Strength')}: {passwordStrength(newPassword)}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {tx('pages.settingsUsers.users.modal.confirmPassword', 'Confirm Password')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {resetPasswordError ? <p className="text-sm text-red-600">{resetPasswordError}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {tx('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={resetSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {resetSubmitting
                  ? tx('common.saving', 'Saving...')
                  : tx('pages.settingsUsers.users.resetPasswordAction', 'Reset Password')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showDeleteUserConfirm && userToDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {tx('pages.settingsUsers.users.deleteConfirmTitle', 'Delete User')}
              </h3>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700">
              {tx('pages.settingsUsers.users.deleteConfirmBody', 'Are you sure you want to delete this user?')}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDeleteUserConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {tx('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={deleteUserSubmitting}
                onClick={handleDeleteUser}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {deleteUserSubmitting ? tx('common.deleting', 'Deleting...') : tx('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RolePermissionsModal
        isOpen={showRoleModal}
        mode={roleModalMode}
        role={editingRole}
        permissionGroups={permissionGroups}
        fieldErrors={roleFieldErrors}
        isSubmitting={roleSubmitting}
        onClose={() => {
          setShowRoleModal(false);
          setEditingRole(null);
          setRoleFieldErrors({});
        }}
        onSubmit={handleSubmitRole}
      />

      {showDeleteRoleConfirm && roleToDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {tx('pages.settingsUsers.roles.deleteConfirmTitle', 'Delete Role')}
              </h3>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700">
              {tx('pages.settingsUsers.roles.deleteConfirmBody', 'Are you sure you want to delete this role?')}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDeleteRoleConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {tx('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={deleteRoleSubmitting}
                onClick={handleDeleteRole}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {deleteRoleSubmitting ? tx('common.deleting', 'Deleting...') : tx('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
