import React, { useState, useMemo, useEffect } from 'react';
import { useAssignRole } from '../../hooks/useUsers';
import { useRoles } from '../../hooks/useRoles';
import { User } from '../../types/rbac';
import { PermissionMatrix } from '../roles/PermissionMatrix';

interface AssignRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({ isOpen, onClose, user }) => {
    const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
    const [errorText, setErrorText] = useState('');

    const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
    const { mutateAsync: assignRole, isPending } = useAssignRole();

    useEffect(() => {
        if (isOpen && user) {
            setSelectedRoleId(user.role?.id || 0);
            setErrorText('');
        }
    }, [isOpen, user]);

    const selectedRole = useMemo(() => {
        return roles.find(r => r.id === selectedRoleId) || null;
    }, [roles, selectedRoleId]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText('');

        if (selectedRoleId === 0 || selectedRoleId === user.role?.id) {
            setErrorText('Veuillez sélectionner un nouveau rôle différent de l\'actuel.');
            return;
        }

        try {
            await assignRole({
                userId: user.id,
                payload: { role_id: selectedRoleId }
            });
            onClose();
        } catch (err: any) {
            setErrorText(err.message || 'Erreur lors de la réassignation du rôle.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Assigner un rôle</h2>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {errorText && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm font-medium">
                            {errorText}
                        </div>
                    )}

                    <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 text-blue-900 rounded-lg">
                        <div className="flex-1">
                            <p className="font-semibold">{user.first_name} {user.last_name} ({user.username})</p>
                            <p className="text-sm opacity-90">{user.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Rôle actuel</p>
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                {user.role?.name || 'Aucun'}
                            </div>
                        </div>
                    </div>

                    <form id="assign-role-form" onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Choisir le nouveau rôle :</label>
                            {isLoadingRoles ? (
                                <p className="text-sm text-gray-500">Chargement des rôles...</p>
                            ) : (
                                <select
                                    value={selectedRoleId}
                                    onChange={(e) => setSelectedRoleId(parseInt(e.target.value, 10))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value={0} disabled>-- Sélectionnez un rôle --</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedRole && (
                            <div className="mt-4">
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-yellow-700">
                                                Attention : Les permissions actuelles de l'utilisateur seront remplacées par celles du nouveau rôle.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Permissions du rôle "{selectedRole.name}"</h4>
                                    <PermissionMatrix
                                        permissions={selectedRole.module_permissions || []}
                                        readOnly={true}
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        disabled={isPending}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="assign-role-form"
                        className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        disabled={isPending || selectedRoleId === user.role?.id}
                    >
                        {isPending ? 'Assignation...' : 'Confirmer'}
                    </button>
                </div>
            </div>
        </div>
    );
};
