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
import { getDashboardStats, defaultDashboardStats, type DashboardStats } from '@/services/dashboardService';
import { getOrderById, getOrders, type Order } from '@/services/orderService';
import { getAuthSession, hasAdminAccessRole } from '@/app/lib/auth';
import { usePermissions } from '@/app/hooks/usePermissions';
import PermissionRestricted from '@/app/components/PermissionRestricted';

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
  const {
    canViewOrders,
    canViewInventory,
    isSuperAdmin,
  } = usePermissions();

  const [inventoryStats, setInventoryStats] = useState<InventoryStats>(defaultInventoryStats);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [loadingDashboardStats, setLoadingDashboardStats] = useState(true);
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
    const fetchDashboardStats = async () => {
      setLoadingDashboardStats(true);
      try {
        const data = await getDashboardStats();
        setDashboardStats(data);
      } catch {
        // Silently keep default stats
      } finally {
        setLoadingDashboardStats(false);
      }
    };

    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const fetchInventoryStats = async () => {
      setInventoryLoading(true);
      // Only load inventory stats if the user has the access right or is admin
      if (!canAccessAdminApi && !canViewInventory && !isSuperAdmin) {
        setInventoryStats(defaultInventoryStats);
        setInventoryLoading(false);
        return;
      }

      try {
        const data = await getInventoryStats();
        setInventoryStats(data);
      } catch {
        setInventoryStats(defaultInventoryStats);
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchInventoryStats();
  }, [canAccessAdminApi, canViewInventory, isSuperAdmin]);

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
      if (!canViewOrders && !isSuperAdmin) {
        setOrders([]);
        setOrdersLoading(false);
        return;
      }

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
  }, [canViewOrders, isSuperAdmin, resolveErrorMessage]);

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
      {/* Stats – always visible: superadmin & dashboard-level stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6"
      >
        <StatCard
          title={t('pages.dashboard.stats.totalRevenue')}
          value={loadingDashboardStats ? '—' : dashboardStats.total_revenue}
          change={`${Math.abs(dashboardStats.total_revenue_change)}% ${t('pages.dashboard.stats.fromLastMonth')}`}
          changeType={dashboardStats.total_revenue_change > 0 ? 'increase' : (dashboardStats.total_revenue_change < 0 ? 'decrease' : 'neutral')}
          loading={loadingDashboardStats}
          iconType="dollar"
          iconColor="bg-green-500"
        />
        <StatCard
          title={t('pages.dashboard.stats.orders')}
          value={loadingDashboardStats ? '—' : dashboardStats.orders_count}
          change={`${Math.abs(dashboardStats.orders_change)}% ${t('pages.dashboard.stats.fromLastMonth')}`}
          changeType={dashboardStats.orders_change > 0 ? 'increase' : (dashboardStats.orders_change < 0 ? 'decrease' : 'neutral')}
          loading={loadingDashboardStats}
          iconType="cart"
          iconColor="bg-blue-500"
        />
        <StatCard
          title={t('pages.dashboard.stats.customers')}
          value={loadingDashboardStats ? '—' : dashboardStats.customers_count}
          change={`${Math.abs(dashboardStats.customers_change)}% ${t('pages.dashboard.stats.fromLastMonth')}`}
          changeType={dashboardStats.customers_change > 0 ? 'increase' : (dashboardStats.customers_change < 0 ? 'decrease' : 'neutral')}
          loading={loadingDashboardStats}
          iconType="users"
          iconColor="bg-purple-500"
        />
        <StatCard
          title={t('pages.dashboard.stats.refunds')}
          value={loadingDashboardStats ? '—' : dashboardStats.refunds_count.toString()}
          change={`${Math.abs(dashboardStats.refunds_change)}% ${t('pages.dashboard.stats.fromLastMonth')}`}
          changeType={dashboardStats.refunds_change > 0 ? 'increase' : (dashboardStats.refunds_change < 0 ? 'decrease' : 'neutral')}
          loading={loadingDashboardStats}
          iconType="refresh"
          iconColor="bg-red-500"
        />
      </motion.div>

      {/* Inventory – gated behind inventory permission */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-4 sm:mb-6"
      >
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:4">
          {t('pages.dashboard.inventory.title')}
        </h2>

        {!canAccessAdminApi && !canViewInventory && !isSuperAdmin ? (
          <PermissionRestricted
            variant="inline"
            message="Accès à l'inventaire restreint pour votre rôle"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.totalProducts')}
              value={inventoryStats.total_products}
              change={Math.abs(inventoryStats.total_products_change)}
              changeType={canAccessAdminApi ? toChangeType(inventoryStats.total_products_change) : 'neutral'}
              iconType="total"
              iconColor="bg-blue-500"
              loadingStats={inventoryLoading}
            />
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.stockIn')}
              value={inventoryStats.stock_in_month}
              change={Math.abs(inventoryStats.stock_in_change)}
              changeType={canAccessAdminApi ? toChangeType(inventoryStats.stock_in_change) : 'neutral'}
              iconType="in"
              iconColor="bg-green-500"
              loadingStats={inventoryLoading}
            />
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.stockOut')}
              value={inventoryStats.stock_out_month}
              change={Math.abs(inventoryStats.stock_out_change)}
              changeType={canAccessAdminApi ? toChangeType(inventoryStats.stock_out_change) : 'neutral'}
              iconType="out"
              iconColor="bg-orange-500"
              loadingStats={inventoryLoading}
            />
            <InventoryStatsCard
              title={t('pages.dashboard.inventory.lowStock')}
              value={inventoryStats.low_stock_count}
              change={Math.abs(inventoryStats.low_stock_change)}
              changeType={canAccessAdminApi ? toChangeType(inventoryStats.low_stock_change) : 'neutral'}
              iconType="total"
              iconColor="bg-yellow-500"
              loadingStats={inventoryLoading}
            />
          </div>
        )}
      </motion.div>

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

      {/* Charts – gated behind orders permission */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6"
      >
        <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:4">{t('pages.dashboard.charts.sales')}</h2>
          {!canViewOrders && !isSuperAdmin ? (
            <PermissionRestricted
              variant="card"
              message="Graphique non disponible"
              hint="Votre rôle ne dispose pas de la permission de consulter les commandes."
            />
          ) : (
            <SalesChart orders={orders} loading={ordersLoading} />
          )}
        </div>
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:4">{t('pages.dashboard.charts.orders')}</h2>
          {!canViewOrders && !isSuperAdmin ? (
            <PermissionRestricted
              variant="card"
              message="Graphique non disponible"
              hint="Votre rôle ne dispose pas de la permission de consulter les commandes."
            />
          ) : (
            <OrdersChart orders={orders} loading={ordersLoading} />
          )}
        </div>
      </motion.div>

      {/* Recent Orders Table – gated behind orders permission */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-200"
      >
        {!canViewOrders && !isSuperAdmin ? (
          <PermissionRestricted
            variant="card"
            message="Tableau des commandes restreint"
            hint="Votre rôle ne dispose pas la permission de consulter les commandes récentes."
          />
        ) : (
          <>
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
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
