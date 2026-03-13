import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role, RolePayload } from '../types/rbac';

const API_BASE_URL = 'http://localhost:8000/api';

const fetchRoles = async (): Promise<Role[]> => {
    const response = await fetch(`${API_BASE_URL}/roles/`, { credentials: 'include' });
    if (!response.ok) {
        throw new Error('Erreur lors de la récupération des rôles');
    }
    return response.json();
};

const createRole = async (payload: RolePayload): Promise<Role> => {
    const response = await fetch(`${API_BASE_URL}/roles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la création du rôle');
    }
    return response.json();
};

const updateRole = async ({ id, payload }: { id: number; payload: RolePayload }): Promise<Role> => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la modification du rôle');
    }
    return response.json();
};

const deleteRole = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Erreur lors de la suppression du rôle');
    }
};

export const useRoles = () => {
    return useQuery({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });
};
