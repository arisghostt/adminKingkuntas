import { apiClient } from './apiClient';

type CustomerStatus = 'active' | 'inactive' | 'blocked';

interface CustomerListItemPayload {
  id?: string | number;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  orders?: number | string | CustomerOrderPayload[];
  orders_count?: number | string;
  total_spent?: number | string;
  totalSpent?: number | string;
  join_date?: string;
  joinDate?: string;
  status?: string;
}

interface CustomerOrderPayload {
  id?: string | number;
  date?: string;
  total?: number | string;
  status?: string;
  items?: number | string;
  items_count?: number | string;
}

interface CustomerDetailPayload extends CustomerListItemPayload {
  orders?: CustomerOrderPayload[];
  orders_count?: number | string;
  notes?: string;
  avg_order_value?: number | string;
  avgOrderValue?: number | string;
  last_order_date?: string;
  lastOrderDate?: string;
}

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  orders: number;
  totalSpent: number;
  joinDate: string;
  status: CustomerStatus;
}

export interface CustomerOrder {
  id: string;
  date: string;
  total: number;
  status: string;
  items: number;
}

export interface CustomerDetail extends CustomerListItem {
  notes: string;
  avgOrderValue: number;
  lastOrderDate: string;
  ordersHistory: CustomerOrder[];
}

export interface CustomerQueryParams {
  search?: string;
  status?: string;
  sort?: string;
}

export interface CustomerPatchPayload {
  status?: 'active' | 'inactive' | 'blocked';
  notes?: string;
}

const CUSTOMER_COLLECTION_ENDPOINTS = [
  '/api/parties/customers/',
  '/api/parties/customers',
  '/api/admin/customers',
  '/api/admin/customers/',
  '/api/customers/',
  '/api/customers',
  '/customers/',
  '/customers',
] as const;

const CUSTOMER_ENDPOINT_UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
const CUSTOMER_ALL_FAILED_COOLDOWN_MS = 30 * 1000;

let preferredCustomerCollectionEndpoint: string | null = null;
const customerEndpointUnavailableUntil = new Map<string, number>();
let customerCollectionAllFailedUntil = 0;

const getErrorStatus = (error: unknown): number | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
  ) {
    return (error as { response?: { status?: number } }).response?.status ?? null;
  }
  return null;
};

const shouldTryNextEndpoint = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status === 403 || status === 404 || status === 405;
};

const getCandidateCollectionEndpoints = (): string[] => {
  const uniqueEndpoints = Array.from(new Set(CUSTOMER_COLLECTION_ENDPOINTS));
  const now = Date.now();
  const availableEndpoints = uniqueEndpoints.filter(
    (endpoint) => (customerEndpointUnavailableUntil.get(endpoint) ?? 0) <= now
  );

  const pool = availableEndpoints.length > 0 ? availableEndpoints : uniqueEndpoints;
  if (
    preferredCustomerCollectionEndpoint &&
    (pool as string[]).includes(preferredCustomerCollectionEndpoint)
  ) {
    return [
      preferredCustomerCollectionEndpoint,
      ...pool.filter((endpoint) => endpoint !== preferredCustomerCollectionEndpoint),
    ];
  }

  return pool;
};

const requestWithCustomerCollectionFallback = async <T>(
  request: (endpoint: string) => Promise<T>
): Promise<T> => {
  const now = Date.now();
  if (customerCollectionAllFailedUntil > now) {
    throw new Error('No customer endpoint is currently available.');
  }

  let lastRecoverableError: unknown = null;
  const candidates = getCandidateCollectionEndpoints();

  for (const endpoint of candidates) {
    try {
      const payload = await request(endpoint);
      preferredCustomerCollectionEndpoint = endpoint;
      customerCollectionAllFailedUntil = 0;
      return payload;
    } catch (error) {
      if (shouldTryNextEndpoint(error)) {
        lastRecoverableError = error;
        customerEndpointUnavailableUntil.set(
          endpoint,
          Date.now() + CUSTOMER_ENDPOINT_UNAVAILABLE_TTL_MS
        );
        continue;
      }
      throw error;
    }
  }

  customerCollectionAllFailedUntil = Date.now() + CUSTOMER_ALL_FAILED_COOLDOWN_MS;
  throw lastRecoverableError ?? new Error('No customer endpoint is currently available.');
};

