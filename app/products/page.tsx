'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Plus, Search, Edit, Trash2, FolderOpen, Loader2, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import CategoryModal from './components/modals/CategoryModal';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import type { Category } from '@/lib/types/category';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useProductsContext } from '@/lib/context/ProductsContext';

export default function ProductsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canEditProducts } = usePermissions();
  const { products, loading, error, filters, setFilters, refetch } = useProductsContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [localError, setLocalError] = useState('');

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

  const handleDelete = async (id: string) => {
    try {
      if (!window.confirm(t('pages.products.deleteConfirm', 'Are you sure you want to delete this product?'))) return;
      await productsApi.delete(id);
      await refetch();
    } catch (deleteError) {
      setLocalError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product');
    }
  };

  const displayError = error || localError;

  return (
    <DashboardLayout>
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          fetchCategories();
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pages.products.title')}</h1>
            <p className="text-gray-600 text-sm">{t('pages.products.subtitle')}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {canEditProducts && (
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{t('pages.products.buttons.manageCategories')}</span>
                <span className="sm:hidden">{t('pages.products.buttons.categories')}</span>
              </button>
            )}
            <button
              onClick={() => router.push('/products/grid')}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 border border-gray-300 flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center transition-colors"
              title="View as Grid"
            >
              <LayoutGrid className="w-4 h-4" />
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

        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1 max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.products.search.placeholder')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[140px]"
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          >
            <option value="">{t('pages.products.filters.allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {displayError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {displayError}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.products.table.product')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  {t('pages.products.table.category')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  {t('pages.products.table.price')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  {t('pages.products.table.stock')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.products.table.status')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.products.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-6 py-10">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('common.loading')}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-6 py-10 text-center text-sm text-gray-500">
                    {t('pages.products.search.placeholder')}
                  </td>
                </tr>
              )}

              {!loading && products.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-lg mr-2 sm:mr-4 flex-shrink-0 overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none hover:text-blue-600 transition-colors cursor-pointer" onClick={() => router.push(`/products/details/${product.id}`)}>{product.name}</div>
                        <div className="text-xs text-gray-500 sm:hidden">ID: {product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                    {product.category || (categories.find(c => c.id === product.category_id)?.name || '—')}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                    <span className={product.stock === 0 ? 'text-red-600 font-semibold' : product.stock < 20 ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {t(`pages.products.status.${product.status}`, product.status)}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/products/details/${product.id}`)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      {canEditProducts && (
                        <>
                          <button
                            onClick={() => router.push(`/products/details/${product.id}/edit`)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
