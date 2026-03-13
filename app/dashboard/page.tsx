'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';
import DashboardLayout from "../components/layout/DashboardLayout";
import StatCard from "../components/cards/StatCard";
import SalesChart from "../components/charts/SalesChart";
import OrdersChart from "../components/charts/OrdersChart";
import RecentOrdersTable from "../components/tables/RecentOrdersTable";
import InventoryStatsCard from "../components/cards/InventoryStatsCard";
import StockMovementsTable from "../components/tables/StockMovementsTable";
import { useLanguage } from "../hooks/useLanguage";
import { getInventoryStats, type InventoryStats } from '@/services/inventoryService';
import { getOrderById, getOrders, type Order } from '@/services/orderService';
import { getAuthSession, hasAdminAccessRole } from '@/app/lib/auth';

const defaultInventoryStats: InventoryStats = {
  total_products: 0,
  stock_in_month: 0,
  stock_out_month: 0,
  low_stock_count: 0,
  total_products_change: 0,
  stock_in_change: 0,
  stock_out_change: 0,
  low_stock_change: 0,
};

const toChangeType = (value: number): 'increase' | 'decrease' | 'neutral' => {
  if (value > 0) return 'increase';
  if (value < 0) return 'decrease';
  return 'neutral';
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>(defaultInventoryStats);
  const [canAccessAdminApi, setCanAccessAdminApi] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [productByOrderId, setProductByOrderId] = useState<Record<string, string>>({});

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
    const session = getAuthSession();
    setCanAccessAdminApi(hasAdminAccessRole(session?.role));
  }, []);

  useEffect(() => {
    const fetchInventoryStats = async () => {
      if (!canAccessAdminApi) {
        setInventoryStats(defaultInventoryStats);
        return;
      }

      try {
        const data = await getInventoryStats();
        setInventoryStats(data);
      } catch {
        setInventoryStats(defaultInventoryStats);
      }
    };

    fetchInventoryStats();
  }, [canAccessAdminApi]);

  const recentOrderIds = useMemo(
    () =>
      [...orders]
        .sort((a, b) => {
          const aTime = Date.parse(a.date);
          const bTime = Date.parse(b.date);
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        })
        .slice(0, 5)
        .map((order) => order.id),
    [orders]
  );

  useEffect(() => {
    const fetchOrdersData = async () => {
      setOrdersLoading(true);
      setOrdersError('');
      try {
        const data = await getOrders({ page: 1 });
        setOrders(data);
      } catch (fetchError) {
        setOrdersError(resolveErrorMessage(fetchError));
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrdersData();
  }, [resolveErrorMessage]);

  useEffect(() => {
    const loadRecentProducts = async () => {
      if (recentOrderIds.length === 0) {
        setProductByOrderId({});
        return;
      }

      const entries = await Promise.all(
        recentOrderIds.map(async (id) => {
          try {
            const detail = await getOrderById(id);
            const productName = detail.items[0]?.name || '';
            return [id, productName] as const;
          } catch {
            return [id, ''] as const;
          }
        })
      );

      setProductByOrderId(
        Object.fromEntries(entries.filter((entry) => entry[1].trim().length > 0))
      );
    };

    loadRecentProducts();
  }, [recentOrderIds]);

  return (
    <DashboardLayout>
      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6"
      >
        <StatCard
          title={t('pages.dashboard.stats.totalRevenue')}
          value="$45,231"
          change="12% from last month"
          changeType="increase"
          iconType="dollar"
          iconColor="bg-green-500"
        />
        <StatCard
          title={t('pages.dashboard.stats.orders')}
          value="1,234"
          change="8% from last month"
          changeType="increase"
          iconType="cart"
          iconColor="bg-blue-500"
        />
        <StatCard
          title={t('pages.dashboard.stats.customers')}
          value="892"
          change="5% from last month"
          changeType="increase"
          iconType="users"
          iconColor="bg-purple-500"
        />
        <StatCard
          title={t('pages.dashboard.stats.refunds')}
          value="23"
          change="3% from last month"
          changeType="decrease"
          iconType="refresh"
          iconColor="bg-red-500"
        />
      </motion.div>

      {canAccessAdminApi ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4 sm:mb-6"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:4">
            {t('pages.dashboard.inventory.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.totalProducts')}
              value={inventoryStats.total_products}
              change={Math.abs(inventoryStats.total_products_change)}
              changeType={toChangeType(inventoryStats.total_products_change)}
              iconType="total"
              iconColor="bg-blue-500"
            />
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.stockIn')}
              value={inventoryStats.stock_in_month}
              change={Math.abs(inventoryStats.stock_in_change)}
              changeType={toChangeType(inventoryStats.stock_in_change)}
              iconType="in"
              iconColor="bg-green-500"
            />
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.stockOut')}
              value={inventoryStats.stock_out_month}
              change={Math.abs(inventoryStats.stock_out_change)}
              changeType={toChangeType(inventoryStats.stock_out_change)}
              iconType="out"
              iconColor="bg-orange-500"
            />
          </div>
        </motion.div>
      ) : null}

      {canAccessAdminApi ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-4 sm:mb-6"
        >
          <StockMovementsTable showAddButton={false} />
        </motion.div>
      ) : null}

      {/* Charts */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6"
      >
        <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:4">{t('pages.dashboard.charts.sales')}</h2>
          <SalesChart orders={orders} loading={ordersLoading} />
        </div>
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:4">{t('pages.dashboard.charts.orders')}</h2>
          <OrdersChart orders={orders} loading={ordersLoading} />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200"
      >
        {ordersError ? (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {ordersError}
          </div>
        ) : null}
        <RecentOrdersTable
          orders={orders}
          loading={ordersLoading}
          productByOrderId={productByOrderId}
        />
      </motion.div>
    </DashboardLayout>
  );
}
