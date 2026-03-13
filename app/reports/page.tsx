'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  FileText, 
  Download, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface ReportData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
}

const revenueData: ReportData[] = [
  { label: 'Total Revenue', value: 284592, change: 12.5, trend: 'up' },
  { label: 'Average Order Value', value: 156.42, change: 8.2, trend: 'up' },
  { label: 'Conversion Rate', value: 3.24, change: -2.1, trend: 'down' },
  { label: 'Customer Acquisition', value: 1245, change: 15.8, trend: 'up' },
];

const monthlySales = [
  { month: 'Jan', sales: 12500, orders: 125, revenue: 45000 },
  { month: 'Feb', sales: 15800, orders: 158, revenue: 52000 },
  { month: 'Mar', sales: 18200, orders: 182, revenue: 61000 },
  { month: 'Apr', sales: 21000, orders: 210, revenue: 72000 },
  { month: 'May', sales: 24500, orders: 245, revenue: 84000 },
  { month: 'Jun', sales: 28200, orders: 282, revenue: 95000 },
  { month: 'Jul', sales: 32000, orders: 320, revenue: 108000 },
  { month: 'Aug', sales: 29500, orders: 295, revenue: 99000 },
  { month: 'Sep', sales: 33800, orders: 338, revenue: 115000 },
  { month: 'Oct', sales: 37200, orders: 372, revenue: 126000 },
  { month: 'Nov', sales: 42500, orders: 425, revenue: 145000 },
  { month: 'Dec', sales: 48000, orders: 480, revenue: 165000 },
];

const topProducts = [
  { name: 'Wireless Headphones', sales: 1254, revenue: 125400, growth: 15.2 },
  { name: 'Smart Watch Pro', sales: 892, revenue: 89200, growth: 22.5 },
  { name: 'Laptop Stand', sales: 756, revenue: 37800, growth: 8.1 },
  { name: 'USB-C Hub', sales: 654, revenue: 32700, growth: -3.2 },
  { name: 'Mechanical Keyboard', sales: 548, revenue: 54800, growth: 18.9 },
];

const userActivityData = [
  { action: 'Page Views', desktop: 45200, mobile: 28400, tablet: 12300 },
  { action: 'Add to Cart', desktop: 3200, mobile: 2100, tablet: 890 },
  { action: 'Checkouts', desktop: 1890, mobile: 1240, tablet: 520 },
  { action: 'Purchases', desktop: 1450, mobile: 980, tablet: 410 },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('12m');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = (format: string) => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  const maxSales = Math.max(...monthlySales.map(d => d.sales));
  const maxRevenue = Math.max(...monthlySales.map(d => d.revenue));

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Comprehensive analytics and business insights</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
            <option value="ytd">Year to date</option>
          </select>
          <button 
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PDF
          </button>
          <button 
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Report Type Selector */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-2 mb-6 overflow-x-auto pb-2"
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'sales', label: 'Sales' },
          { id: 'revenue', label: 'Revenue' },
          { id: 'users', label: 'Users' },
          { id: 'products', label: 'Products' },
        ].map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedReport === report.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {report.label}
          </button>
        ))}
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
      >
        {revenueData.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                index === 0 ? 'bg-blue-100' : 
                index === 1 ? 'bg-green-100' : 
                index === 2 ? 'bg-purple-100' : 'bg-yellow-100'
              }`}>
                {index === 0 ? (
                  <DollarSign className="w-6 h-6 text-blue-600" />
                ) : index === 1 ? (
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                ) : index === 2 ? (
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                ) : (
                  <Users className="w-6 h-6 text-yellow-600" />
                )}
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {index === 0 ? '$' : ''}{metric.value.toLocaleString()}{index === 1 ? '' : ''}
            </p>
            <p className="text-sm text-gray-500">{metric.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
      >
        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Sales</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {monthlySales.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-8 text-sm font-medium text-gray-600">{item.month}</span>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(item.sales / maxSales) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-20 text-right text-sm font-medium text-gray-900">
                  {item.sales.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {monthlySales.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-8 text-sm font-medium text-gray-600">{item.month}</span>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="w-24 text-right text-sm font-medium text-gray-900">
                  ${item.revenue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Top Products & User Activity */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
      >
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Products</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sales.toLocaleString()} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${product.revenue.toLocaleString()}</p>
                  <p className={`text-sm ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.growth >= 0 ? '+' : ''}{product.growth}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Activity by Device</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {userActivityData.map((activity, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{activity.action}</span>
                  <span className="text-sm text-gray-500">
                    Total: {(activity.desktop + activity.mobile + activity.tablet).toLocaleString()}
                  </span>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500"
                    style={{ width: `${(activity.desktop / (activity.desktop + activity.mobile + activity.tablet)) * 100}%` }}
                  />
                  <div 
                    className="bg-green-500"
                    style={{ width: `${(activity.mobile / (activity.desktop + activity.mobile + activity.tablet)) * 100}%` }}
                  />
                  <div 
                    className="bg-yellow-500"
                    style={{ width: `${(activity.tablet / (activity.desktop + activity.mobile + activity.tablet)) * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Desktop: {activity.desktop.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Mobile: {activity.mobile.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    Tablet: {activity.tablet.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Data Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Monthly Report</h3>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Custom Range
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Month</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Sales</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Orders</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Avg. Order</th>
              </tr>
            </thead>
            <tbody>
              {monthlySales.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{item.month}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.sales.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{item.orders}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">${item.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-gray-600">${(item.revenue / item.orders).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="py-3 px-4 font-semibold text-gray-900">Total</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  {monthlySales.reduce((acc, d) => acc + d.sales, 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  {monthlySales.reduce((acc, d) => acc + d.orders, 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  ${monthlySales.reduce((acc, d) => acc + d.revenue, 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  ${(monthlySales.reduce((acc, d) => acc + d.revenue, 0) / monthlySales.reduce((acc, d) => acc + d.orders, 0)).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

