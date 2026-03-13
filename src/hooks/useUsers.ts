import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UserMe, PaginatedResponse, CreateUserPayload, AssignRolePayload } from '../types/rbac';

const API_BASE_URL = 'http://localhost:8000/api';

interface UsersFilters {
    role?: number;
    status?: string;
    search?: string;
    page?: number;
}

const buildQueryString = (filters?: UsersFilters) => {
    if (!filters) return '';
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

const fetchUsers = async (filters?: UsersFilters): Promise<PaginatedResponse<User>> => {
    const response = await fetch(`${API_BASE_URL}/users/${buildQueryString(filters)}`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
    return response.json();
};

const createUser = async (payload: CreateUserPayload): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Erreur lors de la création de l\'utilisateur');
    return response.json();
};

const assignRole = async ({ userId, payload }: { userId: number; payload: AssignRolePayload }): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/assign-role/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Erreur lors de l\'assignation du rôle');
};

const fetchCurrentUser = async (): Promise<UserMe> => {
    const response = await fetch(`${API_BASE_URL}/users/me/`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Erreur lors de la récupération du profil');
    return response.json();
};

export const useUsers = (filters?: UsersFilters) => {
    return useQuery({
        queryKey: ['users', filters],
        queryFn: () => fetchUsers(filters),
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};

export const useAssignRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: assignRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};

export const useCurrentUser = () => {
    return useQuery({
        queryKey: ['users', 'me'],
        queryFn: fetchCurrentUser,
        retry: 1, // Ne pas réessayer à l'infini si non authentifié
    });
};
