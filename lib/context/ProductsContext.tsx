'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { productsApi } from '@/lib/api/products';
import type { Product } from '@/lib/types/product';

interface Filters {
    search: string;
    category: string;
    sort?: string;
}

interface ProductsContextType {
    products: Product[];
    loading: boolean;
    error: string | null;
    filters: Filters;
    setFilters: (filters: Filters | ((prev: Filters) => Filters)) => void;
    refetch: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({ search: '', category: '', sort: '' });

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await productsApi.getAll({
                search: filters.search,
                category: filters.category,
                sort: filters.sort,
            });
            setProducts(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [filters.search, filters.category, filters.sort]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return (
        <ProductsContext.Provider
            value={{
                products,
                loading,
                error,
                filters,
                setFilters,
                refetch: fetchProducts
            }}
        >
            {children}
        </ProductsContext.Provider>
    );
}

export function useProductsContext() {
    const context = useContext(ProductsContext);
    if (context === undefined) {
        throw new Error('useProductsContext must be used within a ProductsProvider');
    }
    return context;
}