const toCustomerDetailPath = (collectionEndpoint: string, id: string): string => {
  const base = collectionEndpoint.replace(/\/+$/, '');
  return collectionEndpoint.endsWith('/') ? `${base}/${id}/` : `${base}/${id}`;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeStatus = (value: unknown): CustomerStatus => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'active') return 'active';
  if (normalized === 'blocked') return 'blocked';
  return 'inactive';
};

const normalizeJoinDate = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value.includes('T') ? value.split('T')[0] : value;
};

const normalizeOrder = (payload: CustomerOrderPayload): CustomerOrder => ({
  id: String(payload.id ?? ''),
  date: normalizeJoinDate(payload.date),
  total: toNumber(payload.total),
  status: (() => {
    const normalized = typeof payload.status === 'string' ? payload.status.toLowerCase() : '';
    if (normalized === 'delivered') return 'delivered';
    if (normalized === 'shipped') return 'shipped';
    if (normalized === 'cancelled') return 'cancelled';
    if (normalized === 'confirmed') return 'processing';
    if (normalized === 'processing') return 'processing';
    return 'pending';
  })(),
  items: Math.trunc(toNumber(payload.items_count ?? payload.items)),
});

const normalizeCustomerListItem = (payload: CustomerListItemPayload): CustomerListItem => ({
  id: String(payload.id ?? ''),
  name: typeof payload.name === 'string' ? payload.name : '',
  email: typeof payload.email === 'string' ? payload.email : '',
  phone: typeof payload.phone === 'string' ? payload.phone : '',
  location: typeof payload.location === 'string' ? payload.location : '',
  orders: Math.trunc(toNumber(payload.orders ?? payload.orders_count)),
  totalSpent: toNumber(payload.total_spent ?? payload.totalSpent),
  joinDate: normalizeJoinDate(payload.join_date ?? payload.joinDate),
  status: normalizeStatus(payload.status),
});

const normalizeCustomerDetail = (payload: CustomerDetailPayload): CustomerDetail => {
  const base = normalizeCustomerListItem(payload);
  const ordersRaw = Array.isArray(payload.orders) ? payload.orders : [];

  return {
    ...base,
    orders: Math.trunc(toNumber(payload.orders_count ?? payload.orders ?? base.orders)),
    notes: typeof payload.notes === 'string' ? payload.notes : '',
    avgOrderValue: toNumber(payload.avg_order_value ?? payload.avgOrderValue),
    lastOrderDate: normalizeJoinDate(payload.last_order_date ?? payload.lastOrderDate),
    ordersHistory: ordersRaw.map(normalizeOrder),
  };
};

const extractListPayload = (payload: unknown): CustomerListItemPayload[] => {
  if (Array.isArray(payload)) return payload as CustomerListItemPayload[];
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { results?: unknown[] }).results)
  ) {
    return (payload as { results: CustomerListItemPayload[] }).results;
  }
  return [];
};

export const getCustomers = async (params: CustomerQueryParams = {}) => {
  const response = await requestWithCustomerCollectionFallback((endpoint) =>
    apiClient.get<unknown>(endpoint, { params })
  );
  return extractListPayload(response.data).map(normalizeCustomerListItem);
};

export const getCustomerById = async (id: string) => {
  const response = await requestWithCustomerCollectionFallback((endpoint) =>
    apiClient.get<CustomerDetailPayload>(toCustomerDetailPath(endpoint, id))
  );
  return normalizeCustomerDetail(response.data);
};

export const updateCustomer = async (id: string, data: CustomerPatchPayload) => {
  const response = await requestWithCustomerCollectionFallback((endpoint) =>
    apiClient.patch<CustomerDetailPayload>(toCustomerDetailPath(endpoint, id), data)
  );
  return normalizeCustomerDetail(response.data);
};

export const deleteCustomer = async (id: string) => {
  await requestWithCustomerCollectionFallback((endpoint) =>
    apiClient.delete(toCustomerDetailPath(endpoint, id))
  );
};
