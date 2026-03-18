'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Search, Edit, Trash2, Heart, Loader2, AlertTriangle, LayoutList, Plus } from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import type { Category } from '@/lib/types/category';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useLanguage } from '@/app/hooks/useLanguage';
import { useProductsContext } from '@/lib/context/ProductsContext';

const getStatusColor = (status: string, stock: number) => {
  if (stock === 0) return 'bg-red-100 text-red-800';
  return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

export default function ProductGridPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canEditProducts } = usePermissions();
  const { products, loading, error, filters, setFilters, refetch } = useProductsContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [localError, setLocalError] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (fetchError) {
      setLocalError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch categories');
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const handleUpdated = () => {
      fetchCategories();
      refetch();
    };
    const handleStockUpdate = () => refetch();

    window.addEventListener('categories-updated', handleUpdated);
    window.addEventListener('stock-updated', handleStockUpdate);
    return () => {
      window.removeEventListener('categories-updated', handleUpdated);
      window.removeEventListener('stock-updated', handleStockUpdate);
    };
  }, [fetchCategories, refetch]);

  const handleDelete = async (id: string) => {
    try {
      if (!window.confirm(t('pages.products.deleteConfirm', 'Are you sure you want to delete this product?'))) return;
      await productsApi.delete(id);
      await refetch();
    } catch (deleteError) {
      setLocalError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product');
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  const displayError = error || localError;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.products.grid.title')}</h1>
            <p className="text-gray-600">{t('pages.products.grid.subtitle')}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            <button
              onClick={() => router.push('/products')}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 border border-gray-300 flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center transition-colors"
              title="View as List"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            {canEditProducts && (
              <button
                onClick={() => router.push('/products/add')}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('pages.products.buttons.addProduct')}</span>
                <span className="sm:hidden">{t('pages.products.buttons.add')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.products.grid.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('pages.products.grid.allCategories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filters.sort || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('pages.products.grid.sortByPrice')}</option>
            <option value="price_asc">{t('pages.products.grid.priceLowToHigh')}</option>
            <option value="price_desc">{t('pages.products.grid.priceHighToLow')}</option>
          </select>
        </div>
        {displayError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {displayError}
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div
                className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden relative cursor-pointer"
                onClick={() => router.push(`/products/details/${product.id}`)}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-gray-400">Product Image</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-gray-500 truncate max-w-[50%]">{categories.find(c => c.id === product.category_id)?.name || product.category || '—'}</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status, product.stock)}`}>
                    {product.stock === 0 ? t('pages.products.grid.outOfStock') : t(`pages.products.status.${product.status}`, product.status)}
                  </span>
                </div>
                <h3
                  className="text-lg font-semibold text-gray-900 mb-2 truncate cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => router.push(`/products/details/${product.id}`)}
                >
                  {product.name}
                </h3>
                <div className="flex items-center mb-3">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.floor(product.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-500">({product.rating || 0})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-900">${Number(product.price).toFixed(2)}</span>
                  <span className={`text-sm font-medium ${product.stock < 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {product.stock === 0 ? t('pages.products.grid.outOfStock') : `${product.stock} ${t('pages.products.grid.inStock')}`}
                  </span>
                </div>
                <div className="mt-4 flex space-x-2">
                  {canEditProducts ? (
                    <button
                      onClick={() => router.push(`/products/details/${product.id}/edit`)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      {t('pages.products.grid.edit', 'Edit')}
                    </button>
                  ) : null}
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    <Heart className={`w-4 h-4 ${favorites[product.id] ? 'fill-current text-red-500' : ''}`} />
                  </button>
                  {canEditProducts && (
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-3 py-2 border border-red-300 rounded-lg hover:bg-red-50 text-red-600"
                      title={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </DashboardLayout>
  );
}
