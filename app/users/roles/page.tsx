'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/components/layout/DashboardLayout';
import { usePermissions } from '@/app/hooks/usePermissions';
import { Loader2, Plus, Shield, Trash2, Edit2 } from 'lucide-react';
import { RoleFormModal } from '@/src/components/roles/RoleFormModal';
import { useModules } from '@/app/hooks/useModules';
import { useRoles, useDeleteRole } from '@/src/hooks/useRoles';
import { Role } from '@/src/types/rbac';

export default function RolesPage() {
  const { isSuperAdmin, canManageRoles } = usePermissions();
  const { data: roles, isLoading, error } = useRoles();
  const deleteRoleMutation = useDeleteRole();
  const { modules } = useModules();

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const canEditRoles = isSuperAdmin || canManageRoles;

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowModal(true);
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (!canEditRoles) return;
    if (window.confirm(`Supprimer le rôle "${roleName}" ?`)) {
      try {
        await deleteRoleMutation.mutateAsync(roleId);
      } catch (err: any) {
        alert(err.response?.data?.detail || err.message || 'Erreur lors de la suppression');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des rôles</h1>
            <p className="text-sm text-gray-500">
              Définissez les accès et permissions par module.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingRole(null);
              setShowModal(true);
            }}
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
            {error instanceof Error ? error.message : 'Une erreur est survenue'}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                      </span>
                    </td>
                  </tr>
                )}

                {!isLoading && (!roles || roles.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      Aucun rôle trouvé.
                    </td>
                  </tr>
                )}

                {!isLoading && roles &&
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{role.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {role.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {(!role.module_permissions || role.module_permissions.length === 0) ? (
                          <span className="text-gray-400">Aucune</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {role.module_permissions.slice(0, 3).map((mp) => (
                              <span
                                key={`${role.id}-${mp.module_id}`}
                                className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-100"
                              >
                                {mp.module_name || `Mod ${mp.module_id}`}
                              </span>
                            ))}
                            {role.module_permissions.length > 3 && (
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                +{role.module_permissions.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => handleEditRole(role)}
                                disabled={!canEditRoles}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Modifier
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDeleteRole(role.id, role.name)}
                                disabled={!canEditRoles}
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

      {showModal && (
        <RoleFormModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            availableModules={modules}
            roleToEdit={editingRole || undefined}
        />
      )}
    </DashboardLayout>
  );
}
