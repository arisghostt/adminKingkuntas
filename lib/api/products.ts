import { Product, ProductFormData, Category, ProductVariant } from '../types/product';
import { apiFetch } from '@/lib/api';

export const productsApi = {
    getAll: async (params?: { search?: string; category?: string; sort?: string; page?: number }): Promise<{ count: number; results: Product[] }> => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.category) searchParams.append('category', params.category);
        if (params?.sort) searchParams.append('sort', params.sort);
        if (params?.page) searchParams.append('page', params.page.toString());

        const queryString = searchParams.toString();
        const endpoint = `/api/products/${queryString ? `?${queryString}` : ''}`;

        const data = await apiFetch(endpoint);
        // Gérer à la fois une réponse paginée et liste simple selon DRF
        if (Array.isArray(data)) {
            return { count: data.length, results: data };
        }
        const resData = data as any;
        return {
            count: resData.count || 0,
            results: resData.results || []
        };
    },

    getById: async (id: string): Promise<Product> => {
        return apiFetch(`/api/products/${id}/`);
    },

    create: async (data: FormData): Promise<Product> => {
        return apiFetch('/api/products/', {
            method: 'POST',
            body: data,
        });
    },

    update: async (id: string, data: FormData): Promise<Product> => {
        return apiFetch(`/api/products/${id}/`, {
            method: 'PUT',
            body: data,
        });
    },

    delete: async (id: string): Promise<void> => {
        await apiFetch(`/api/products/${id}/`, { method: 'DELETE' });
    },

    uploadImage: async (file: File): Promise<{ image_url: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        return apiFetch('/api/products/upload-image/', {
            method: 'POST',
            body: formData,
        });
    },

    clearMainImage: async (id: string): Promise<void> => {
        await apiFetch(`/api/products/${id}/main-image/clear/`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    deleteGalleryImages: async (id: string, imageUrls: string[]): Promise<void> => {
        await apiFetch(`/api/products/${id}/gallery-images/delete/`, {
            method: 'POST',
            body: JSON.stringify({ image_urls: imageUrls })
        });
    },

    getVariants: async (productId: string): Promise<ProductVariant[]> => {
        const data = await apiFetch(`/api/products/${productId}/variants/`);
        const resData = data as any;
        // Gérer array fallback
        return Array.isArray(resData) ? resData : (resData.results || []);
    },

    createVariant: async (productId: string, data: Omit<ProductVariant, 'id'>): Promise<ProductVariant> => {
        return apiFetch(`/api/products/${productId}/variants/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateVariant: async (productId: string, variantId: string, data: Partial<ProductVariant>): Promise<ProductVariant> => {
        return apiFetch(`/api/products/${productId}/variants/${variantId}/`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteVariant: async (productId: string, variantId: string): Promise<void> => {
        await apiFetch(`/api/products/${productId}/variants/${variantId}/`, { method: 'DELETE' });
    }
};

export const categoriesApi = {
    getAll: async (): Promise<Category[]> => {
        const resData = (await apiFetch('/api/categories/')) as any;
        return Array.isArray(resData) ? resData : (resData.results || resData.data || []);
    },

    create: async (data: { name: string; description?: string }): Promise<Category> => {
        return apiFetch('/api/categories/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
};
