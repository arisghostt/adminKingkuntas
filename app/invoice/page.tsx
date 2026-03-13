'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Download,
  Printer,
  Share2,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '../hooks/useLanguage';
import { getSalesInvoices, type SalesInvoice } from '@/services/salesService';

type InvoiceStatus = 'paid' | 'pending' | 'overdue';

interface EditableInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceDraft {
  number: string;
  status: InvoiceStatus;
  customerName: string;
  customerEmail: string;
  date: string;
  dueDate: string;
  tax: number;
  shipping: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
  items: EditableInvoiceItem[];
}

const normalizeStatus = (value: string): InvoiceStatus => {
  const status = value.trim().toLowerCase();
  if (status === 'paid' || status === 'completed') return 'paid';
  if (status === 'overdue') return 'overdue';
  return 'pending';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const toEditableItems = (invoice: SalesInvoice): EditableInvoiceItem[] => {
  if (invoice.items.length > 0) {
    return invoice.items.map((item, index) => ({
      id: `${invoice.id}-item-${index}`,
      description: item.description || '',
      quantity: Math.max(1, Math.trunc(item.quantity || 1)),
      price: Number.isFinite(item.price) ? item.price : 0,
    }));
  }

  return [
    {
      id: `${invoice.id}-item-0`,
      description: 'Custom billing item',
      quantity: 1,
      price: invoice.subtotal || invoice.total || 0,
    },
  ];
};

const createInvoiceDraft = (invoice: SalesInvoice): InvoiceDraft => ({
  number: invoice.number || invoice.id,
  status: normalizeStatus(invoice.status || 'pending'),
  customerName: invoice.customer_name || 'Customer',
  customerEmail: invoice.customer_email || '',
  date: invoice.date || '',
  dueDate: invoice.due_date || invoice.date || '',
  tax: invoice.tax,
  shipping: invoice.shipping,
  paymentMethod: invoice.payment_method || '',
  paymentDate: invoice.payment_date || invoice.date || '',
  notes: '',
  items: toEditableItems(invoice),
});

const SAMPLE_INVOICE: SalesInvoice = {
  id: 'preview',
  number: 'INV-KK-2026-001',
  date: '2026-03-08',
  due_date: '2026-03-22',
  status: 'pending',
  customer_name: 'Customer Name',
  customer_email: 'customer@example.com',
  subtotal: 180,
  tax: 18,
  shipping: 12,
  total: 210,
  payment_method: 'Bank Transfer',
  payment_date: '',
  items: [
    {
      description: 'Sample invoice item',
      quantity: 2,
      price: 90,
    },
  ],
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

export default function InvoicePage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);

  const invoiceId = searchParams.get('id');

  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await getSalesInvoices();
        setInvoices(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    void loadInvoices();
  }, []);

  const invoice = useMemo(() => {
    if (invoices.length === 0) return SAMPLE_INVOICE;
    if (invoiceId) {
      return (
        invoices.find((item) => item.id === invoiceId || item.number === invoiceId) ??
        invoices[0] ??
        SAMPLE_INVOICE
      );
    }
    return invoices[0] ?? SAMPLE_INVOICE;
  }, [invoices, invoiceId]);

  useEffect(() => {
    if (!invoice) {
      setDraft(null);
      return;
    }

    setDraft(createInvoiceDraft(invoice));
  }, [invoice]);

  const totals = useMemo(() => {
    if (!draft) {
      return { subtotal: 0, tax: 0, shipping: 0, total: 0 };
    }

    const subtotal = draft.items.reduce(
      (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.price),
      0
    );

    return {
      subtotal,
      tax: Math.max(0, draft.tax),
      shipping: Math.max(0, draft.shipping),
      total: subtotal + Math.max(0, draft.tax) + Math.max(0, draft.shipping),
    };
  }, [draft]);

  const updateDraftField = <K extends keyof InvoiceDraft,>(field: K, value: InvoiceDraft[K]) => {
    setDraft((current) => (current ? ({ ...current, [field]: value } as InvoiceDraft) : current));
  };

  const updateDraftItem = (
    itemId: string,
    field: keyof Omit<EditableInvoiceItem, 'id'>,
    value: string
  ) => {
    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        items: current.items.map((item) => {
          if (item.id !== itemId) return item;

          if (field === 'description') {
            return { ...item, description: value };
          }

          const numericValue = Number(value);
          return {
            ...item,
            [field]: Number.isFinite(numericValue)
              ? Math.max(0, field === 'quantity' ? Math.trunc(numericValue) : numericValue)
              : 0,
          };
        }),
      };
    });
  };

  const addDraftItem = () => {
    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        items: [
          ...current.items,
          {
            id: `draft-item-${Date.now()}`,
            description: '',
            quantity: 1,
            price: 0,
          },
        ],
      };
    });
  };

  const removeDraftItem = (itemId: string) => {
    setDraft((current) => {
      if (!current) return current;

      const nextItems = current.items.filter((item) => item.id !== itemId);
      return {
        ...current,
        items:
          nextItems.length > 0
            ? nextItems
            : [
                {
                  id: `draft-item-${Date.now()}`,
                  description: '',
                  quantity: 1,
                  price: 0,
                },
              ],
      };
    });
  };

  const resetDraft = () => {
    if (!invoice) return;
    setDraft(createInvoiceDraft(invoice));
  };

  const previewStatus = draft?.status ?? normalizeStatus(invoice?.status || 'pending');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href="/billing" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('pages.invoice.backToBilling')}
        </Link>

        {error ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.invoice.title')}</h1>
            {invoice ? (
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(previewStatus)}`}>
                {t(`pages.orders.filters.${previewStatus}`)}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              {t('common.share')}
            </button>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Printer className="w-4 h-4" />
              {t('common.print')}
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              {t('common.downloadPDF')}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : !draft ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          {t('common.noResults')}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-fit xl:sticky xl:top-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Invoice Preview Editor</h2>
                <p className="text-sm text-gray-500">
                  Modify the example invoice and see the document update instantly.
                </p>
              </div>
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">Invoice Number</span>
                  <input
                    type="text"
                    value={draft.number}
                    onChange={(event) => updateDraftField('number', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) => updateDraftField('status', normalizeStatus(event.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.billTo')}</span>
                  <input
                    type="text"
                    value={draft.customerName}
                    onChange={(event) => updateDraftField('customerName', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">Customer Email</span>
                  <input
                    type="email"
                    value={draft.customerEmail}
                    onChange={(event) => updateDraftField('customerEmail', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.invoiceDate')}</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => updateDraftField('date', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.dueDate')}</span>
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) => updateDraftField('dueDate', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.tax')}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.tax}
                    onChange={(event) => updateDraftField('tax', Math.max(0, Number(event.target.value) || 0))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.shipping')}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.shipping}
                    onChange={(event) =>
                      updateDraftField('shipping', Math.max(0, Number(event.target.value) || 0))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">{t('pages.orderDetails.paymentMethod')}</span>
                  <input
                    type="text"
                    value={draft.paymentMethod}
                    onChange={(event) => updateDraftField('paymentMethod', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-gray-700">Payment Date</span>
                  <input
                    type="date"
                    value={draft.paymentDate}
                    onChange={(event) => updateDraftField('paymentDate', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Invoice Items</h3>
                  <button
                    type="button"
                    onClick={addDraftItem}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {draft.items.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeDraftItem(item.id)}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm block">
                          <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.description')}</span>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) => updateDraftItem(item.id, 'description', event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-sm">
                            <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.qty')}</span>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(event) => updateDraftItem(item.id, 'quantity', event.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </label>
                          <label className="text-sm">
                            <span className="mb-1.5 block font-medium text-gray-700">{t('pages.invoice.price')}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(event) => updateDraftItem(item.id, 'price', event.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="text-sm block">
                <span className="mb-1.5 block font-medium text-gray-700">Footer Note</span>
                <textarea
                  rows={4}
                  value={draft.notes}
                  onChange={(event) => updateDraftField('notes', event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Add a note for this invoice example"
                />
              </label>
            </div>
          </aside>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 border-b border-gray-200">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
                    <Image
                      src="/kingkunta-logo.svg"
                      alt="Kingkunta"
                      width={180}
                      height={52}
                      className="h-auto w-[160px] sm:w-[180px]"
                      priority
                    />
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
                  <p className="text-gray-500 mt-2">#{draft.number || invoice.number || invoice.id}</p>
                </div>
              </div>
            </div>

            <div className="p-8 border-b border-gray-200">
              <div className="grid gap-8 md:grid-cols-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{t('pages.invoice.billTo')}</h3>
                  <p className="font-medium text-gray-900">{draft.customerName || '—'}</p>
                  <p className="text-gray-600">{draft.customerEmail || '—'}</p>
                  <p className="text-gray-600 mt-1">—</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{t('pages.invoice.invoiceDate')}</h3>
                  <p className="text-gray-900">{draft.date || '—'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{t('pages.invoice.dueDate')}</h3>
                  <p className="text-gray-900">{draft.dueDate || '—'}</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-semibold text-gray-500 uppercase">{t('pages.invoice.description')}</th>
                    <th className="text-center py-3 text-sm font-semibold text-gray-500 uppercase">{t('pages.invoice.qty')}</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase">{t('pages.invoice.price')}</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase">{t('pages.invoice.itemsTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {draft.items.length > 0 ? (
                    draft.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4 text-gray-900">{item.description || '-'}</td>
                        <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                        <td className="py-4 text-right text-gray-600">{formatCurrency(item.price)}</td>
                        <td className="py-4 text-right font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-sm text-gray-500 text-center">{t('common.noResults')}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>{t('pages.invoice.subtotal')}</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('pages.invoice.tax')}</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t('pages.invoice.shipping')}</span>
                    <span>{formatCurrency(totals.shipping)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>{t('pages.invoice.total')}</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {draft.notes.trim() ? (
                <div className="mt-8 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                  {draft.notes}
                </div>
              ) : null}
            </div>

            {draft.status === 'paid' ? (
              <div className="p-8 bg-green-50 border-t border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">{t('pages.orderDetails.paid')}</p>
                    <p className="text-sm text-green-600">
                      {t('pages.invoice.invoiceDate')}: {draft.paymentDate || draft.date || '-'} {t('pages.orderDetails.paymentMethod')}: {draft.paymentMethod || '-'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="p-8 border-t border-gray-200">
              <div className="flex flex-col gap-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t('pages.invoice.thankYou')}</p>
                  <p>{t('pages.invoice.paymentDue')}</p>
                </div>
                <div className="text-left md:text-right">
                  <p>{t('pages.invoice.questions')}</p>
                  <p className="text-blue-600">kingkunta@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
