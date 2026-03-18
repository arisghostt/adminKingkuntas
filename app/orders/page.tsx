'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import DashboardLayout from "../components/layout/DashboardLayout";
import { Search, Eye, Edit, Package, AlertTriangle, Loader2, X } from 'lucide-react';
import { useLanguage } from "../hooks/useLanguage";
import { getOrders, type Order, type OrderStatus, updateOrderStatus } from '@/services/orderService';
import { usePermissions } from '@/app/hooks/usePermissions';
import PermissionRestricted from '@/app/components/PermissionRestricted';

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'shipped': return 'bg-blue-100 text-blue-800';
    case 'processing': return 'bg-yellow-100 text-yellow-800';
    case 'pending': return 'bg-orange-100 text-orange-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
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

export default function OrdersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canViewOrders, canEditOrders, isLoading: permLoading } = usePermissions();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending');

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

  const fetchOrders = useCallback(async () => {
    if (!canViewOrders) return;

    setLoading(true);
    setError('');
    try {
      const data = await getOrders({
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        date: dateFilter || undefined,
      });
      setOrders(data);
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [canViewOrders, debouncedSearch, statusFilter, dateFilter, resolveErrorMessage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openStatusModal = (order: Order) => {
    setEditingOrder(order);
    setNextStatus(order.status);
  };

  const closeStatusModal = () => {
    setEditingOrder(null);
  };

  const handleStatusUpdate = async () => {
    if (!editingOrder) return;
    setSavingStatus(true);
    setError('');
    try {
      await updateOrderStatus(editingOrder.id, nextStatus);
      await fetchOrders();
      closeStatusModal();
    } catch (updateError) {
      setError(resolveErrorMessage(updateError));
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pages.orders.title', 'Commandes')}</h1>
            <p className="text-gray-600 text-sm">{t('pages.orders.subtitle', 'Gérez vos commandes ici.')}</p>
          </div>
          <button
            onClick={() => router.push('/orders/workflow')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t('pages.orders.newWorkflow', 'Nouveau workflow commande')}
          </button>
        </div>

        {/* Filters – shown regardless of permission so navigation isn't confusing */}
        {canViewOrders && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('pages.orders.search.placeholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[120px]"
            >
              <option value="all">{t('pages.orders.filters.allStatus')}</option>
              <option value="pending">{t('pages.orders.filters.pending')}</option>
              <option value="processing">{t('pages.orders.filters.processing')}</option>
              <option value="shipped">{t('pages.orders.filters.shipped')}</option>
              <option value="delivered">{t('pages.orders.filters.delivered')}</option>
              <option value="cancelled">{t('pages.orders.filters.cancelled')}</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        )}
      </motion.div>

      {/* ── Permission guard ── */}
      {!permLoading && !canViewOrders ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PermissionRestricted
            variant="full"
            message="Accès aux commandes restreint"
            hint="Votre rôle actuel ne dispose pas de la permission nécessaire pour consulter la liste des commandes. Veuillez contacter un administrateur."
          />
        </motion.div>
      ) : (
        <>
          {error ? (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pages.orders.table.orderId')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pages.orders.table.customer')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      {t('pages.orders.table.items')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      {t('pages.orders.table.total')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pages.orders.table.status')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      {t('pages.orders.table.date')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pages.orders.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {order.id}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.customer}</div>
                          <div className="text-xs text-gray-500 sm:hidden">{order.email}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {order.items} {t('common.items')}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900 hidden sm:table-cell">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 w-fit text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {t(`pages.orders.filters.${order.status}`)}
                          </span>
                          {(order.status === 'pending' || order.status === 'processing') && order.stock_status && (
                            <span className={`inline-flex px-2 py-1 w-fit text-xs font-semibold rounded-full ${order.stock_status === 'ok' ? 'bg-green-100 text-green-800' :
                                order.stock_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                              }`}>
                              Stock {order.stock_status.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {order.date}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title={t('common.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEditOrders ? (
                            <button
                              onClick={() => openStatusModal(order)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title={t('common.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          ) : (
                            <span
                              className="text-gray-300 p-1 cursor-not-allowed"
                              title="Permission refusée"
                            >
                              <Edit className="w-4 h-4" />
                            </span>
                          )}
                          <button className="text-purple-600 hover:text-purple-900 p-1" title={t('nav.orders')}>
                            <Package className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading ? (
              <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500 border-t border-gray-200">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : null}
          </motion.div>
        </>
      )}

      {editingOrder && canEditOrders ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.orderDetails.updateStatus')}</h3>
              <button onClick={closeStatusModal} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600">{editingOrder.id}</p>
              <label className="block text-sm font-medium text-gray-700">{t('pages.orders.table.status')}</label>
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">{t('pages.orders.filters.pending')}</option>
                <option value="processing">{t('pages.orders.filters.processing')}</option>
                <option value="shipped">{t('pages.orders.filters.shipped')}</option>
                <option value="delivered">{t('pages.orders.filters.delivered')}</option>
                <option value="cancelled">{t('pages.orders.filters.cancelled')}</option>
              </select>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={closeStatusModal}
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={savingStatus}
                  type="button"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {savingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.update')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
