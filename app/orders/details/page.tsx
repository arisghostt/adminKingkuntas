'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from "../../components/layout/DashboardLayout";
import { ArrowLeft, Eye, Edit, Package, Truck, CheckCircle, MapPin, Phone, Mail, CreditCard, Loader2, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useLanguage } from "../../hooks/useLanguage";
import { getOrderById, refundOrder, type OrderDetail, type OrderStatus, updateOrderStatus } from '@/services/orderService';

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-800',
    processing: 'bg-yellow-100 text-yellow-800',
    shipped: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getTimelineStatus = (status: string, step: number) => {
  const statuses = ['pending', 'processing', 'shipped', 'delivered'];
  const currentIndex = statuses.indexOf(status);
  if (step < currentIndex) return 'completed';
  if (step === currentIndex) return 'current';
  return 'upcoming';
};

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

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

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

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getOrderById(id);
      setOrder(data);
      setNextStatus(data.status);
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, resolveErrorMessage]);

  useEffect(() => {
    if (!id) {
      router.replace('/orders');
      return;
    }
    fetchOrder();
  }, [id, router, fetchOrder]);

  const handleUpdateStatus = async () => {
    if (!order) return;
    setSavingStatus(true);
    setError('');
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      setOrder(updated);
      setIsStatusModalOpen(false);
      setSuccessMessage(t('pages.orderDetails.updateStatus'));
    } catch (updateError) {
      setError(resolveErrorMessage(updateError));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRefund = async () => {
    if (!order) return;
    setRefunding(true);
    setError('');
    try {
      const amount = refundAmount.trim().length > 0 ? Number(refundAmount) : undefined;
      await refundOrder(order.id, {
        reason: refundReason.trim() || undefined,
        amount: Number.isFinite(amount as number) ? amount : undefined,
      });
      setIsRefundModalOpen(false);
      setRefundReason('');
      setRefundAmount('');
      setSuccessMessage(t('pages.orderDetails.refundOrder'));
      await fetchOrder();
    } catch (refundError) {
      setError(resolveErrorMessage(refundError));
    } finally {
      setRefunding(false);
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

  if (!order) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Link href="/orders" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('pages.orderDetails.backToOrders')}
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

  const timelineSteps = [
    t('pages.orderDetails.timeline.orderPlaced'),
    t('pages.orderDetails.timeline.processing'),
    t('pages.orderDetails.timeline.shipped'),
    t('pages.orderDetails.timeline.delivered')
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/orders" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('pages.orderDetails.backToOrders')}
        </Link>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.orderDetails.title')}</h1>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
              {t(`pages.orders.filters.${order.status}`)}
            </span>
          </div>
          <div className="flex space-x-3">
            {order.tracking_number && (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                {t('pages.orderDetails.trackPackage')}
              </button>
            )}
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {t('pages.orderDetails.updateStatus')}
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

      {successMessage ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('pages.orderDetails.orderProgress')}</h3>
        <div className="flex items-center justify-between">
          {timelineSteps.map((step, index) => {
            const status = getTimelineStatus(order.status, index);
            return (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-500 text-white' :
                  status === 'current' ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${status !== 'upcoming' ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step}
                </span>
                {index < timelineSteps.length - 1 && (
                  <div className={`w-24 h-1 mx-4 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        {order.tracking_number && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center">
            <Package className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-600">
              {t('pages.orderDetails.trackingNumber')}: <strong>{order.tracking_number}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.orderDetails.orderItems')}</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-gray-400 text-xs">{t('pages.products.details.productImage')}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">{t('pages.orders.table.items')}: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">{t('pages.orderDetails.total')}</span>
                <span className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                {t('pages.orderDetails.shippingAddress')}
              </h3>
              <p className="text-gray-600">{order.customer}</p>
              <p className="text-gray-600">{order.shipping_address}</p>
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <Phone className="w-4 h-4 mr-1" />
                {order.phone}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                {t('pages.orderDetails.billingAddress')}
              </h3>
              <p className="text-gray-600">{order.customer}</p>
              <p className="text-gray-600">{order.billing_address}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.orderDetails.orderInformation')}</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">{t('pages.orderDetails.orderId')}</p>
                <p className="font-medium text-gray-900">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('pages.orderDetails.date')}</p>
                <p className="font-medium text-gray-900">{order.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('pages.orderDetails.customer')}</p>
                <p className="font-medium text-gray-900">{order.customer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('pages.orderDetails.email')}</p>
                <p className="font-medium text-gray-900">{order.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('pages.orderDetails.phone')}</p>
                <p className="font-medium text-gray-900">{order.phone}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
              {t('pages.orderDetails.paymentMethod')}
            </h3>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <CreditCard className="w-8 h-8 text-gray-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{order.payment_method}</p>
                <p className="text-sm text-gray-500">{t('pages.orderDetails.paid')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.orderDetails.orderActions')}</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                {t('pages.orderDetails.printInvoice')}
              </button>
              <button className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                {t('pages.orderDetails.sendConfirmation')}
              </button>
              <button
                onClick={() => setIsRefundModalOpen(true)}
                className="w-full border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
              >
                {t('pages.orderDetails.refundOrder')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isStatusModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.orderDetails.updateStatus')}</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">{t('pages.orders.table.status')}</label>
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">{t('pages.orders.filters.pending')}</option>
                <option value="processing">{t('pages.orders.filters.processing')}</option>
                <option value="shipped">{t('pages.orders.filters.shipped')}</option>
                <option value="delivered">{t('pages.orders.filters.delivered')}</option>
                <option value="cancelled">{t('pages.orders.filters.cancelled')}</option>
              </select>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={savingStatus}
                  type="button"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {savingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.update')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isRefundModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.orderDetails.refundOrder')}</h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">{t('pages.billing.amount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="block text-sm font-medium text-gray-700">{t('pages.customerDetails.notes')}</label>
              <textarea
                rows={3}
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsRefundModalOpen(false)}
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRefund}
                  disabled={refunding}
                  type="button"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {t('common.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
