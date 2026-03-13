import React, { useState, useEffect } from 'react';
import { useCreateRole, useUpdateRole } from '../../hooks/useRoles';
import { Role, RolePayload, ModulePermission } from '../../types/rbac';
import { PermissionMatrix } from './PermissionMatrix';

interface RoleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    roleToEdit?: Role | null; // Null ou undefined si mode création
    availableModules?: { id: number; name: string }[]; // Injecté depuis le parent ou défini en dur
}

const COLORS = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
];

// Valeur par défaut pour lancer la création si availableModules n'est pas fourni.
// En pratique le parent peut passer une liste exhaustive de modules.
const DEFAULT_MODULES = [
    { id: 1, name: 'Dashboard' },
    { id: 2, name: 'Products' },
    { id: 3, name: 'Orders' },
    { id: 4, name: 'Users' }
];

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, roleToEdit, availableModules = DEFAULT_MODULES }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [permissions, setPermissions] = useState<ModulePermission[]>([]);
    const [errorText, setErrorText] = useState('');

    const { mutateAsync: createRole, isPending: isCreating } = useCreateRole();
    const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();

    const isSubmitting = isCreating || isUpdating;

    useEffect(() => {
        if (isOpen) {
            if (roleToEdit) {
                setName(roleToEdit.name);
                setDescription(roleToEdit.description);
                setColor(roleToEdit.color);
                // On s'assure d'inclure tous les modules possibles lors de l'édition
                const mappedPerms = availableModules.map(mod => {
                    const existing = roleToEdit.module_permissions.find(p => p.module_id === mod.id);
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
            } else {
                setName('');
                setDescription('');
                setColor(COLORS[0]);
                setPermissions(availableModules.map(mod => ({
                    module_id: mod.id,
                    module_name: mod.name,
                    is_view: false,
                    is_add: false,
                    is_edit: false,
                    is_delete: false,
                })));
            }
            setErrorText('');
        }
    }, [isOpen, roleToEdit, availableModules]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText('');

        if (!name.trim()) {
            setErrorText('Le nom du rôle est obligatoire.');
            return;
        }

        const hasAtLeastOnePermission = permissions.some(
            p => p.is_view || p.is_add || p.is_edit || p.is_delete
        );

        if (!hasAtLeastOnePermission) {
            setErrorText('Veuillez attribuer au moins une permission au rôle.');
            return;
        }

        const payload: RolePayload = {
            name: name.trim(),
            description: description.trim(),
            color,
            module_permissions: permissions.map(p => ({
                module_id: p.module_id,
                is_view: p.is_view,
                is_add: p.is_add,
                is_edit: p.is_edit,
                is_delete: p.is_delete,
            }))
        };

        try {
            if (roleToEdit) {
                await updateRole({ id: roleToEdit.id, payload });
            } else {
                await createRole(payload);
            }
            onClose();
        } catch (err: any) {
            setErrorText(err.message || 'Une erreur est survenue lors de la sauvegarde.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {roleToEdit ? 'Modifier le rôle' : 'Créer un nouveau rôle'}
                    </h2>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {errorText && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm font-medium">
                            {errorText}
                        </div>
                    )}

                    <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du rôle *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="ex: Manager, Vendeur..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={`w-8 h-8 rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-blue-600 shadow-md' : 'opacity-80 hover:opacity-100 transition-opacity'}`}
                                            aria-label={`Sélectionner la couleur ${c}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Description du rôle"
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                            <PermissionMatrix
                                permissions={permissions}
                                onChange={setPermissions}
                            />
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="role-form"
                        className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Sauvegarde...
                            </>
                        ) : (
                            'Sauvegarder'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
