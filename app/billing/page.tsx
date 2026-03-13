'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CreditCard, Download, Plus, Edit, Trash2, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../hooks/useLanguage';
import { usePermissions } from '@/app/hooks/usePermissions';
import { getSalesInvoices, type SalesInvoice } from '@/services/salesService';
import { getFinancePayments, type FinancePayment } from '@/services/financeService';

type BillingStatus = 'paid' | 'pending' | 'overdue';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  brand: string;
  isDefault: boolean;
}

const normalizeInvoiceStatus = (value: string): BillingStatus => {
  const status = value.trim().toLowerCase();
  if (status === 'paid' || status === 'completed') return 'paid';
  if (status === 'overdue') return 'overdue';
  return 'pending';
};

const paymentMethodFromPayment = (payment: FinancePayment, index: number): PaymentMethod => {
  const reference = payment.reference.replace(/\s+/g, '');
  const last4 = reference.slice(-4) || '0000';
  const normalizedMethod = payment.method.trim().toLowerCase();

  const brand =
    normalizedMethod.includes('master') ? 'Mastercard' :
    normalizedMethod.includes('visa') ? 'Visa' :
    normalizedMethod.includes('amex') ? 'Amex' :
    normalizedMethod.includes('card') ? 'Card' :
    payment.method || 'Card';

  return {
    id: payment.id || String(index + 1),
    type: 'credit',
    last4,
    expiry: '--/--',
    brand,
    isDefault: index === 0,
  };
};

const getStatusColor = (status: BillingStatus) => {
  const colors: Record<BillingStatus, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  };
  return colors[status];
};

export default function BillingPage() {
  const { t } = useLanguage();
  const { canManageBilling, isSuperAdmin } = usePermissions();
  const canMutateBilling = canManageBilling || isSuperAdmin;

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError('');

    const [invoicesResult, paymentsResult] = await Promise.allSettled([
      getSalesInvoices(),
      getFinancePayments(),
    ]);

    if (invoicesResult.status === 'fulfilled') {
      setInvoices(invoicesResult.value);
    } else {
      setInvoices([]);
      setError(
        invoicesResult.reason instanceof Error
          ? invoicesResult.reason.message
          : 'Failed to load billing invoices'
      );
    }

    if (paymentsResult.status === 'fulfilled') {
      setPayments(paymentsResult.value);
    } else {
      setPayments([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const paymentMethods = useMemo(() => {
    const seen = new Set<string>();
    const methods: PaymentMethod[] = [];

    payments.forEach((payment, index) => {
      const method = paymentMethodFromPayment(payment, index);
      const key = `${method.brand}:${method.last4}`;
      if (seen.has(key)) return;
      seen.add(key);
      methods.push(method);
    });

    return methods;
  }, [payments]);

  const invoiceRows = useMemo(
    () =>
      invoices.map((invoice) => ({
        id: invoice.id,
        date: invoice.date,
        amount: invoice.total,
        status: normalizeInvoiceStatus(invoice.status),
        description: invoice.number || invoice.customer_name || invoice.id,
      })),
    [invoices]
  );

  const pendingBalance = useMemo(
    () =>
      invoiceRows
        .filter((invoice) => invoice.status !== 'paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    [invoiceRows]
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.billing.title')}</h1>
            <p className="text-gray-600">{t('pages.billing.subtitle')}</p>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.billing.paymentMethods')}</h3>
              {canMutateBilling && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  {t('pages.billing.addNewCard')}
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center mr-4">
                        <CreditCard className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium text-gray-900">{method.brand}</p>
                          <span className="ml-2 text-gray-500">•••• {method.last4}</span>
                          {method.isDefault && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{t('pages.invoice.invoiceDate')}: {method.expiry}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!method.isDefault && canMutateBilling && (
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title={t('common.enable')}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {canMutateBilling && (
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title={t('common.edit')}>
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canMutateBilling && (
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title={t('common.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!loading && paymentMethods.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('common.noResults')}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.billing.billingHistory')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.billing.invoice')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.invoice.invoiceDate')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.billing.description')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.billing.amount')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.orders.table.status')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.billing.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceRows.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        <Link href={`/invoice?id=${encodeURIComponent(invoice.id)}`} className="hover:underline">
                          {invoice.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{invoice.date || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{invoice.description || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">${invoice.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {t(`pages.orders.filters.${invoice.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title={t('common.download')}>
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && invoiceRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-gray-500 text-center">
                        {t('common.noResults')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.billing.accountBalance')}</h3>
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">{t('pages.billing.currentBalance')}</p>
              <p className="text-4xl font-bold text-gray-900">${pendingBalance.toFixed(2)}</p>
              <p className="text-sm text-green-600 mt-2">
                {pendingBalance > 0 ? t('pages.orders.filters.pending') : t('pages.billing.noOutstandingBalance')}
              </p>
            </div>
            {canMutateBilling && (
              <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                {t('pages.billing.payBalance')}
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.billing.billingAddress')}</h3>
              {canMutateBilling && (
                <button className="text-blue-600 hover:text-blue-700 text-sm" title={t('common.edit')}>
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-gray-600">
              <p className="font-medium text-gray-900">{invoices[0]?.customer_name || '—'}</p>
              <p>—</p>
              <p>—</p>
              <p>—</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.billing.billingSettings')}</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">{t('pages.billing.emailReceipts')}</p>
                  <p className="text-sm text-gray-500">{t('pages.settings.notifications.emailDesc')}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">{t('pages.billing.autoPay')}</p>
                  <p className="text-sm text-gray-500">{t('pages.settings.notifications.pushDesc')}</p>
                </div>
                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
