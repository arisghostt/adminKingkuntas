'use client';

import { motion } from 'framer-motion';
import DashboardLayout from "../components/layout/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from "../hooks/useLanguage";

const monthlyData = [
  { month: 'Jan', revenue: 4000, orders: 240, customers: 120 },
  { month: 'Feb', revenue: 3000, orders: 198, customers: 98 },
  { month: 'Mar', revenue: 5000, orders: 300, customers: 180 },
  { month: 'Apr', revenue: 4500, orders: 278, customers: 165 },
  { month: 'May', revenue: 6000, orders: 389, customers: 220 },
  { month: 'Jun', revenue: 5500, orders: 349, customers: 195 },
];

const categoryData = [
  { name: 'Electronics', value: 45, color: '#3b82f6' },
  { name: 'Clothing', value: 25, color: '#10b981' },
  { name: 'Home & Garden', value: 15, color: '#f59e0b' },
  { name: 'Sports', value: 10, color: '#ef4444' },
  { name: 'Books', value: 5, color: '#8b5cf6' },
];

const topProducts = [
  { name: 'Wireless Headphones', sales: 1234, revenue: 123400 },
  { name: 'Smartphone Case', sales: 987, revenue: 24675 },
  { name: 'Laptop Stand', sales: 756, revenue: 37800 },
  { name: 'USB Cable', sales: 654, revenue: 8502 },
  { name: 'Bluetooth Speaker', sales: 543, revenue: 43440 },
];

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

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"
      >
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pages.analytics.metrics.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">$28,000</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12.5% {t('pages.analytics.changes.increase')}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pages.analytics.metrics.totalOrders')}</p>
              <p className="text-2xl font-bold text-gray-900">1,754</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8.2% {t('pages.analytics.changes.increase')}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pages.analytics.metrics.newCustomers')}</p>
              <p className="text-2xl font-bold text-gray-900">978</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+15.3% {t('pages.analytics.changes.increase')}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pages.analytics.metrics.productsSold')}</p>
              <p className="text-2xl font-bold text-gray-900">3,174</p>
              <div className="flex items-center mt-1">
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">-2.1% {t('pages.analytics.changes.decrease')}</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
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
              {topProducts.map((product, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-900">{product.name}</td>
                  <td className="py-3 px-4 text-gray-600">{product.sales.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">${product.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(product.sales / 1234) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
