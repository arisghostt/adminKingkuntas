'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import type { Order } from '@/services/orderService';

interface RecentOrdersTableProps {
  orders?: Order[];
  productByOrderId?: Record<string, string>;
  loading?: boolean;
  error?: string;
}

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-orange-100 text-orange-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: Order['status'], t: ReturnType<typeof useLanguage>['t']) => {
  switch (status) {
    case 'delivered':
      return t('pages.orders.filters.delivered') || 'Delivered';
    case 'shipped':
      return t('pages.orders.filters.shipped') || 'Shipped';
    case 'processing':
      return t('pages.orders.filters.processing') || 'Processing';
    case 'pending':
      return t('pages.orders.filters.pending') || 'Pending';
    case 'cancelled':
      return t('pages.orders.filters.cancelled') || 'Cancelled';
    default: {
      const statusStr = String(status);
      return statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
    }
  }
};

export default function RecentOrdersTable({
  orders = [],
  productByOrderId = {},
  loading = false,
  error = '',
}: RecentOrdersTableProps) {
  const { t } = useLanguage();
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => {
          const aTime = Date.parse(a.date);
          const bTime = Date.parse(b.date);
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        })
        .slice(0, 5),
    [orders]
  );

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('pages.dashboard.recentOrders.title')}</h3>
        <p className="text-sm text-gray-600">{t('pages.dashboard.recentOrders.subtitle')}</p>
      </div>

      {error ? (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.recentOrders.table.orderId')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.recentOrders.table.customer')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.recentOrders.table.product')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.recentOrders.table.amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.recentOrders.table.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('pages.dashboard.recentOrders.table.date')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`recent-orders-skeleton-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                    </td>
                  </tr>
                ))
              : recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {productByOrderId[order.id] || `${order.items} ${t('common.items')}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status, t)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.date}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
