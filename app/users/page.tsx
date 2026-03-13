'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from '@/app/components/layout/DashboardLayout';
import { useLanguage } from '@/app/hooks/useLanguage';
import { apiFetch, rolesApi, usersApi } from '@/lib/api';
import { usePermissions } from '@/app/hooks/usePermissions';
import { Edit2, Loader2, Plus, Shield, Trash2, X } from 'lucide-react';

type Role = {
  id: number;
  name: string;
};

type User = {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: Role | null;
  is_active: boolean;
  date_joined: string;
  last_login: string;
};

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

type CreateUserFormState = {
  username: string;
  email: string;
  phone: string;
  password: string;
  role_id: string;
};

const defaultCreateUserForm: CreateUserFormState = {
  username: '',
  email: '',
  phone: '',
  password: '',
  role_id: '',
};

const ROLE_ENDPOINT_CANDIDATES = ['/api/roles/', '/api/roles', '/api/admin/roles/', '/api/admin/roles'];
const USER_ENDPOINT_CANDIDATES = ['/api/users/', '/api/users', '/api/admin/users/', '/api/admin/users'];

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

const normalizeRole = (value: unknown): Role | null => {
  if (!value || typeof value !== 'object') return null;
  const role = value as {
    id?: unknown;
    group_id?: unknown;
    name?: unknown;
    group_name?: unknown;
    title?: unknown;
  };
  const roleId = Number(role.id ?? role.group_id);
  if (!Number.isFinite(roleId)) return null;
  return {
    id: roleId,
    name:
      (typeof role.name === 'string' && role.name.trim()) ||
      (typeof role.group_name === 'string' && role.group_name.trim()) ||
      (typeof role.title === 'string' && role.title.trim()) ||
      'Sans nom',
  };
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const extractList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = toRecord(value);
  const candidates = ['results', 'data', 'items', 'roles', 'groups', 'users'];

  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const normalizeRoles = (value: unknown): Role[] =>
  extractList(value)
    .map((entry) => normalizeRole(entry))
    .filter((entry): entry is Role => entry !== null);

const normalizeUsers = (value: unknown): User[] =>
  extractList(value)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const user = entry as {
        id?: unknown;
        username?: unknown;
        email?: unknown;
        phone?: unknown;
        role?: unknown;
        is_active?: unknown;
        date_joined?: unknown;
        last_login?: unknown;
      };

      if (user.id === undefined || user.id === null) return null;

      return {
        id: String(user.id),
        username: typeof user.username === 'string' ? user.username : '',
        email: typeof user.email === 'string' ? user.email : '',
        phone: typeof user.phone === 'string' ? user.phone : '',
        role: normalizeRole(user.role),
        is_active: Boolean(user.is_active),
        date_joined: typeof user.date_joined === 'string' ? user.date_joined : '',
        last_login: typeof user.last_login === 'string' ? user.last_login : '',
      } satisfies User;
    })
    .filter((entry): entry is User => entry !== null);

const loadRolesWithFallback = async (): Promise<Role[]> => {
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
  for (const payload of candidates) {
    const normalized = normalizeRoles(payload);
    if (normalized.length > bestMatch.length) {
      bestMatch = normalized;
    }
    if (normalized.length > 0) break;
  }

  return bestMatch;
};

const loadUsersWithFallback = async (params: {
  search?: string;
  role?: string;
  status?: string;
}): Promise<User[]> => {
  try {
    const initial = await usersApi.getAll(params);
    const normalized = normalizeUsers(initial);
    if (normalized.length > 0 || Object.keys(params).length > 0) return normalized;
  } catch {
    // Fallback below.
  }

  const candidates: unknown[] = [];
  for (const endpoint of USER_ENDPOINT_CANDIDATES) {
    try {
      const payload = await apiFetch<unknown>(endpoint, { method: 'GET' }, params);
      candidates.push(payload);
    } catch {
      // Try next endpoint.
    }
  }

  let bestMatch: User[] = [];
  for (const payload of candidates) {
    const normalized = normalizeUsers(payload);
    if (normalized.length > bestMatch.length) {
      bestMatch = normalized;
    }
    if (normalized.length > 0) break;
  }

  return bestMatch;
};

const formatDateFr = (value: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
};

