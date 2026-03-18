'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardLayout from "../components/layout/DashboardLayout";
import { Loader2, Search, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { useLanguage } from "../hooks/useLanguage";
import { getCustomers } from '@/services/customerService';
import { usePermissions } from '@/app/hooks/usePermissions';
import PermissionRestricted from '@/app/components/PermissionRestricted';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orders: number;
  totalSpent: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

export default function CustomersPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { canViewCustomers, isLoading: permLoading } = usePermissions();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('join_date');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!canViewCustomers) return;

    const fetchCustomers = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getCustomers({
          search: debouncedSearch || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          sort: sortBy || undefined,
        });

        setCustomers(
          data.map((customer) => ({
            ...customer,
            status: customer.status === 'active' ? 'active' : 'inactive',
          }))
        );
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch customers');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [canViewCustomers, debouncedSearch, statusFilter, sortBy]);

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.customers.title')}</h1>
            <p className="text-gray-600">{t('pages.customers.subtitle')}</p>
          </div>
        </div>

        {canViewCustomers && (
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('pages.customers.search.placeholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('pages.customers.filters.allCustomers')}</option>
              <option value="active">{t('pages.customers.filters.active')}</option>
              <option value="inactive">{t('pages.customers.filters.inactive')}</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="join_date">{t('pages.customers.filters.sortJoinDate')}</option>
              <option value="orders">{t('pages.customers.filters.sortOrders')}</option>
              <option value="total_spent">{t('pages.customers.filters.sortTotalSpent')}</option>
            </select>
          </div>
        )}
      </motion.div>

      {/* ── Permission guard ── */}
      {!permLoading && !canViewCustomers ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <PermissionRestricted
            variant="full"
            message="Accès aux clients restreint"
            hint="Votre rôle actuel ne dispose pas de la permission nécessaire pour consulter la liste des clients. Veuillez contacter un administrateur."
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

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('common.loading')}</span>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {customers.map((customer, index) => (
                <motion.div 
                  key={customer.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {t(`pages.customers.status.${customer.status}`)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {customer.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      {customer.location}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">{t('pages.customers.details.orders')}</p>
                        <p className="text-lg font-semibold text-gray-900">{customer.orders}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('pages.customers.details.totalSpent')}</p>
                        <p className="text-lg font-semibold text-gray-900">${customer.totalSpent.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">{t('pages.customers.details.joined')}: {customer.joinDate}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {t('pages.customers.buttons.viewProfile')}
                    </button>
                    <button className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
                      {t('pages.customers.buttons.sendMessage')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
