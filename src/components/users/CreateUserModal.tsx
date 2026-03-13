import React, { useState, useMemo } from 'react';
import { useCreateUser } from '../../hooks/useUsers';
import { useRoles } from '../../hooks/useRoles';
import { CreateUserPayload } from '../../types/rbac';
import { PermissionMatrix } from '../roles/PermissionMatrix';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId?: number; // Pour le besoin de l'exemple, on peut le passer en dur ou via prop
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, tenantId = 1 }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        role_id: 0,
        is_active: true,
    });

    const [errorText, setErrorText] = useState('');

    const { data: roles = [], isLoading: isLoadingRoles } = useRoles();
    const { mutateAsync: createUser, isPending } = useCreateUser();

    // Role sélectionné pour afficher ses infos et permissions
    const selectedRole = useMemo(() => {
        return roles.find(r => r.id === formData.role_id) || null;
    }, [roles, formData.role_id]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, role_id: parseInt(e.target.value, 10) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorText('');

        if (!formData.username || !formData.email || !formData.password || formData.role_id === 0) {
            setErrorText('Veuillez remplir tous les champs obligatoires (.Username, Email, Mot de passe et Rôle).');
            return;
        }

        const payload: CreateUserPayload = {
            username: formData.username,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            password: formData.password,
            role_id: formData.role_id,
            tenant_id: tenantId,
            is_active: formData.is_active,
        };

        try {
            await createUser(payload);
            // Clean state
            setFormData({
                username: '', email: '', first_name: '', last_name: '', phone: '', password: '', role_id: 0, is_active: true
            });
            onClose();
        } catch (err: any) {
            setErrorText(err.message || 'Erreur lors de la création de l\'utilisateur.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">Ajouter un utilisateur</h2>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {errorText && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm font-medium">
                            {errorText}
                        </div>
                    )}

                    <form id="create-user-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                <input type="text" name="username" required value={formData.username} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                                <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 mt-4">
                            <input
                                id="is_active"
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                                Compte actif
                            </label>
                        </div>

                        <hr className="my-6 border-gray-200" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attribuer un rôle *</label>
                            {isLoadingRoles ? (
                                <p className="text-sm text-gray-500">Chargement des rôles...</p>
                            ) : (
                                <select
                                    name="role_id"
                                    value={formData.role_id}
                                    onChange={handleRoleChange}
                                    className="w-full md:w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value={0} disabled>-- Sélectionnez un rôle --</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {selectedRole && (
                            <div className="mt-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`w-4 h-4 rounded-full ${selectedRole.color}`}></span>
                                    <h3 className="font-semibold text-gray-800">{selectedRole.name}</h3>
                                    <span className="text-sm text-gray-500">{selectedRole.description}</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Aperçu des permissions (Lecture seule)</h4>
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
                        form="create-user-form"
                        className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        disabled={isPending}
                    >
                        {isPending ? 'Création...' : 'Créer l\'utilisateur'}
                    </button>
                </div>
            </div>
        </div>
    );
};
