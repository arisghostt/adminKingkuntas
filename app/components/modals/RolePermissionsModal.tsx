'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/hooks/useLanguage';
import type { PermissionGroup, RoleProfile } from '@/services/userRoleService';

interface RolePermissionsModalFieldErrors {
  name?: string;
  description?: string;
  permission_ids?: string;
  global?: string;
}

interface RolePermissionsModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  role?: RoleProfile | null;
  permissionGroups: PermissionGroup[];
  isSubmitting?: boolean;
  fieldErrors?: RolePermissionsModalFieldErrors;
  onClose: () => void;
  onSubmit: (payload: { name: string; description?: string; permission_ids: number[] }) => Promise<void> | void;
}

const getTranslation = (t: (key: string) => string, key: string, fallback: string) => {
  const translated = t(key);
  return translated === key ? fallback : translated;
};

export default function RolePermissionsModal({
  isOpen,
  mode,
  role,
  permissionGroups,
  isSubmitting = false,
  fieldErrors,
  onClose,
  onSubmit,
}: RolePermissionsModalProps) {
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setSelectedPermIds(new Set((role?.permissions ?? []).map((permission) => permission.id)));
    setSearch('');
    setExpandedGroups(permissionGroups.map((group) => group.group));
  }, [isOpen, role, permissionGroups]);

  const selectedCount = selectedPermIds.size;

  const filteredGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return permissionGroups;

    return permissionGroups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) => {
          const byName = permission.name.toLowerCase().includes(normalizedSearch);
          const byCode = permission.codename.toLowerCase().includes(normalizedSearch);
          return byName || byCode;
        }),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [permissionGroups, search]);

  const togglePermission = (permissionId: number) => {
    setSelectedPermIds((previous) => {
      const next = new Set(previous);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const toggleGroup = (groupName: string) => {
    const group = permissionGroups.find((entry) => entry.group === groupName);
    if (!group) return;

    const groupPermissionIds = group.permissions.map((permission) => permission.id);

    setSelectedPermIds((previous) => {
      const next = new Set(previous);
      const isAllSelected = groupPermissionIds.every((id) => next.has(id));

      if (isAllSelected) {
        groupPermissionIds.forEach((id) => next.delete(id));
      } else {
        groupPermissionIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const toggleExpand = (groupName: string) => {
    setExpandedGroups((previous) =>
      previous.includes(groupName)
        ? previous.filter((entry) => entry !== groupName)
        : [...previous, groupName]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      permission_ids: [...selectedPermIds],
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
      >
        <motion.form
          initial={{ opacity: 0, scale: 0.98, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 16 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="w-full max-w-6xl rounded-xl border border-gray-200 bg-white shadow-xl"
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
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              aria-label={getTranslation(t, 'common.close', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="mb-4 text-sm font-semibold text-gray-900">
                {getTranslation(t, 'pages.settingsUsers.roles.modal.roleInfo', 'Role Information')}
              </h4>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                {getTranslation(t, 'pages.settingsUsers.roles.modal.name', 'Role Name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder={getTranslation(t, 'pages.settingsUsers.roles.modal.namePlaceholder', 'Enter role name')}
              />
              {fieldErrors?.name ? <p className="mb-3 text-xs text-red-600">{fieldErrors.name}</p> : <div className="mb-3" />}

              <label className="mb-2 block text-sm font-medium text-gray-700">
                {getTranslation(t, 'pages.settingsUsers.roles.modal.description', 'Description')}
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder={getTranslation(
                  t,
                  'pages.settingsUsers.roles.modal.descriptionPlaceholder',
                  'Describe this role responsibilities'
                )}
              />
              {fieldErrors?.description ? <p className="mt-2 text-xs text-red-600">{fieldErrors.description}</p> : null}

              <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {selectedCount}{' '}
                {getTranslation(t, 'pages.settingsUsers.roles.modal.permissionsSelected', 'permissions selected')}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  {getTranslation(t, 'pages.settingsUsers.roles.modal.permissionBuilder', 'Permission Builder')}
                </h4>
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={getTranslation(t, 'pages.settingsUsers.roles.modal.search', 'Search permissions...')}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {fieldErrors?.permission_ids ? (
                <p className="mb-3 text-xs text-red-600">{fieldErrors.permission_ids}</p>
              ) : null}

              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {filteredGroups.map((group) => {
                  const selectedInGroup = group.permissions.filter((permission) => selectedPermIds.has(permission.id)).length;
                  const allSelected = group.permissions.length > 0 && selectedInGroup === group.permissions.length;
                  const partiallySelected = selectedInGroup > 0 && selectedInGroup < group.permissions.length;
                  const expanded = expandedGroups.includes(group.group);

                  return (
                    <div key={group.group} className="rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(node) => {
                              if (!node) return;
                              node.indeterminate = partiallySelected;
                            }}
                            onChange={() => toggleGroup(group.group)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{group.group}</span>
                          <span className="text-xs font-normal text-gray-500">
                            ({selectedInGroup}/{group.permissions.length})
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => toggleExpand(group.group)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100"
                          aria-label={getTranslation(t, 'common.expand', 'Expand')}
                        >
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>

                      {expanded ? (
                        <div className="divide-y divide-gray-100">
                          {group.permissions.map((permission) => {
                            const selected = selectedPermIds.has(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className={`flex cursor-pointer items-start gap-3 px-3 py-2 text-sm ${
                                  selected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                                }`}
                              >
                                <span className="mt-0.5 inline-flex">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => togglePermission(permission.id)}
                                    className="sr-only"
                                  />
                                  <span
                                    className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                                      selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                                    }`}
                                  >
                                    {selected ? <Check className="h-3 w-3" /> : null}
                                  </span>
                                </span>

                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-gray-900">{permission.name}</span>
                                  <span className="block text-xs text-gray-500">{permission.codename}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {filteredGroups.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                    {getTranslation(t, 'pages.settingsUsers.roles.modal.noPermissions', 'No permissions found for this search.')}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {fieldErrors?.global ? (
            <p className="px-6 pb-3 text-sm text-red-600">{fieldErrors.global}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {getTranslation(t, 'common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
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