export default function UsersPage() {
  const { t } = useLanguage();
  const { isSuperAdmin, canManageUsers, canManageRoles } = usePermissions();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);

  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>(defaultCreateUserForm);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const title = useMemo(() => {
    const translated = t('pages.users.title');
    return translated === 'pages.users.title' ? 'Gestion des utilisateurs' : translated;
  }, [t]);

  const canCreateUsers = isSuperAdmin || canManageUsers;
  const canEditUsers = isSuperAdmin || canManageUsers;
  const canCreateRoles = isSuperAdmin || canManageRoles;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: { search?: string; role?: string; status?: string } = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const [usersData, rolesData] = await Promise.all([
        loadUsersWithFallback(params),
        loadRolesWithFallback(),
      ]);

      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setUsers([]);
      setRoles([]);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchTerm, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openEditRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoleId(user.role ? String(user.role.id) : '');
    setShowEditRoleModal(true);
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateUsers) {
      setError("Action réservée à un administrateur ayant les droits de gestion des utilisateurs.");
      return;
    }

    if (!createUserForm.role_id) {
      setError('Veuillez sélectionner un rôle.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await usersApi.create({
        username: createUserForm.username.trim(),
        email: createUserForm.email.trim(),
        phone: createUserForm.phone.trim(),
        password: createUserForm.password,
        role_id: Number(createUserForm.role_id),
      });

      setCreateUserForm(defaultCreateUserForm);
      setShowCreateUserModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'utilisateur.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditUsers) {
      setError("Action réservée à un administrateur ayant les droits de gestion des utilisateurs.");
      return;
    }

    if (!selectedUser) return;
    if (!selectedRoleId) {
      setError('Veuillez sélectionner un rôle.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await usersApi.update(selectedUser.id, { role_id: Number(selectedRoleId) });
      setShowEditRoleModal(false);
      setSelectedUser(null);
      setSelectedRoleId('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de modifier le rôle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateRoles) {
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
      setShowCreateRoleModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le rôle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!canEditUsers) {
      setError("Action réservée à un administrateur ayant les droits de gestion des utilisateurs.");
      return;
    }

    const confirmed = window.confirm('Confirmer la suppression de cet utilisateur ?');
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      await usersApi.delete(userId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer l'utilisateur.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">
              Gérez les comptes, les rôles et les statuts en temps réel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateUserModal(true)}
              disabled={!canCreateUsers}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter utilisateur
            </button>
            <button
              type="button"
              onClick={() => setShowCreateRoleModal(true)}
              disabled={!canCreateRoles}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              Créer un rôle
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher par nom, email..."
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tous les rôles</option>
              {roles.map((role) => (
                <option key={role.id} value={String(role.id)}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date inscription
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}

                {!loading &&
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-4 align-top">
                        <div className="font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-700">
                        {user.role?.name ?? 'Aucun rôle'}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-gray-700">
                        {formatDateFr(user.date_joined)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditRoleModal(user)}
                              disabled={!canEditUsers}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                            <Edit2 className="h-3.5 w-3.5" />
                            Modifier rôle
                          </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteUser(user.id)}
                              disabled={!canEditUsers}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateUserModal && (
          <Modal title="Créer utilisateur" onClose={() => setShowCreateUserModal(false)}>
            <form className="space-y-3" onSubmit={handleCreateUser}>
              <input
                type="text"
                required
                value={createUserForm.username}
                onChange={(event) =>
                  setCreateUserForm((previous) => ({ ...previous, username: event.target.value }))
                }
                placeholder="Nom d'utilisateur"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                type="email"
                required
                value={createUserForm.email}
                onChange={(event) =>
                  setCreateUserForm((previous) => ({ ...previous, email: event.target.value }))
                }
                placeholder="Email"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                type="tel"
                required
                value={createUserForm.phone}
                onChange={(event) =>
                  setCreateUserForm((previous) => ({ ...previous, phone: event.target.value }))
                }
                placeholder="Téléphone"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                type="password"
                required
                value={createUserForm.password}
                onChange={(event) =>
                  setCreateUserForm((previous) => ({ ...previous, password: event.target.value }))
                }
                placeholder="Mot de passe"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <select
                required
                value={createUserForm.role_id}
                onChange={(event) =>
                  setCreateUserForm((previous) => ({ ...previous, role_id: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Sélectionner un rôle</option>
                {roles.map((role) => (
                  <option key={role.id} value={String(role.id)}>
                    {role.name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditRoleModal && selectedUser && (
          <Modal title="Modifier rôle" onClose={() => setShowEditRoleModal(false)}>
            <form className="space-y-3" onSubmit={handleUpdateRole}>
              <p className="text-sm text-gray-600">
                Changer le rôle de <span className="font-semibold">{selectedUser.username}</span>.
              </p>
              <select
                required
                value={selectedRoleId}
                onChange={(event) => setSelectedRoleId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Sélectionner un rôle</option>
                {roles.map((role) => (
                  <option key={role.id} value={String(role.id)}>
                    {role.name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateRoleModal && (
          <Modal title="Créer un rôle" onClose={() => setShowCreateRoleModal(false)}>
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
                  onClick={() => setShowCreateRoleModal(false)}
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
