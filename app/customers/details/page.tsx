'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "../../components/layout/DashboardLayout";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, ShoppingBag, DollarSign, MessageCircle, FileText, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from "../../hooks/useLanguage";
import { getCustomerById, updateCustomer } from '@/services/customerService';

interface Order {
  id: string;
  date: string;
  total: number;
  status: string;
  items: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'blocked';
  orders: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate: string;
  notes: string;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800',
    shipped: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<'active' | 'inactive' | 'blocked'>('active');
  const [editNotes, setEditNotes] = useState('');

  const customerStatusLabel =
    customer?.status === 'active'
      ? t('pages.customers.status.active')
      : customer?.status === 'inactive'
        ? t('pages.customers.status.inactive')
        : 'Blocked';

  useEffect(() => {
    if (!id) {
      router.replace('/customers');
      return;
    }

    const loadCustomer = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = await getCustomerById(id);
        setCustomer({
          id: detail.id,
          name: detail.name,
          email: detail.email,
          phone: detail.phone,
          location: detail.location,
          joinDate: detail.joinDate,
          status: detail.status,
          orders: detail.orders,
          totalSpent: detail.totalSpent,
          avgOrderValue: detail.avgOrderValue,
          lastOrderDate: detail.lastOrderDate,
          notes: detail.notes,
        });
        setOrders(
          detail.ordersHistory.map((order) => ({
            id: order.id,
            date: order.date,
            total: order.total,
            status: order.status.toLowerCase(),
            items: order.items,
          }))
        );
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch customer');
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [id, router]);

  const startEdit = () => {
    if (!customer) return;
    setEditStatus(customer.status);
    setEditNotes(customer.notes);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!customer || !id) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateCustomer(id, {
        status: editStatus,
        notes: editNotes,
      });

      setCustomer({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        location: updated.location,
        joinDate: updated.joinDate,
        status: updated.status,
        orders: updated.orders,
        totalSpent: updated.totalSpent,
        avgOrderValue: updated.avgOrderValue,
        lastOrderDate: updated.lastOrderDate,
        notes: updated.notes,
      });
      setOrders(
        updated.ordersHistory.map((order) => ({
          id: order.id,
          date: order.date,
          total: order.total,
          status: order.status.toLowerCase(),
          items: order.items,
        }))
      );
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Link href="/customers" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('pages.customerDetails.backToCustomers')}
          </Link>
          {error ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/customers" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('pages.customerDetails.backToCustomers')}
        </Link>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {customerStatusLabel}
                </span>
                <span className="text-sm text-gray-500">{t('pages.customers.details.joined')}: {customer.joinDate}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('pages.customers.buttons.sendMessage')}
            </button>
            <button
              onClick={startEdit}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {t('pages.customerDetails.editCustomer')}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('pages.customers.details.orders')}</p>
                  <p className="text-2xl font-bold text-gray-900">{customer.orders}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('pages.customers.details.totalSpent')}</p>
                  <p className="text-2xl font-bold text-gray-900">${customer.totalSpent.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('pages.customers.details.avgOrderValue')}</p>
                  <p className="text-2xl font-bold text-gray-900">${customer.avgOrderValue.toFixed(2)}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.customerDetails.orderHistory')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.orders.table.orderId')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.orders.table.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.orderDetails.orderItems')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.orders.table.total')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.orders.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{order.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{order.items} {t('common.items')}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">${order.total.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {t(`pages.orders.filters.${order.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.customerDetails.contactInformation')}</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">{t('pages.settings.labels.email')}</p>
                  <p className="font-medium text-gray-900">{customer.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">{t('pages.settings.labels.phone')}</p>
                  <p className="font-medium text-gray-900">{customer.phone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t('pages.customerDetails.location')}</p>
                  <p className="font-medium text-gray-900">{customer.location}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">{t('pages.customers.details.lastOrder')}</p>
                  <p className="font-medium text-gray-900">{customer.lastOrderDate || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.customerDetails.notes')}</h3>
            {isEditing ? (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.orders.table.status')}</label>
                  <select
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(
                        event.target.value === 'blocked'
                          ? 'blocked'
                          : event.target.value === 'inactive'
                            ? 'inactive'
                            : 'active'
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">{t('pages.customers.status.active')}</option>
                    <option value="inactive">{t('pages.customers.status.inactive')}</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {t('common.save')}
                  </button>
                  <button
                    onClick={cancelEdit}
                    type="button"
                    className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-sm">{customer.notes || '-'}</p>
                <button onClick={startEdit} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  {t('pages.customerDetails.editNotes')}
                </button>
              </>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.customerDetails.quickActions')}</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                {t('pages.customerDetails.viewAllOrders')}
              </button>
              <button className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                {t('pages.customerDetails.downloadInvoice')}
              </button>
              <button className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                {t('pages.customerDetails.viewAddressBook')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
