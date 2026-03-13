'use client';

import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useLanguage } from '../hooks/useLanguage';
import { 
  Activity, 
  Search, 
  Download, 
  Calendar,
  User,
  Package,
  ShoppingCart,
  CreditCard,
  Settings,
  LogIn,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface LogEntry {
  id: number;
  user: string;
  role: string;
  action: string;
  category: string;
  description: string;
  ipAddress: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}

const logEntries: LogEntry[] = [
  {
    id: 1,
    user: 'John Doe',
    role: 'Administrator',
    action: 'LOGIN',
    category: 'Authentication',
    description: 'Successful login to dashboard',
    ipAddress: '192.168.1.100',
    timestamp: '2024-01-15 14:32:05',
    status: 'success',
  },
  {
    id: 2,
    user: 'John Doe',
    role: 'Administrator',
    action: 'UPDATE_PRODUCT',
    category: 'Products',
    description: 'Updated product Wireless Headphones price from $99 to $129',
    ipAddress: '192.168.1.100',
    timestamp: '2024-01-15 14:35:22',
    status: 'success',
  },
  {
    id: 3,
    user: 'Sarah Smith',
    role: 'Manager',
    action: 'CREATE_ORDER',
    category: 'Orders',
    description: 'Created new order #1234 for customer Jane Doe',
    ipAddress: '192.168.1.101',
    timestamp: '2024-01-15 14:40:18',
    status: 'success',
  },
  {
    id: 4,
    user: 'Mike Johnson',
    role: 'Support',
    action: 'VIEW_CUSTOMER',
    category: 'Customers',
    description: 'Viewed customer profile #5678',
    ipAddress: '192.168.1.102',
    timestamp: '2024-01-15 14:45:33',
    status: 'success',
  },
  {
    id: 5,
    user: 'John Doe',
    role: 'Administrator',
    action: 'DELETE_USER',
    category: 'Users',
    description: 'Attempted to delete user account',
    ipAddress: '192.168.1.100',
    timestamp: '2024-01-15 14:50:45',
    status: 'failed',
  },
  {
    id: 6,
    user: 'System',
    role: 'System',
    action: 'BACKUP',
    category: 'System',
    description: 'Automated daily database backup completed',
    ipAddress: '127.0.0.1',
    timestamp: '2024-01-15 15:00:00',
    status: 'success',
  },
  {
    id: 7,
    user: 'Sarah Smith',
    role: 'Manager',
    action: 'UPDATE_INVENTORY',
    category: 'Products',
    description: 'Updated inventory for 15 products',
    ipAddress: '192.168.1.101',
    timestamp: '2024-01-15 15:05:12',
    status: 'success',
  },
  {
    id: 8,
    user: 'John Doe',
    role: 'Administrator',
    action: 'EXPORT_REPORT',
    category: 'Reports',
    description: 'Exported sales report for December 2023',
    ipAddress: '192.168.1.100',
    timestamp: '2024-01-15 15:10:28',
    status: 'success',
  },
  {
    id: 9,
    user: 'Mike Johnson',
    role: 'Support',
    action: 'PROCESS_REFUND',
    category: 'Payments',
    description: 'Processed refund for order #1220 $45.00',
    ipAddress: '192.168.1.102',
    timestamp: '2024-01-15 15:15:44',
    status: 'pending',
  },
  {
    id: 10,
    user: 'John Doe',
    role: 'Administrator',
    action: 'UPDATE_SETTINGS',
    category: 'Settings',
    description: 'Updated notification preferences',
    ipAddress: '192.168.1.100',
    timestamp: '2024-01-15 15:20:10',
    status: 'success',
  },
];

const getActionIcon = (action: string) => {
  if (action.includes('LOGIN') || action.includes('LOGOUT')) return <LogIn className="w-4 h-4" />;
  if (action.includes('PRODUCT')) return <Package className="w-4 h-4" />;
  if (action.includes('ORDER') || action.includes('CART')) return <ShoppingCart className="w-4 h-4" />;
  if (action.includes('PAYMENT') || action.includes('REFUND')) return <CreditCard className="w-4 h-4" />;
  if (action.includes('SETTINGS')) return <Settings className="w-4 h-4" />;
  if (action.includes('USER') || action.includes('CUSTOMER')) return <User className="w-4 h-4" />;
  if (action.includes('REPORT') || action.includes('EXPORT')) return <FileText className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
};

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

const getStatusBadge = (status: string, t: any) => {
  switch (status) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <Check className="w-3 h-3" /> 
          {t('common.success')}
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          <Trash2 className="w-3 h-3" /> 
          {t('common.failed')}
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          <Clock className="w-3 h-3" /> 
          {t('common.pending')}
        </span>
      );
    default:
      return null;
  }
};

export default function ActivityLogPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  };

  const filteredLogs = logEntries.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const matchesUser = selectedUser === 'all' || log.user === selectedUser;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesUser && matchesStatus;
  });

  const categories = [...new Set(logEntries.map(log => log.category))];
  const users = [...new Set(logEntries.map(log => log.user))];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.activityLog.title')}</h1>
            <p className="text-gray-600">{t('pages.activityLog.subtitle')}</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('common.exportLogs')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{logEntries.length}</p>
              <p className="text-sm text-gray-500">{t('pages.activityLog.summary.totalActivities')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-500">{t('pages.activityLog.summary.activeUsers')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{logEntries.filter(l => l.status === 'failed').length}</p>
              <p className="text-sm text-gray-500">{t('pages.activityLog.summary.failedActions')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              <p className="text-sm text-gray-500">{t('pages.activityLog.summary.categoriesCount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('pages.activityLog.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('pages.activityLog.filters.allCategories')}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('pages.activityLog.filters.allUsers')}</option>
            {users.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('pages.activityLog.filters.allStatus')}</option>
            <option value="success">{t('common.success')}</option>
            <option value="failed">{t('common.failed')}</option>
            <option value="pending">{t('common.pending')}</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('pages.activityLog.filters.allTime')}</option>
            <option value="today">{t('pages.activityLog.filters.today')}</option>
            <option value="week">{t('pages.activityLog.filters.thisWeek')}</option>
            <option value="month">{t('pages.activityLog.filters.thisMonth')}</option>
          </select>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.timestamp')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.user')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.action')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.category')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.description')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.ipAddress')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-sm">
                  {t('pages.activityLog.table.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                        {log.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.user}</p>
                        <p className="text-xs text-gray-500">{log.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${
                        log.action.includes('LOGIN') ? 'bg-green-100 text-green-600' :
                        log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                        log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getActionIcon(log.action)}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{log.action}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">{log.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 max-w-xs truncate">{log.description}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-500 font-mono">{log.ipAddress}</span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(log.status, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('pages.activityLog.noActivities')}</h3>
            <p className="text-gray-500">{t('common.noResults')}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {t('pages.activityLog.showingEntries', { count: filteredLogs.length, total: logEntries.length })}
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50" disabled>
              {t('common.previousPage')}
            </button>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">
              {t('common.nextPage')}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

