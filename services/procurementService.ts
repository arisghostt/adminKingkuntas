import { apiClient } from './apiClient';

export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';

export interface GoodsReceipt {
  id: string;
  date: string;
  supplier_name: string;
  reference: string;
  total: number;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_name: string;
  reference: string;
  date: string;
  expected_date: string;
  total: number;
  status: PurchaseOrderStatus;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeDate = (value: unknown): string => {
  const text = toText(value);
  if (!text) return '';
  return text.includes('T') ? text.split('T')[0] : text;
};

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const record = toRecord(payload);

  const candidates = ['results', 'items', 'data', 'purchase_orders', 'goods_receipts'];
  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
};

const normalizePurchaseOrderStatus = (value: unknown): PurchaseOrderStatus => {
  const status = toText(value).toLowerCase();
  if (status === 'pending') return 'pending';
  if (status === 'approved') return 'approved';
  if (status === 'received') return 'received';
  if (status === 'cancelled') return 'cancelled';
  return 'draft';
};

const normalizeGoodsReceipt = (payload: unknown): GoodsReceipt => {
  const record = toRecord(payload);
  const supplier = toRecord(record.supplier);

  return {
    id: String(record.id ?? ''),
    date: normalizeDate(record.date ?? record.created_at),
    supplier_name: toText(record.supplier_name ?? supplier.name ?? supplier.full_name),
    reference: toText(record.reference ?? record.number ?? record.code),
    total: toNumber(record.total ?? record.total_amount ?? record.amount),
    status: toText(record.status) || 'received',
  };
};

const normalizePurchaseOrder = (payload: unknown): PurchaseOrder => {
  const record = toRecord(payload);
  const supplier = toRecord(record.supplier);

  return {
    id: String(record.id ?? ''),
    supplier_name: toText(record.supplier_name ?? supplier.name ?? supplier.full_name),
    reference: toText(record.reference ?? record.number ?? record.code),
    date: normalizeDate(record.date ?? record.created_at),
    expected_date: normalizeDate(record.expected_date ?? record.delivery_date),
    total: toNumber(record.total ?? record.total_amount ?? record.amount),
    status: normalizePurchaseOrderStatus(record.status),
  };
};

export const getGoodsReceipts = async (): Promise<GoodsReceipt[]> => {
  const response = await apiClient.get<unknown>('/api/procurement/goods-receipts/');
  return extractList<unknown>(response.data).map(normalizeGoodsReceipt);
};

export const createGoodsReceipt = async (
  data: Record<string, unknown>
): Promise<GoodsReceipt> => {
  const response = await apiClient.post<unknown>('/api/procurement/goods-receipts/', data);
  return normalizeGoodsReceipt(response.data);
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const response = await apiClient.get<unknown>('/api/procurement/purchase-orders/');
  return extractList<unknown>(response.data).map(normalizePurchaseOrder);
};

export const createPurchaseOrder = async (
  data: Record<string, unknown>
): Promise<PurchaseOrder> => {
  const response = await apiClient.post<unknown>('/api/procurement/purchase-orders/', data);
  return normalizePurchaseOrder(response.data);
};

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const response = await apiClient.get<unknown>(`/api/procurement/purchase-orders/${id}/`);
  return normalizePurchaseOrder(response.data);
};

export const updatePurchaseOrder = async (
  id: string,
  data: Record<string, unknown>
): Promise<PurchaseOrder> => {
  const response = await apiClient.put<unknown>(`/api/procurement/purchase-orders/${id}/`, data);
  return normalizePurchaseOrder(response.data);
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/procurement/purchase-orders/${id}/`);
};
