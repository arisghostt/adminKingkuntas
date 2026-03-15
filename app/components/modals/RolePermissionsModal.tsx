'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/hooks/useLanguage';
import { PermissionMatrix } from '@/src/components/roles/PermissionMatrix';
import { useModules } from '@/app/hooks/useModules';
import type { RoleProfile } from '@/services/userRoleService';
import { ModulePermission } from '@/src/types/rbac';

interface RolePermissionsModalFieldErrors {
  name?: string;
  description?: string;
  module_permissions?: string;
  global?: string;
}

interface RolePermissionsModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  role?: RoleProfile | null;
  isSubmitting?: boolean;
  fieldErrors?: RolePermissionsModalFieldErrors;
  onClose: () => void;
  onSubmit: (payload: { 
    name: string; 
    description?: string; 
    module_permissions: any[] 
  }) => Promise<void> | void;
}

const getTranslation = (t: (key: string) => string, key: string, fallback: string) => {
  const translated = t(key);
  return translated === key ? fallback : translated;
};

export default function RolePermissionsModal({
  isOpen,
  mode,
  role,
  isSubmitting = false,
  fieldErrors,
  onClose,
  onSubmit,
}: RolePermissionsModalProps) {
  const { t } = useLanguage();
  const { modules, loading: loadingModules } = useModules();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);

  useEffect(() => {
    if (!isOpen || loadingModules) return;

    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    
    // Map modules to current permissions
    const mappedPerms = modules.map(mod => {
        // Try to find existing permission for this module
        // services/userRoleService.ts's RoleProfile has permissions as a flat list of Permission objects
        // But the backend now provides module_permissions
        const existing = (role as any)?.module_permissions?.find((p: any) => p.module_id === mod.id);
        
        return existing || {
            module_id: mod.id,
            module_name: mod.name,
            is_view: false,
            is_add: false,
            is_edit: false,
            is_delete: false,
        };
    });
    setPermissions(mappedPerms);
  }, [isOpen, role, modules, loadingModules]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Filter out modules with no permissions
    const activePermissions = permissions.filter(
        p => p.is_view || p.is_add || p.is_edit || p.is_delete
    );

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      module_permissions: activePermissions.map(p => ({
          module_id: p.module_id,
          is_view: p.is_view,
          is_add: p.is_add,
          is_edit: p.is_edit,
          is_delete: p.is_delete,
      })),
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 overflow-y-auto"
      >
        <motion.form
          initial={{ opacity: 0, scale: 0.98, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 16 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {mode === 'create'
                  ? getTranslation(t, 'pages.settingsUsers.roles.modal.createTitle', 'Create Role')
                  : getTranslation(t, 'pages.settingsUsers.roles.modal.editTitle', 'Edit Role')}
              </h3>
              <p className="text-sm text-gray-600">
                {getTranslation(
                  t,
                  'pages.settingsUsers.roles.modal.subtitle',
                  'Configure role details and assign permissions by module.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        {getTranslation(t, 'pages.settingsUsers.roles.modal.name', 'Role Name')}
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder={getTranslation(t, 'pages.settingsUsers.roles.modal.namePlaceholder', 'Enter role name')}
                        required
                    />
                    {fieldErrors?.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        {getTranslation(t, 'pages.settingsUsers.roles.modal.description', 'Description')}
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder={getTranslation(t, 'pages.settingsUsers.roles.modal.descriptionPlaceholder', 'Description')}
                    />
                    {fieldErrors?.description && <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>}
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">
                    {getTranslation(t, 'pages.settingsUsers.roles.modal.permissionBuilder', 'Permission Builder')}
                </h4>
                
                {loadingModules && permissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                        <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-gray-500 text-sm">Chargement des modules...</p>
                    </div>
                ) : (
                    <PermissionMatrix
                        permissions={permissions}
                        onChange={setPermissions}
                    />
                )}
                {fieldErrors?.module_permissions && <p className="text-xs text-red-600">{fieldErrors.module_permissions}</p>}
            </div>
          </div>

          {fieldErrors?.global && (
            <p className="px-6 pb-3 text-sm text-red-600">{fieldErrors.global}</p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {getTranslation(t, 'common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (loadingModules && permissions.length === 0)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting
                ? getTranslation(t, 'common.saving', 'Saving...')
                : mode === 'create'
                  ? getTranslation(t, 'pages.settingsUsers.roles.modal.createAction', 'Create Role')
                  : getTranslation(t, 'pages.settingsUsers.roles.modal.saveAction', 'Save Changes')}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
