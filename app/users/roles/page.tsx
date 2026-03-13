'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from '@/app/components/layout/DashboardLayout';
import { apiFetch, rolesApi } from '@/lib/api';
import { usePermissions } from '@/app/hooks/usePermissions';
import { Loader2, Plus, Shield, Trash2, X } from 'lucide-react';

type RolePermission = {
  id: number;
  name: string;
  codename: string;
};

type Role = {
  id: number;
  name: string;
  permissions: RolePermission[];
  users_count: number;
};

const ROLE_ENDPOINT_CANDIDATES = ['/api/roles/', '/api/roles', '/api/admin/roles/', '/api/admin/roles'];
const PERMISSION_ENDPOINT_CANDIDATES = ['/api/permissions/', '/api/permissions', '/api/admin/permissions/', '/api/admin/permissions'];

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = toRecord(value);
  const candidates = ['results', 'data', 'items', 'roles', 'groups', 'users', 'permissions'];

  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizePermission = (value: unknown): RolePermission | null => {
  if (typeof value === 'number' || typeof value === 'string') {
    const id = toNumber(value);
    if (!id) return null;
    return {
      id,
      name: `permission_${id}`,
      codename: `permission_${id}`,
    };
  }

  const record = toRecord(value);
  const id = toNumber(record.id ?? record.permission_id);
  if (!id) return null;

  const codename =
    toText(record.codename) ||
    toText(record.code) ||
    toText(record.slug) ||
    `permission_${id}`;

  return {
    id,
    name: toText(record.name) || codename,
    codename,
  };
};

const toPermissionMap = (payload: unknown): Map<number, RolePermission> => {
  const mapped = new Map<number, RolePermission>();
  extractList(payload).forEach((entry) => {
    const permission = normalizePermission(entry);
    if (!permission) return;
    mapped.set(permission.id, permission);
  });
  return mapped;
};

const normalizeRoles = (value: unknown, permissionMap?: Map<number, RolePermission>): Role[] => {
  const rolesList = extractList(value);

  return rolesList
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const role = entry as {
        id?: unknown;
        group_id?: unknown;
        name?: unknown;
        group_name?: unknown;
        title?: unknown;
        permissions?: unknown;
        permission_ids?: unknown;
        users_count?: unknown;
        user_count?: unknown;
        users?: unknown;
      };

      const roleId = Number(role.id ?? role.group_id);
      if (!Number.isFinite(roleId)) return null;

      const permissionsRaw = Array.isArray(role.permissions)
        ? role.permissions
        : Array.isArray(role.permission_ids)
          ? role.permission_ids
          : [];

      const permissions = permissionsRaw
        .map((permission) => normalizePermission(permission))
        .filter((permission): permission is RolePermission => permission !== null)
        .map((permission) => {
          if (!permissionMap) return permission;
          return permissionMap.get(permission.id) ?? permission;
        });

      return {
        id: roleId,
        name:
          (typeof role.name === 'string' && role.name.trim()) ||
          (typeof role.group_name === 'string' && role.group_name.trim()) ||
          (typeof role.title === 'string' && role.title.trim()) ||
          'Sans nom',
        permissions,
        users_count: toNumber(
          role.users_count ??
          role.user_count ??
          (Array.isArray(role.users) ? role.users.length : 0)
        ),
      } satisfies Role;
    })
    .filter((entry): entry is Role => entry !== null);
};

const loadPermissionMap = async (): Promise<Map<number, RolePermission>> => {
  for (const endpoint of PERMISSION_ENDPOINT_CANDIDATES) {
    try {
      const payload = await apiFetch<unknown>(endpoint, { method: 'GET' });
      const mapped = toPermissionMap(payload);
      if (mapped.size > 0) return mapped;
    } catch {
      // Try next endpoint.
    }
  }

  return new Map<number, RolePermission>();
};

const loadRolesWithFallback = async (): Promise<Role[]> => {
  const permissionMap = await loadPermissionMap();
  const candidates: unknown[] = [];

  try {
    candidates.push(await rolesApi.getAll());
  } catch {
    // Fallback below.
  }

  for (const endpoint of ROLE_ENDPOINT_CANDIDATES) {
    try {
      const payload = await apiFetch<unknown>(endpoint, { method: 'GET' });
      candidates.push(payload);
    } catch {
      // Try next endpoint.
    }
  }

  let bestMatch: Role[] = [];
  let bestScore = -1;

  for (const payload of candidates) {
    const normalized = normalizeRoles(payload, permissionMap);
    const score =
      normalized.length * 10 +
      normalized.filter((role) => role.permissions.length > 0).length * 100;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = normalized;
    }
  }

  return bestMatch;
};

