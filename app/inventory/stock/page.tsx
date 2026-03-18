'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Package, AlertTriangle, Search, LayoutList, LayoutGrid, Loader2, ChevronDown, ChevronRight, Plus, Filter } from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import { useLanguage } from '../../hooks/useLanguage';
import type { Product } from '@/lib/types/product';
import type { Category } from '@/lib/types/category';
import { motion, AnimatePresence } from 'framer-motion';

// Helpers de statut stock
const getStockStatus = (current: number, min: number) => {
  if (current <= 0) return 'out';
  if (current <= (min || 10)) return 'low';
  return 'ok';
};

export default function InventoryStockPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'product' | 'category'>('product');
  
  // Filtres
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll()
      ]);
      setProducts(productsData.results);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to fetch stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                           (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter || product.category === categoryFilter;
      const status = getStockStatus(product.stock, product.min_stock);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    let total = 0;
    let low = 0;
    let out = 0;

    products.forEach(p => {
      total++;
      const status = getStockStatus(p.stock, p.min_stock);
      if (status === 'low') low++;
      if (status === 'out') out++;
    });

    return { total, low, out };
  }, [products]);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, { category: Category | { id: string, name: string }, products: Product[] }> = {};
    
    products.forEach(product => {
      const catId = product.category_id || product.category || 'uncategorized';
      if (!grouped[catId]) {
        const catInfo = categories.find(c => c.id === catId || c.name === catId) || { id: catId, name: catId === 'uncategorized' ? 'Uncategorized' : catId };
        grouped[catId] = { category: catInfo, products: [] };
      }
      grouped[catId].products.push(product);
    });

    return Object.values(grouped).filter(group => {
       if (categoryFilter !== 'all' && group.category.id !== categoryFilter && group.category.name !== categoryFilter) return false;
       return true;
    });
  }, [products, categories, categoryFilter]);

  const stockStatusConfig = {
    ok:  { label: t('pages.inventory.stock.inStock'),  classes: 'bg-green-100 text-green-700' },
    low: { label: t('pages.inventory.stock.lowStock'), classes: 'bg-orange-100 text-orange-700' },
    out: { label: t('pages.inventory.stock.outOfStock'),   classes: 'bg-red-100 text-red-700' },
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.failed')}</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={fetchData} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('common.refresh')}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pages.inventory.stock.title')}</h1>
          <p className="text-gray-500">{t('pages.inventory.stock.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/inventory/movements')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pages.dashboard.inventory.recentMovements')}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('pages.inventory.stock.totalProducts')}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('pages.inventory.stock.lowStock')}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.low}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('pages.inventory.stock.outOfStock')}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.out}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pages.inventory.stock.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-2 pl-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">{t('pages.inventory.stock.allCategories')}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 pl-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">{t('pages.inventory.stock.allStatus')}</option>
                <option value="ok">{t('pages.inventory.stock.inStock')}</option>
                <option value="low">{t('pages.inventory.stock.lowStock')}</option>
                <option value="out">{t('pages.inventory.stock.outOfStock')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('product')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'product' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span>{t('pages.inventory.stock.byProduct')}</span>
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'category' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t('pages.inventory.stock.byCategory')}</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">{t('common.loading')}</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'product' ? (
            <motion.div
              key="product-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.dashboard.inventory.product')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.inventory.alerts.category')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.billing.invoice.price')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.inventory.stock.currentStock')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.inventory.stock.minStock')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.inventory.alerts.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                          {t('pages.inventory.stock.noProducts')}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const status = getStockStatus(product.stock, product.min_stock);
                        const statusInfo = stockStatusConfig[status];
                        const stockPercent = Math.min(100, Math.max(0, (product.stock / (product.min_stock || 10)) * 50)); // Visual representation
                        
                        return (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex items-center gap-3">
                                {product.image ? (
                                  <img src={product.image} className="w-8 h-8 rounded object-cover" alt={product.name} />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                    <Package className="w-4 h-4 text-gray-400" />
                                  </div>
                                )}
                                <span className="truncate max-w-[200px]">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.sku || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {categories.find(c => c.id === product.category_id)?.name || product.category || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${product.price ? Number(product.price).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between w-24">
                                   <span>{product.stock}</span>
                                </div>
                                <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${status === 'out' ? 'bg-red-500' : status === 'low' ? 'bg-orange-500' : 'bg-green-500'}`}
                                    style={{ width: `${stockPercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.min_stock || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full items-center gap-1.5 ${statusInfo.classes}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status === 'out' ? 'bg-red-500' : status === 'low' ? 'bg-orange-500' : 'bg-green-500'}`} />
                                {statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="category-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {groupedByCategory.map((group) => {
                const totalStock = group.products.reduce((acc, p) => acc + p.stock, 0);
                const hasAlerts = group.products.some(p => getStockStatus(p.stock, p.min_stock) !== 'ok');
                
                return (
                  <div key={group.category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{group.category.name}</h3>
                        {hasAlerts && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                        {group.products.length} {t('pages.inventory.stock.categoryProducts')}
                      </span>
                    </div>
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                        <span className="text-sm font-medium text-gray-500">{t('pages.inventory.stock.categoryTotalStock')}</span>
                        <span className="text-lg font-bold text-gray-900">{totalStock}</span>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {group.products.map(product => {
                           const status = getStockStatus(product.stock, product.min_stock);
                           return (
                             <div key={product.id} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                               <div className="flex items-center gap-3">
                                  {product.image ? (
                                    <img src={product.image} className="w-8 h-8 rounded object-cover" alt="" />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                      <Package className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.sku}</p>
                                  </div>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className={`text-sm font-bold ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-orange-600' : 'text-gray-900'}`}>
                                    {product.stock}
                                  </span>
                                  <span className="text-[10px] text-gray-400 uppercase tracking-tighter">min: {product.min_stock}</span>
                               </div>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </DashboardLayout>
  );
}
