'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../hooks/useLanguage';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { AlertTriangle, Loader2, Package, X } from 'lucide-react';
import {
  getInventoryAlerts,
  restockProduct,
  type AlertsSummary,
  type LowStockItem,
} from '@/services/inventoryService';

const defaultSummary: AlertsSummary = {
  critical: 0,
  warning: 0,
  out_of_stock: 0,
};

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

export default function InventoryAlertsPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<AlertsSummary>(defaultSummary);
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'out_of_stock'>('all');
  const [loadingTable, setLoadingTable] = useState(true);
  const [error, setError] = useState('');
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LowStockItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [restockReason, setRestockReason] = useState('Manual Restock');
  const [restockError, setRestockError] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [restockedRows, setRestockedRows] = useState<Record<string, boolean>>({});
  const didInitialLoad = useRef(false);

  const resolveErrorMessage = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return t('pages.login.errorInvalidTokenRole');
        const detail = extractErrorDetail(err.response?.data);
        if (detail) return detail;
      }

      if (err instanceof Error && err.message.trim().length > 0) return err.message;
      return t('common.failed');
    },
    [t]
  );

  const loadInitialAlerts = useCallback(async () => {
    setLoadingTable(true);
    setError('');
    try {
      const data = await getInventoryAlerts();
      setSummary(data.summary);
      setItems(data.items);
      didInitialLoad.current = true;
    } catch (loadError) {
      setError(resolveErrorMessage(loadError));
      setItems([]);
    } finally {
      setLoadingTable(false);
    }
  }, [resolveErrorMessage]);

  const loadFilteredItems = useCallback(
    async (status: 'all' | 'critical' | 'warning' | 'out_of_stock') => {
      setLoadingTable(true);
      setError('');
      try {
        const data = await getInventoryAlerts(status === 'all' ? undefined : status);
        setItems(data.items);
      } catch (loadError) {
        setError(resolveErrorMessage(loadError));
        setItems([]);
      } finally {
        setLoadingTable(false);
      }
    },
    [resolveErrorMessage]
  );

  useEffect(() => {
    loadInitialAlerts();
  }, [loadInitialAlerts]);

  useEffect(() => {
    if (!didInitialLoad.current) return;
    loadFilteredItems(statusFilter);
  }, [statusFilter, loadFilteredItems]);

  const openRestockModal = (item: LowStockItem) => {
    setSelectedItem(item);
    setRestockQuantity(1);
    setRestockReason('Manual Restock');
    setRestockError('');
    setIsRestockModalOpen(true);
  };

  const closeRestockModal = () => {
    setIsRestockModalOpen(false);
    setSelectedItem(null);
    setRestockError('');
  };

  const handleRestockSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem || restockQuantity <= 0) {
      setRestockError(
        t('pages.inventory.modals.validationRestock', {
          defaultValue: 'Quantity is required.',
        })
      );
      return;
    }

    setRestocking(true);
    setRestockError('');
    setError('');
    try {
      await restockProduct(selectedItem.id, {
        quantity: Math.trunc(restockQuantity),
        reason: restockReason.trim() || 'Manual Restock',
      });
      closeRestockModal();

      const latest = await getInventoryAlerts();
      setSummary(latest.summary);
      if (statusFilter === 'all') {
        setItems(latest.items);
      } else {
        const filtered = await getInventoryAlerts(statusFilter);
        setItems(filtered.items);
      }

      setRestockedRows((prev) => ({ ...prev, [selectedItem.id]: true }));
      setTimeout(() => {
        setRestockedRows((prev) => {
          const next = { ...prev };
          delete next[selectedItem.id];
          return next;
        });
      }, 2000);
    } catch (restockErrorValue) {
      setRestockError(resolveErrorMessage(restockErrorValue));
    } finally {
      setRestocking(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pages.inventory.alerts.title')}</h1>
        <p className="text-gray-600 mt-1 text-sm">{t('pages.inventory.alerts.items')}</p>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-red-600">{t('pages.inventory.alerts.critical')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.critical}</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-yellow-600">{t('pages.inventory.alerts.warning')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.warning}</p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('pages.inventory.stats.outOfStock')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{summary.out_of_stock}</p>
            </div>
            <div className="p-2 sm:p-3 bg-gray-100 rounded-full">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            {t('pages.inventory.alerts.items')}
          </h3>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as 'all' | 'critical' | 'warning' | 'out_of_stock')
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{t('pages.inventory.alerts.filters.all', { defaultValue: 'All' })}</option>
            <option value="critical">{t('pages.inventory.alerts.critical')}</option>
            <option value="warning">{t('pages.inventory.alerts.warning')}</option>
            <option value="out_of_stock">{t('pages.inventory.stats.outOfStock')}</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.inventory.alerts.product')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  {t('pages.inventory.alerts.category')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.inventory.alerts.stock')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  {t('pages.inventory.alerts.status')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  {t('pages.inventory.alerts.lastRestocked')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.inventory.alerts.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingTable
                ? Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="h-10 w-40 rounded bg-gray-200 animate-pulse" />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                        <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                      </td>
                    </tr>
                  ))
                : items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="ml-2 sm:ml-4 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">
                              {item.product_name}
                            </div>
                            <div className="text-xs text-gray-500 sm:hidden">
                              {item.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {item.category}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {item.current_stock} / {item.min_stock}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : item.status === 'out_of_stock'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {item.status === 'critical' ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <Package className="w-3 h-3 mr-1" />
                          )}
                          {item.status === 'critical'
                            ? t('pages.inventory.alerts.critical')
                            : item.status === 'out_of_stock'
                              ? t('pages.inventory.stats.outOfStock')
                              : t('pages.inventory.alerts.warning')}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {item.last_restocked || '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {restockedRows[item.id] ? (
                          <span className="text-green-600 text-sm font-medium">
                            {t('pages.inventory.alerts.restocked', { defaultValue: 'Restocked!' })}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openRestockModal(item)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {t('common.add')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {isRestockModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.inventory.alerts.addStock')}</h3>
              <button onClick={closeRestockModal} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRestockSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.dashboard.inventory.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(event) => setRestockQuantity(Number(event.target.value || 1))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.billing.description')}
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(event) => setRestockReason(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {restockError ? (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {restockError}
                </div>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRestockModal}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={restocking}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {restocking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