const USER_ENDPOINT_CANDIDATES = ['/api/users/', '/api/users', '/api/admin/users/', '/api/admin/users'];

type User = {
  id: number;
  role?: { id: number } | null;
};

const normalizeUsers = (value: unknown): User[] => {
  const list = extractList(value);
  return list
    .map((entry): User | null => {
      const record = toRecord(entry);
      const id = toNumber(record.id);
      if (!id) return null;
      const roleRecord = toRecord(record.role);
      const roleId = toNumber(roleRecord.id);
      return {
        id,
        role: roleId ? { id: roleId } : null,
      };
    })
    .filter((entry): entry is User => entry !== null);
};

const loadUsersWithFallback = async (): Promise<User[]> => {
  for (const endpoint of USER_ENDPOINT_CANDIDATES) {
    try {
      const payload = await apiFetch<unknown>(endpoint, { method: 'GET' });
      const normalized = normalizeUsers(payload);
      if (normalized.length > 0) return normalized;
    } catch {
      // Try next endpoint.
    }
  }
  return [];
};

export default function RolesPage() {
  const { isSuperAdmin, canManageRoles } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionsInfo, setPermissionsInfo] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const canEditRoles = isSuperAdmin || canManageRoles;

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionsInfo(null);

    try {
      const [normalizedRoles, users] = await Promise.all([
        loadRolesWithFallback(),
        loadUsersWithFallback(),
      ]);

      const userCountByRole = new Map<number, number>();
      users.forEach((user) => {
        if (user.role?.id) {
          userCountByRole.set(user.role.id, (userCountByRole.get(user.role.id) || 0) + 1);
        }
      });

      const rolesWithCount = normalizedRoles.map((role) => ({
        ...role,
        users_count: userCountByRole.get(role.id) || 0,
      }));

      setRoles(rolesWithCount);

      if (normalizedRoles.length > 0 && normalizedRoles.every((role) => role.permissions.length === 0)) {
        setPermissionsInfo(
          "Rôles chargés depuis Django, mais aucune permission n'a été renvoyée par l'API."
        );
      }
    } catch (err) {
      setRoles([]);
      setError(err instanceof Error ? err.message : 'Impossible de charger les rôles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditRoles) {
      setError("Action réservée à un administrateur ayant les droits de gestion des rôles.");
      return;
    }

    const name = newRoleName.trim();
    if (!name) {
      setError('Le nom du rôle est requis.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await rolesApi.create(name);
      setNewRoleName('');
      setShowCreateModal(false);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le rôle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!canEditRoles) {
      setError("Action réservée à un administrateur ayant les droits de gestion des rôles.");
      return;
    }

    const confirmed = window.confirm(`Supprimer le rôle "${role.name}" ?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      await rolesApi.delete(role.id);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer ce rôle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des rôles</h1>
            <p className="text-sm text-gray-500">
              Chaque rôle correspond à un groupe Django.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={!canEditRoles}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <Shield className="h-4 w-4" />
            Créer un rôle
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {permissionsInfo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {permissionsInfo}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Permissions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Utilisateurs
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && roles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      Aucun rôle trouvé.
                    </td>
                  </tr>
                )}

                {!loading &&
                  roles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {role.permissions.length === 0 ? (
                          <span className="text-gray-500">Aucune</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {role.permissions.slice(0, 2).map((permission) => (
                              <span
                                key={`${role.id}-${permission.id}`}
                                className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                              >
                                {permission.name}
                              </span>
                            ))}
                            {role.permissions.length > 2 && (
                              <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                                +{role.permissions.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{role.users_count}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteRole(role)}
                          disabled={!canEditRoles}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <Modal title="Créer un rôle" onClose={() => setShowCreateModal(false)}>
            <form className="space-y-3" onSubmit={handleCreateRole}>
              <input
                type="text"
                required
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="Nom du rôle"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
