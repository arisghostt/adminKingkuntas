'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Package, Plus, Search, X } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../../hooks/useLanguage';
import {
  createStockMovement,
  getStockMovements,
  type StockMovement,
  type StockMovementsQueryParams,
} from '@/services/inventoryService';
import { productsApi } from '@/lib/api/products';

type MovementFilter = 'all' | 'in' | 'out';

interface StockMovementsTableProps {
  filter?: MovementFilter;
  limit?: number;
  showFilters?: boolean;
  showAddButton?: boolean;
  onFiltersChange?: (params: StockMovementsQueryParams) => void;
}

interface ProductOption {
  id: string;
  name: string;
}

const extractErrorDetail = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === 'string') {
    return record.non_field_errors[0];
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }

  return null;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US');
};

export default function StockMovementsTable({
  filter = 'all',
  limit,
  showFilters = false,
  showAddButton = true,
  onFiltersChange,
}: StockMovementsTableProps) {
  const { t } = useLanguage();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resolveErrorMessage = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          return t('pages.login.errorInvalidTokenRole');
        }

        const detail = extractErrorDetail(err.response?.data);
        if (detail) return detail;
      }

      if (err instanceof Error && err.message.trim().length > 0) {
        return err.message;
      }

      return t('common.failed');
    },
    [t]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch, categoryFilter, dateFrom, dateTo]);

  const queryParams = useMemo<StockMovementsQueryParams>(
    () => ({
      type: filter === 'all' ? undefined : filter,
      search: debouncedSearch || undefined,
      category: categoryFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
    }),
    [filter, debouncedSearch, categoryFilter, dateFrom, dateTo, page]
  );

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getStockMovements(queryParams);
      const tableData = typeof limit === 'number' && limit > 0 ? response.results.slice(0, limit) : response.results;
      setMovements(tableData);
      setTotal(response.total);
      setPageSize(response.page_size);

      setProductOptions((prev) => {
        const map = new Map<string, ProductOption>();
        for (const option of prev) map.set(option.id, option);
        for (const movement of response.results) {
          if (!movement.product_id || !movement.product_name) continue;
          map.set(movement.product_id, {
            id: movement.product_id,
            name: movement.product_name,
          });
        }
        return Array.from(map.values());
      });

      setCategoryOptions((prev) => {
        const set = new Set(prev);
        for (const movement of response.results) {
          if (movement.category) set.add(movement.category);
        }
        return Array.from(set);
      });
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
      setMovements([]);
      setTotal(0);
      setPageSize(0);
    } finally {
      setLoading(false);
    }
  }, [limit, queryParams, resolveErrorMessage]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    onFiltersChange?.(queryParams);
  }, [onFiltersChange, queryParams]);

  const categories = useMemo(
    () => categoryOptions,
    [categoryOptions]
  );

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const openAddModal = async () => {
    setProductQuery('');
    setSelectedProductId('');
    setMovementType('in');
    setQuantity(1);
    setReason('');
    setModalError('');
    setIsAddModalOpen(true);

    try {
      const data = await productsApi.getAll();
      setProductOptions(
        data.results.map((p) => ({ id: String(p.id), name: p.name }))
      );
    } catch {
      // productOptions reste peuplé depuis les mouvements déjà chargés
    }
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setModalError('');
  };

  const handleProductQueryChange = (value: string) => {
    setProductQuery(value);
    const trimmed = value.trim().toLowerCase();
    const match = productOptions.find(
      (option) =>
        option.name.toLowerCase() === trimmed ||
        option.id === value.trim() ||
        option.name.toLowerCase().startsWith(trimmed)
    );
    setSelectedProductId(match?.id ?? '');
  };

  const handleCreateMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let finalProductId = selectedProductId;
    if (!finalProductId && productQuery.trim()) {
      const match = productOptions.find(
        (option) =>
          option.name.toLowerCase() === productQuery.trim().toLowerCase() ||
          option.id === productQuery.trim()
      );
      if (match) finalProductId = match.id;
    }

    if (!finalProductId || quantity <= 0) {
      setModalError(
        t('pages.inventory.modals.validationMovement', {
          defaultValue: 'Product and quantity are required.',
        })
      );
      return;
    }

    setSubmitting(true);
    setModalError('');
    setError('');

    try {
      await createStockMovement({
        product_id: finalProductId,
        type: movementType,
        quantity: Math.trunc(quantity),
        reason: reason.trim() || 'Manual stock movement',
      });

      closeAddModal();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('stock-updated'));
      }
      await fetchMovements();
    } catch (createError) {
      if (axios.isAxiosError(createError) && createError.response?.status === 400) {
        setModalError(
          extractErrorDetail(createError.response?.data) ??
            t('pages.inventory.modals.insufficientStock', {
              defaultValue: 'Insufficient stock for this movement.',
            })
        );
      } else {
        setModalError(resolveErrorMessage(createError));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-800">
            {t('pages.dashboard.inventory.recentMovements')}
          </h3>
          {showAddButton ? (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('pages.inventory.alerts.addStock', { defaultValue: 'Add Movement' })}
            </button>
          ) : null}
        </div>

        {showFilters ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('common.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">{t('pages.inventory.alerts.category')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 text-sm text-red-600">{error}</div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.inventory.product')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.inventory.alerts.category')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.inventory.type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.inventory.quantity')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.billing.description', { defaultValue: 'Reason' })}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.inventory.date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.inventory.modals.stockAfter', { defaultValue: 'Stock After' })}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              : movements.map((movement, index) => (
                  <tr
                    key={
                      movement.id > 0
                        ? `movement-${movement.id}`
                        : `movement-${movement.product_id}-${movement.date}-${movement.type}-${index}`
                    }
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {movement.product_image ? (
                            <img
                              src={movement.product_image}
                              alt={movement.product_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {movement.product_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          movement.type === 'in'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {movement.type === 'in' ? (
                          <ArrowUp className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDown className="w-3 h-3 mr-1" />
                        )}
                        {movement.type === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={movement.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                        {movement.type === 'in' ? '+' : '-'}
                        {movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(movement.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.current_stock_after}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showFilters && !loading && totalPages > 1 ? (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          >
            {t('common.previousPage', { defaultValue: 'Previous' })}
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
          >
            {t('common.nextPage', { defaultValue: 'Next' })}
          </button>
        </div>
      ) : (
        <div className="px-6 py-4 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            {t('common.view')} {t('pages.dashboard.inventory.allMovements')}
          </button>
        </div>
      )}

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('pages.inventory.modals.addMovementTitle', {
                  defaultValue: 'Add Stock Movement',
                })}
              </h3>
              <button onClick={closeAddModal} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMovement} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.inventory.modals.product', { defaultValue: 'Product' })}
                </label>
                <input
                  list="movement-products"
                  value={productQuery}
                  onChange={(event) => handleProductQueryChange(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('pages.inventory.movements.byProduct')}
                />
                <datalist id="movement-products">
                  {productOptions.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.dashboard.inventory.type')}
                </label>
                <select
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value as 'in' | 'out')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.dashboard.inventory.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.billing.description', { defaultValue: 'Reason' })}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {modalError ? (
                <div className="text-sm text-red-600">{modalError}</div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
