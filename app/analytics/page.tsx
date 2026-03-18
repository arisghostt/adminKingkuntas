'use client';

import { motion } from 'framer-motion';
import DashboardLayout from "../components/layout/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from "../hooks/useLanguage";

import { useCallback } from 'react';
import axios from 'axios';
import { 
  getAnalyticsStats, 
  getMonthlyChartData, 
  getCategoryData, 
  getTopProducts,
  type AnalyticsStats,
  type MonthlyData,
  type CategoryData,
  type TopProduct
} from '@/services/analyticsService';
import { usePermissions } from '@/app/hooks/usePermissions';
import PermissionRestricted from '@/app/components/PermissionRestricted';

const DEFAULT_STATS: AnalyticsStats = {
  totalRevenue: { value: 0, change: 0 },
  totalOrders: { value: 0, change: 0 },
  newCustomers: { value: 0, change: 0 },
  productsSold: { value: 0, change: 0 }
};

function ChartWrapper({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { canViewAnalytics, isLoading: permLoading } = usePermissions();

  const [stats, setStats] = useState<AnalyticsStats>(DEFAULT_STATS);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const extractErrorDetail = (data: unknown): string | null => {
    if (!data || typeof data !== 'object') return null;
    const body = data as Record<string, unknown>;
    if (typeof body.detail === 'string' && body.detail.trim().length > 0) return body.detail.trim();
    if (typeof body.message === 'string' && body.message.trim().length > 0) return body.message.trim();
    if (typeof body.error === 'string' && body.error.trim().length > 0) return body.error.trim();
    return null;
  };

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
    if (!canViewAnalytics) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [statsData, monthlyChart, catsData, topProds] = await Promise.all([
          getAnalyticsStats(),
          getMonthlyChartData(),
          getCategoryData(),
          getTopProducts()
        ]);
        setStats(statsData);
        setMonthlyData(monthlyChart);
        setCategoryData(catsData);
        setTopProducts(topProds);
      } catch (err) {
        setError(resolveErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [canViewAnalytics, resolveErrorMessage]);

  const MetricCard = ({ title, value, change, isIncrease, icon: Icon, colorClass, bgColorClass, suffix = "" }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-1">
            {isLoading ? (
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{suffix}{value.toLocaleString()}</p>
            )}
          </div>
          <div className="flex items-center mt-1">
            {isLoading ? (
              <div className="h-4 w-32 bg-gray-100 animate-pulse rounded mt-1"></div>
            ) : (
              <>
                {isIncrease ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change)}% {t(`pages.analytics.changes.${isIncrease ? 'increase' : 'decrease'}`)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${bgColorClass}`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.analytics.title')}</h1>
        <p className="text-gray-600">{t('pages.analytics.subtitle')}</p>
      </motion.div>

      {/* ── Permission guard ── */}
      {!permLoading && !canViewAnalytics ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PermissionRestricted
            variant="full"
            message="Accès à l'analytique restreint"
            hint="Votre rôle actuel ne dispose pas de la permission nécessaire pour consulter les données analytiques. Veuillez contacter un administrateur pour obtenir l'accès."
          />
        </motion.div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => window.location.reload()} 
                className="text-sm font-medium underline hover:text-red-800"
              >
                {t('common.refresh')}
              </button>
            </div>
          )}

          {/* Key Metrics */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"
          >
            <MetricCard 
              title={t('pages.analytics.metrics.totalRevenue')}
              value={stats.totalRevenue.value}
              change={stats.totalRevenue.change}
              isIncrease={stats.totalRevenue.change >= 0}
              icon={DollarSign}
              colorClass="text-green-600"
              bgColorClass="bg-green-100"
              suffix="$"
            />
            <MetricCard 
              title={t('pages.analytics.metrics.totalOrders')}
              value={stats.totalOrders.value}
              change={stats.totalOrders.change}
              isIncrease={stats.totalOrders.change >= 0}
              icon={ShoppingCart}
              colorClass="text-blue-600"
              bgColorClass="bg-blue-100"
            />
            <MetricCard 
              title={t('pages.analytics.metrics.newCustomers')}
              value={stats.newCustomers.value}
              change={stats.newCustomers.change}
              isIncrease={stats.newCustomers.change >= 0}
              icon={Users}
              colorClass="text-purple-600"
              bgColorClass="bg-purple-100"
            />
            <MetricCard 
              title={t('pages.analytics.metrics.productsSold')}
              value={stats.productsSold.value}
              change={stats.productsSold.change}
              isIncrease={stats.productsSold.change >= 0}
              icon={Package}
              colorClass="text-orange-600"
              bgColorClass="bg-orange-100"
            />
          </motion.div>

          {/* Charts Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
          >
            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('pages.analytics.charts.revenueTrend')}</h3>
              <div className="h-80">
                <ChartWrapper
                  fallback={
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded">
                      <p className="text-gray-500">Loading chart...</p>
                    </div>
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
            </div>

            {/* Sales by Category */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('pages.analytics.charts.salesByCategory')}</h3>
              <div className="h-80">
                <ChartWrapper
                  fallback={
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded">
                      <p className="text-gray-500">Loading chart...</p>
                    </div>
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {categoryData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{t(`pages.analytics.categories.${item.name.toLowerCase().replace(/ & /g, '').replace(/ /g, '')}`)}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Orders vs Customers */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('pages.analytics.charts.ordersVsCustomers')}</h3>
            <div className="h-80">
              <ChartWrapper
                fallback={
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded">
                    <p className="text-gray-500">Loading chart...</p>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="orders" fill="#3b82f6" name={t('pages.analytics.metrics.totalOrders')} />
                    <Bar dataKey="customers" fill="#10b981" name={t('pages.analytics.metrics.newCustomers')} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </div>
          </motion.div>

          {/* Top Products */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('pages.analytics.tables.topSelling')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">{t('pages.analytics.table.product')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">{t('pages.analytics.table.sales')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">{t('pages.analytics.table.revenue')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">{t('pages.analytics.table.performance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 px-4"><div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div></td>
                        <td className="py-3 px-4"><div className="h-4 w-12 bg-gray-200 animate-pulse rounded"></div></td>
                        <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div></td>
                        <td className="py-3 px-4"><div className="h-2 w-full bg-gray-100 rounded"></div></td>
                      </tr>
                    ))
                  ) : topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">{t('common.noResults')}</td>
                    </tr>
                  ) : (
                    topProducts.map((product, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-900">{product.name}</td>
                        <td className="py-3 px-4 text-gray-600">{product.sales.toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-900 font-medium">${product.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${product.performance}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </DashboardLayout>
  );
}
