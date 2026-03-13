import { apiClient } from './apiClient';

export interface CartItem {
  id: number;
  product_id: string;
  name: string;
  image: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface CartSummary {
  items: CartItem[];
  total_items: number;
  subtotal: number;
  total: number;
}

export interface AddCartItemPayload {
  product_id: string | number;
  quantity: number;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

interface CartItemPayload {
  id?: number | string;
  product_id?: number | string;
  product?: number | string | Record<string, unknown>;
  product_name?: string;
  name?: string;
  title?: string;
  image?: string;
  product_image?: string;
  unit_price?: number | string;
  price?: number | string;
  quantity?: number | string;
  subtotal?: number | string;
  total?: number | string;
}

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

const normalizeItem = (payload: CartItemPayload): CartItem => {
  const product = toRecord(payload.product);
  const quantity = Math.max(0, Math.trunc(toNumber(payload.quantity)));
  const unitPrice = toNumber(payload.unit_price ?? payload.price);
  const subtotal = toNumber(payload.subtotal ?? payload.total) || unitPrice * quantity;

  return {
    id: Math.trunc(toNumber(payload.id)),
    product_id: String(
      payload.product_id ??
        (typeof payload.product === 'number' ? payload.product : undefined) ??
        product.id ??
        ''
    ),
    name:
      toText(payload.product_name ?? payload.name ?? payload.title) ||
      toText(product.name ?? product.title) ||
      'Product',
    image: toText(payload.image ?? payload.product_image ?? product.image ?? product.image_url),
    unit_price: unitPrice,
    quantity,
    subtotal,
  };
};

const extractItems = (payload: unknown): CartItemPayload[] => {
  if (Array.isArray(payload)) return payload as CartItemPayload[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  const candidates = ['items', 'results', 'data'];
  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as CartItemPayload[];
  }

  return [];
};

const normalizeCartSummary = (payload: unknown): CartSummary => {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const items = extractItems(payload).map(normalizeItem);
  const subtotal = toNumber(record.subtotal) || items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = toNumber(record.total) || subtotal;

  return {
    items,
    total_items: Math.trunc(toNumber(record.total_items ?? record.items_count ?? items.length)),
    subtotal,
    total,
  };
};

export const getCart = async (): Promise<CartSummary> => {
  const response = await apiClient.get<unknown>('/api/cart/');
  return normalizeCartSummary(response.data);
};

export const addCartItem = async (data: AddCartItemPayload): Promise<CartSummary> => {
  const response = await apiClient.post<unknown>('/api/cart/items/', data);
  return normalizeCartSummary(response.data);
};

export const updateCartItem = async (
  id: number,
  data: UpdateCartItemPayload
): Promise<CartSummary> => {
  const response = await apiClient.put<unknown>(`/api/cart/items/${id}/`, data);
  return normalizeCartSummary(response.data);
};

export const deleteCartItem = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/cart/items/${id}/`);
};

