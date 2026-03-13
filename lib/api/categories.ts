import { Category, CategoryFormData } from '../types/category';
import { apiFetch } from '@/lib/api';

export const categoriesApi = {
    getAll: async (): Promise<Category[]> => {
        const data = await apiFetch<any>('/api/categories/');
        // Gestion de pagination DRF ou array simple
        return Array.isArray(data) ? data : (data.results || data.data || []);
    },

    getById: async (id: string): Promise<Category> => {
        return apiFetch(`/api/categories/${id}/`);
    },

    create: async (data: CategoryFormData): Promise<Category> => {
        return apiFetch('/api/categories/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: async (id: string, data: CategoryFormData): Promise<Category> => {
        return apiFetch(`/api/categories/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    patch: async (id: string, data: Partial<CategoryFormData>): Promise<Category> => {
        return apiFetch(`/api/categories/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: string): Promise<void> => {
        await apiFetch(`/api/categories/${id}/`, { method: 'DELETE' });
    }
};
