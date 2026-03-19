import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role, RolePayload } from '../types/rbac';
import { apiClient } from '@/services/apiClient';

const fetchRoles = async (): Promise<Role[]> => {
    const response = await apiClient.get('/roles/');
    // apiClient returns response.data directly (due to interceptor)
    return response.data as Role[];
};

const createRole = async (payload: RolePayload): Promise<Role> => {
    const response = await apiClient.post('/roles/', payload);
    return response.data as Role;
};

const updateRole = async ({ id, payload }: { id: number; payload: RolePayload }): Promise<Role> => {
    const response = await apiClient.patch(`/roles/${id}/`, payload);
    return response.data as Role;
};

const deleteRole = async (id: number): Promise<void> => {
    await apiClient.delete(`/roles/${id}/`);
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
