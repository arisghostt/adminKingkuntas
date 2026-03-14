import { apiClient } from './apiClient';

export type SalesStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface SalesInvoice {
  id: string;
  number: string;
  date: string;
  due_date: string;
  status: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  payment_method: string;
  payment_date: string;
  items: Array<{ description: string; quantity: number; price: number }>;
}

export interface SalesOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  status: SalesStatus;
  date: string;
  total: number;
  items_count: number;
  warehouse_id?: string | null;
  stock_status?: 'ok' | 'partial' | 'insufficient' | null;
  customer_id?: string;
}

type ListResponse<T> = { results: T[] };

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const normalizeDate = (value: unknown): string => {
  const text = toText(value);
  if (!text) return '';
  return text.includes('T') ? text.split('T')[0] : text;
};

const normalizeOrderStatus = (value: unknown): SalesStatus => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'processing' || normalized === 'confirmed') return 'processing';
  if (normalized === 'shipped') return 'shipped';
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
};

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.results)) return record.results as T[];
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.data)) return record.data as T[];

  return [];
};

const normalizeInvoice = (payload: unknown): SalesInvoice => {
  const record = toRecord(payload);
  const customer = toRecord(record.customer);
  const items = Array.isArray(record.items)
    ? (record.items as unknown[]).map((entry) => {
      const item = toRecord(entry);
      return {
        description: toText(item.description ?? item.name ?? item.product_name),
        quantity: Math.trunc(toNumber(item.quantity)),
        price: toNumber(item.price ?? item.unit_price),
      };
    })
    : [];

  return {
    id: String(record.id ?? record.invoice_id ?? ''),
    number: toText(record.number ?? record.invoice_number ?? record.id),
    date: normalizeDate(record.date ?? record.created_at),
    due_date: normalizeDate(record.due_date ?? record.dueDate),
    status: toText(record.status) || 'pending',
    customer_name:
      toText(record.customer_name ?? customer.name ?? customer.full_name ?? customer.username) || 'Customer',
    customer_email: toText(record.customer_email ?? customer.email),
    subtotal: toNumber(record.subtotal),
    tax: toNumber(record.tax),
    shipping: toNumber(record.shipping),
    total: toNumber(record.total ?? record.total_amount ?? record.amount),
    payment_method: toText(record.payment_method),
    payment_date: normalizeDate(record.payment_date),
    items,
  };
};

const normalizeOrder = (payload: unknown): SalesOrder => {
  const record = toRecord(payload);
  const customer = toRecord(record.customer);

  return {
    id: String(record.id ?? ''),
    customer_name:
      toText(
        record.customer_name ??
        record.customer_full_name ??
        customer.name ??
        customer.full_name ??
        customer.username
      ) || 'Customer',
    customer_email: toText(record.customer_email ?? record.email ?? customer.email),
    status: normalizeOrderStatus(record.status ?? record.order_status),
    date: normalizeDate(record.date ?? record.created_at),
    total: toNumber(record.total ?? record.total_amount ?? record.amount),
    items_count: Math.trunc(toNumber(record.items_count ?? record.item_count ?? record.products_count)),
    warehouse_id: record.warehouse_id != null ? String(record.warehouse_id) : null,
    stock_status: (record.stock_status as any) || null,
    customer_id: String(record.customer_id ?? customer.id ?? ''),
  };
};

export const getSalesInvoices = async (): Promise<SalesInvoice[]> => {
  const response = await apiClient.get<unknown>('/api/sales/invoices/');
  return extractList<unknown>(response.data).map(normalizeInvoice);
};

export const createSalesInvoice = async (data: Record<string, unknown>): Promise<SalesInvoice> => {
  const response = await apiClient.post<unknown>('/api/sales/invoices/', data);
  return normalizeInvoice(response.data);
};

export const getSalesOrders = async (): Promise<SalesOrder[]> => {
  const response = await apiClient.get<unknown>('/api/sales/orders/');
  return extractList<unknown>(response.data).map(normalizeOrder);
};

export const createSalesOrder = async (data: Record<string, unknown>): Promise<SalesOrder> => {
  const response = await apiClient.post<unknown>('/api/sales/orders/', data);
  return normalizeOrder(response.data);
};

export const getSalesOrderById = async (id: string): Promise<SalesOrder> => {
  const response = await apiClient.get<unknown>(`/api/sales/orders/${id}/`);
  return normalizeOrder(response.data);
};

export const updateSalesOrder = async (
  id: string,
  data: Record<string, unknown>
): Promise<SalesOrder> => {
  const response = await apiClient.put<unknown>(`/api/sales/orders/${id}/`, data);
  return normalizeOrder(response.data);
};

export const deleteSalesOrder = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/sales/orders/${id}/`);
};

export const updateSalesOrderStatus = async (
  id: string,
  status: string
): Promise<SalesOrder> => {
  try {
    const response = await apiClient.patch<unknown>(`/api/sales/orders/${id}/status/`, { status });
    return normalizeOrder(response.data);
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      const response = await apiClient.put<unknown>(`/api/sales/orders/${id}/`, { status });
      return normalizeOrder(response.data);
    }
    throw err;
  }
};

export const refundSalesOrder = async (
  id: string,
  data: { reason?: string; amount?: number }
): Promise<Record<string, unknown>> => {
  const response = await apiClient.post<Record<string, unknown>>(`/api/sales/orders/${id}/refund/`, data);
  return response.data;
};

export const checkStockAvailability = async (orderId: string): Promise<{ status: 'ok' | 'partial' | 'insufficient'; issues: any[] }> => {
  const response = await apiClient.get<any>(`/api/sales/orders/${orderId}/stock-check/`);
  return {
    status: response.data.status || 'insufficient',
    issues: response.data.issues || [],
  };
};

export const createInvoiceFromOrder = async (order: SalesOrder): Promise<SalesInvoice> => {
  const response = await apiClient.post<unknown>('/api/sales/invoices/', {
    sales_order_id: order.id,
    customer_id: order.customer_id,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: order.total, // Simplified: using total as subtotal for now
    tax_amount: 0,
    total_amount: order.total,
    status: 'DRAFT',
  });
  return normalizeInvoice(response.data);
};

export type SalesListResponse<T> = ListResponse<T>;

