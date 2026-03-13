'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AlertTriangle } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLanguage } from '../hooks/useLanguage';
import DashboardLayout from '../components/layout/DashboardLayout';
import InventoryStatsCard from '../components/cards/InventoryStatsCard';
import StockMovementsTable from '../components/tables/StockMovementsTable';
import {
  getAnalytics,
  getInventoryStats,
  type AnalyticsData,
  type InventoryStats,
} from '@/services/inventoryService';

const defaultStats: InventoryStats = {
  total_products: 0,
  stock_in_month: 0,
  stock_out_month: 0,
  low_stock_count: 0,
  total_products_change: 0,
  stock_in_change: 0,
  stock_out_change: 0,
  low_stock_change: 0,
};

const defaultAnalytics: AnalyticsData = {
  movements_chart: [],
  by_category: [],
  top_products: [],
};

const pieColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

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

const toChangeType = (value: number): 'increase' | 'decrease' | 'neutral' => {
  if (value > 0) return 'increase';
  if (value < 0) return 'decrease';
  return 'neutral';
};

const formatChartDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

export default function InventoryPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<InventoryStats>(defaultStats);
  const [analytics, setAnalytics] = useState<AnalyticsData>(defaultAnalytics);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      setError('');
      try {
        const data = await getInventoryStats();
        setStats(data);
      } catch (fetchError) {
        setError(resolveErrorMessage(fetchError));
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [resolveErrorMessage]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      setError('');
      try {
        const data = await getAnalytics(period);
        setAnalytics(data);
      } catch (fetchError) {
        setError(resolveErrorMessage(fetchError));
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [period, resolveErrorMessage]);

  const statsCards = useMemo(
    () => [
      {
        title: t('pages.inventory.stats.totalProducts'),
        value: stats.total_products,
        change: Math.abs(stats.total_products_change),
        changeType: toChangeType(stats.total_products_change),
        iconType: 'total' as const,
        iconColor: 'bg-blue-500',
      },
      {
        title: t('pages.inventory.stats.stockIn'),
        value: stats.stock_in_month,
        change: Math.abs(stats.stock_in_change),
        changeType: toChangeType(stats.stock_in_change),
        iconType: 'in' as const,
        iconColor: 'bg-green-500',
      },
      {
        title: t('pages.inventory.stats.stockOut'),
        value: stats.stock_out_month,
        change: Math.abs(stats.stock_out_change),
        changeType: toChangeType(stats.stock_out_change),
        iconType: 'out' as const,
        iconColor: 'bg-red-500',
      },
      {
        title: t('pages.inventory.stats.lowStock'),
        value: stats.low_stock_count,
        change: Math.abs(stats.low_stock_change),
        changeType: toChangeType(stats.low_stock_change),
        iconType: 'total' as const,
        iconColor: 'bg-yellow-500',
      },
    ],
    [stats, t]
  );

  const maxMovements = Math.max(1, ...analytics.top_products.map((item) => item.total_movements));

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-8"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pages.inventory.title')}</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('pages.inventory.subtitle')}</p>
      </motion.div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8"
      >
        {statsCards.map((stat, index) => (
          <InventoryStatsCard
            key={index}
            title={stat.title}
            value={loadingStats ? 0 : stat.value}
            change={stat.change}
            changeType={stat.changeType}
            iconType={stat.iconType}
            iconColor={stat.iconColor}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            {t('pages.inventory.analytics.title', { defaultValue: 'Inventory Analytics' })}
          </h3>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`px-3 py-1.5 text-sm ${
                  period === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${loadingAnalytics ? 'opacity-50' : ''}`}>
          <div className="border border-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              {t('pages.inventory.analytics.stockInOut', { defaultValue: 'Stock In vs Stock Out' })}
            </h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.movements_chart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatChartDate} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number | string | undefined, name: string | undefined) => [
                      Number(value ?? 0),
                      name === 'stock_in' ? 'Stock In' : 'Stock Out',
                    ]}
                    labelFormatter={(label) => formatChartDate(String(label))}
                  />
                  <Line type="monotone" dataKey="stock_in" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="stock_out" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              {t('pages.inventory.analytics.byCategory', { defaultValue: 'By Category' })}
            </h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.by_category}
                    dataKey="percentage"
                    nameKey="category"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    labelLine={false}
                  >
                    {analytics.by_category.map((entry, index) => (
                      <Cell key={`${entry.category}-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined) => `${Number(value ?? 0)}%`}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend verticalAlign="bottom" height={50} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 border border-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              {t('pages.inventory.analytics.topProducts', { defaultValue: 'Top 5 Most Moved Products' })}
            </h4>
            <div className="space-y-3">
              {analytics.top_products.slice(0, 5).map((product, index) => {
                const width = Math.max(4, Math.round((product.total_movements / maxMovements) * 100));
                return (
                  <div key={`${product.product_name}-${index}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <div className="text-sm font-semibold text-gray-500 w-6">{index + 1}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.product_name}</p>
                      <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${width}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        <span className="text-green-600">{t('pages.inventory.movements.in')}: {product.stock_in}</span>{' '}
                        <span className="text-red-600">{t('pages.inventory.movements.out')}: {product.stock_out}</span>
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{product.total_movements}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StockMovementsTable limit={5} showAddButton={false} />
      </motion.div>
    </DashboardLayout>
  );
}
