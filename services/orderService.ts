import { API_BASE_URL, apiClient } from './apiClient';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: OrderStatus;
  date: string;
  items: number;
  stock_status?: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface OrderDetail {
  id: string;
  customer: string;
  email: string;
  phone: string;
  total: number;
  status: OrderStatus;
  date: string;
  items: OrderItem[];
  shipping_address: string;
  billing_address: string;
  payment_method: string;
  tracking_number: string;
}

export interface OrdersQueryParams {
  search?: string;
  status?: string;
  date?: string;
  page?: number;
}

export interface RefundPayload {
  reason?: string;
  amount?: number;
}

interface OrderListPayload {
  id?: string | number;
  customer?:
  | number
  | string
  | {
    id?: string | number;
    name?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    username?: string;
    user?: {
      id?: string | number;
      name?: string;
      full_name?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      username?: string;
    };
  };
  customer_name?: string;
  customer_full_name?: string;
  customer_email?: string;
  customer_id?: string | number;
  customer_uuid?: string;
  customer_reference?: string | number;
  customer_ref?: string | number;
  client_id?: string | number;
  client_uuid?: string;
  user_id?: string | number;
  client?: string | number | { id?: string | number; name?: string; full_name?: string };
  client_name?: string;
  email?: string;
  total?: number | string;
  amount?: number | string;
  total_amount?: number | string;
  grand_total?: number | string;
  status?: string;
  order_status?: string;
  stock_status?: string;
  date?: string;
  created_at?: string;
  order_date?: string;
  items?: number | string | OrderItemPayload[];
  items_count?: number | string;
  item_count?: number | string;
  products_count?: number | string;
}

interface OrderItemPayload {
  id?: string | number;
  product_id?: string | number;
  name?: string;
  product_name?: string;
  title?: string;
  product?: {
    name?: string;
    title?: string;
    image?: string;
    image_url?: string;
  };
  quantity?: number | string;
  qty?: number | string;
  price?: number | string;
  unit_price?: number | string;
  total?: number | string;
  image?: string;
  product_image?: string;
}

interface OrderDetailPayload extends OrderListPayload {
  phone?: string;
  items?: OrderItemPayload[];
  shipping_address?: unknown;
  billing_address?: unknown;
  payment_method?: string;
  tracking_number?: string;
}

const ORDERS_LIST_ENDPOINTS = [
  '/api/sales/orders/',
  '/api/sales/orders',
  '/orders/',
  '/orders',
  '/api/admin/orders',
] as const;
const CUSTOMERS_LIST_ENDPOINTS = [
  '/api/parties/customers/',
  '/api/parties/customers',
  '/api/admin/customers',
  '/api/admin/customers/',
  '/api/customers/',
  '/api/customers',
  '/customers/',
  '/customers',
] as const;
const buildOrderDetailEndpoints = (id: string) =>
  [
    `/api/sales/orders/${id}/`,
    `/api/sales/orders/${id}`,
    `/orders/${id}/`,
    `/orders/${id}`,
    `/api/admin/orders/${id}`,
  ] as const;
const buildOrderStatusEndpoints = (id: string) =>
  [
    `/api/sales/orders/${id}/status/`,
    `/api/sales/orders/${id}/status`,
    `/orders/${id}/status/`,
    `/orders/${id}/status`,
    `/api/admin/orders/${id}/status`,
  ] as const;
const buildOrderRefundEndpoints = (id: string) =>
  [
    `/api/sales/orders/${id}/refund/`,
    `/api/sales/orders/${id}/refund`,
    `/orders/${id}/refund/`,
    `/orders/${id}/refund`,
    `/api/admin/orders/${id}/refund`,
  ] as const;

const API_ORIGIN = (() => {
  if (!API_BASE_URL) return '';
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
})();

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeDate = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) return '';
  return value.includes('T') ? value.split('T')[0] : value;
};

const normalizeStatus = (value: unknown): OrderStatus => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'processing' || normalized === 'confirmed') return 'processing';
  if (normalized === 'shipped') return 'shipped';
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
};

const resolveAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const asset = value.trim();
  if (asset.startsWith('http://') || asset.startsWith('https://')) return asset;
  if (asset.startsWith('/media/')) {
    return API_ORIGIN ? `${API_ORIGIN}${asset}` : asset;
  }
  return asset;
};

const stringifyAddress = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  const parts = [
    record.street,
    record.address,
    record.address1,
    record.city,
    record.state,
    record.postal_code,
    record.zip,
    record.country,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim());

  return parts.join(', ');
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
};

const toIdString = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return '';
};

const joinName = (firstName: unknown, lastName: unknown): string =>
  [firstName, lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');

const isLikelyIdentifier = (value: string): boolean => {
  const normalized = value.trim();
  if (normalized.length === 0) return false;

  const isNumeric = /^\d+$/.test(normalized);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized
    );
  const isObjectId = /^[0-9a-f]{24}$/i.test(normalized);

  return isNumeric || isUuid || isObjectId;
};

const resolveCustomerReference = (payload: OrderListPayload): string => {
  const customerRecord = toRecord(payload.customer);
  const nestedUser = toRecord(customerRecord.user);
  const clientRecord = toRecord(payload.client);

  const directReference = toIdString(
    payload.customer_id ??
    payload.customer_uuid ??
    payload.customer_reference ??
    payload.customer_ref ??
    payload.client_id ??
    payload.client_uuid ??
    payload.user_id ??
    customerRecord.id ??
    customerRecord.pk ??
    customerRecord.uuid ??
    customerRecord.customer_uuid ??
    customerRecord.customer_id ??
    customerRecord.user_id ??
    nestedUser.id ??
    nestedUser.pk ??
    nestedUser.uuid ??
    clientRecord.id ??
    clientRecord.pk ??
    clientRecord.uuid ??
    (typeof payload.customer === 'number' ? payload.customer : undefined) ??
    (typeof payload.client === 'number' ? payload.client : undefined)
  );

  if (directReference) return directReference;

  if (typeof payload.customer === 'string' && isLikelyIdentifier(payload.customer)) {
    return payload.customer.trim();
  }

  if (typeof payload.client === 'string' && isLikelyIdentifier(payload.client)) {
    return payload.client.trim();
  }

  return '';
};

const resolveCustomerName = (payload: OrderListPayload): string => {
  if (
    typeof payload.customer === 'string' &&
    payload.customer.trim().length > 0 &&
    !isLikelyIdentifier(payload.customer)
  ) {
    return payload.customer.trim();
  }

  if (
    typeof payload.client === 'string' &&
    payload.client.trim().length > 0 &&
    !isLikelyIdentifier(payload.client)
  ) {
    return payload.client.trim();
  }

  const customer = toRecord(payload.customer);
  const nestedUser = toRecord(customer.user);
  const client = toRecord(payload.client);

  const joinedName = joinName(customer.first_name, customer.last_name);
  const joinedCamelName = joinName(customer.firstName, customer.lastName);
  const joinedNestedName = joinName(nestedUser.first_name, nestedUser.last_name);
  const joinedNestedCamelName = joinName(nestedUser.firstName, nestedUser.lastName);

  return pickString(
    payload.customer_name,
    payload.customer_full_name,
    payload.client_name,
    customer.full_name,
    customer.name,
    joinedName,
    joinedCamelName,
    nestedUser.full_name,
    nestedUser.name,
    joinedNestedName,
    joinedNestedCamelName,
    client.full_name,
    client.name,
    customer.username,
    nestedUser.username
  );
};

const resolveCustomerEmail = (payload: OrderListPayload): string => {
  const customer = toRecord(payload.customer);
  const nestedUser = toRecord(customer.user);
  const client = toRecord(payload.client);
  return pickString(payload.email, payload.customer_email, customer.email, nestedUser.email, client.email);
};

const resolveOrderDate = (payload: OrderListPayload): string =>
  normalizeDate(payload.date ?? payload.created_at ?? payload.order_date);

const resolveOrderTotal = (payload: OrderListPayload): number =>
  toNumber(payload.total ?? payload.total_amount ?? payload.grand_total ?? payload.amount);

const resolveItemsCount = (payload: OrderListPayload): number => {
  if (Array.isArray(payload.items)) return payload.items.length;

  return Math.trunc(
    toNumber(payload.items ?? payload.items_count ?? payload.item_count ?? payload.products_count)
  );
};

const extractCustomersPayload = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as {
    results?: unknown[];
    customers?: unknown[];
    data?: { results?: unknown[]; customers?: unknown[]; data?: { results?: unknown[] } };
  };

  if (Array.isArray(root.results)) return root.results as Record<string, unknown>[];
  if (Array.isArray(root.customers)) return root.customers as Record<string, unknown>[];
  if (root.data && Array.isArray(root.data.results)) return root.data.results as Record<string, unknown>[];
  if (root.data && Array.isArray(root.data.customers)) return root.data.customers as Record<string, unknown>[];
  if (root.data && root.data.data && Array.isArray((root.data.data as { results?: unknown[] }).results)) {
    return (root.data.data as { results: Record<string, unknown>[] }).results;
  }

  return [];
};

const buildCustomerLookup = (customersPayload: unknown): Map<string, { name: string; email: string }> => {
  const lookup = new Map<string, { name: string; email: string }>();
  const customers = extractCustomersPayload(customersPayload);

  for (const raw of customers) {
    const customer = toRecord(raw);
    const nestedUser = toRecord(customer.user);
    const name = pickString(
      customer.name,
      customer.full_name,
      joinName(customer.first_name, customer.last_name),
      joinName(customer.firstName, customer.lastName),
      nestedUser.name,
      nestedUser.full_name,
      joinName(nestedUser.first_name, nestedUser.last_name),
      joinName(nestedUser.firstName, nestedUser.lastName),
      customer.username,
      nestedUser.username
    );
    const email = pickString(customer.email, nestedUser.email);

    const ids = [
      toIdString(customer.id),
      toIdString(customer.pk),
      toIdString(customer.uuid),
      toIdString(customer.customer_id),
      toIdString(customer.customer_uuid),
      toIdString(customer.user_id),
      toIdString(nestedUser.id),
      toIdString(nestedUser.pk),
      toIdString(nestedUser.uuid),
    ].filter((id) => id.length > 0);

    for (const id of ids) {
      if (!lookup.has(id)) {
        lookup.set(id, { name, email });
      }
    }
  }

  return lookup;
};

const normalizeOrder = (payload: OrderListPayload): Order => ({
  id: String(payload.id ?? ''),
  customer: resolveCustomerName(payload),
  email: resolveCustomerEmail(payload),
  total: resolveOrderTotal(payload),
  status: normalizeStatus(payload.order_status ?? payload.status),
  stock_status: payload.stock_status || null,
  date: resolveOrderDate(payload),
  items: resolveItemsCount(payload),
});

const normalizeOrderItem = (payload: OrderItemPayload): OrderItem => ({
  id: String(payload.id ?? payload.product_id ?? ''),
  name: pickString(
    payload.name,
    payload.product_name,
    payload.title,
    payload.product?.name,
    payload.product?.title
  ),
  quantity: toNumber(payload.quantity ?? payload.qty),
  price: toNumber(payload.price ?? payload.unit_price ?? payload.total),
  image: resolveAssetUrl(payload.image ?? payload.product_image ?? payload.product?.image ?? payload.product?.image_url),
});

const normalizeOrderDetail = (payload: OrderDetailPayload): OrderDetail => ({
  ...normalizeOrder(payload),
  phone: typeof payload.phone === 'string' ? payload.phone : '',
  items: Array.isArray(payload.items) ? payload.items.map(normalizeOrderItem) : [],
  shipping_address: stringifyAddress(payload.shipping_address),
  billing_address: stringifyAddress(payload.billing_address),
  payment_method: typeof payload.payment_method === 'string' ? payload.payment_method : '',
  tracking_number: typeof payload.tracking_number === 'string' ? payload.tracking_number : '',
});

const extractListPayload = (payload: unknown): OrderListPayload[] => {
  if (Array.isArray(payload)) return payload as OrderListPayload[];
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as {
    results?: OrderListPayload[];
    orders?: OrderListPayload[];
    data?: { results?: OrderListPayload[]; orders?: OrderListPayload[] };
  };

  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root.orders)) return root.orders;
  if (root.data && Array.isArray(root.data.results)) return root.data.results;
  if (root.data && Array.isArray(root.data.orders)) return root.data.orders;

  return [];
};

const isNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  typeof (error as { response?: { status?: unknown } }).response?.status === 'number' &&
  (error as { response?: { status?: number } }).response?.status === 404;

const ENDPOINT_UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
const ENDPOINT_ALL_FAILED_COOLDOWN_MS = 30 * 1000;

type EndpointCacheKey = 'orders_list' | 'customers_lookup';

const preferredEndpointByKey = new Map<EndpointCacheKey, string>();
const endpointUnavailableUntil = new Map<string, number>();
const allEndpointsFailedUntil = new Map<EndpointCacheKey, number>();

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

const isRecoverableEndpointError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status === 403 || status === 404 || status === 405;
};

const endpointCacheToken = (cacheKey: EndpointCacheKey, endpoint: string): string =>
  `${cacheKey}:${endpoint}`;

const getCandidateCachedEndpoints = (
  cacheKey: EndpointCacheKey,
  endpoints: readonly string[]
): string[] => {
  const uniqueEndpoints = Array.from(new Set(endpoints));
  const now = Date.now();
  const availableEndpoints = uniqueEndpoints.filter(
    (endpoint) => (endpointUnavailableUntil.get(endpointCacheToken(cacheKey, endpoint)) ?? 0) <= now
  );

  const pool = availableEndpoints.length > 0 ? availableEndpoints : uniqueEndpoints;
  const preferred = preferredEndpointByKey.get(cacheKey);
  if (preferred && pool.includes(preferred)) {
    return [preferred, ...pool.filter((endpoint) => endpoint !== preferred)];
  }

  return pool;
};

const requestWithEndpointFallback = async <T>(
  endpoints: readonly string[],
  request: (endpoint: string) => Promise<T>
): Promise<T> => {
  let lastNotFoundError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      return await request(endpoint);
    } catch (error) {
      if (isNotFoundError(error)) {
        lastNotFoundError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNotFoundError ?? new Error('No order endpoint is available.');
};

const requestWithCachedEndpointFallback = async <T>(
  cacheKey: EndpointCacheKey,
  endpoints: readonly string[],
  request: (endpoint: string) => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const allFailedUntil = allEndpointsFailedUntil.get(cacheKey) ?? 0;
  if (allFailedUntil > now) {
    throw new Error('No order endpoint is available.');
  }

  let lastRecoverableError: unknown = null;
  const candidates = getCandidateCachedEndpoints(cacheKey, endpoints);

  for (const endpoint of candidates) {
    try {
      const payload = await request(endpoint);
      preferredEndpointByKey.set(cacheKey, endpoint);
      allEndpointsFailedUntil.delete(cacheKey);
      return payload;
    } catch (error) {
      if (isRecoverableEndpointError(error)) {
        lastRecoverableError = error;
        endpointUnavailableUntil.set(
          endpointCacheToken(cacheKey, endpoint),
          Date.now() + ENDPOINT_UNAVAILABLE_TTL_MS
        );
        continue;
      }
      throw error;
    }
  }

  allEndpointsFailedUntil.set(cacheKey, Date.now() + ENDPOINT_ALL_FAILED_COOLDOWN_MS);
  throw lastRecoverableError ?? new Error('No order endpoint is available.');
};

const fetchCustomerLookup = async (): Promise<Map<string, { name: string; email: string }>> => {
  try {
    const response = await requestWithCachedEndpointFallback(
      'customers_lookup',
      CUSTOMERS_LIST_ENDPOINTS,
      (endpoint) => apiClient.get<unknown>(endpoint, { params: { page_size: 1000 } })
    );
    return buildCustomerLookup(response.data);
  } catch (error) {
    if (isRecoverableEndpointError(error) || isNotFoundError(error)) {
      return new Map();
    }
    return new Map();
  }
};

const inFlightOrdersRequests = new Map<string, Promise<Order[]>>();

const buildOrdersRequestKey = (params: OrdersQueryParams): string => {
  const normalizedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(normalizedEntries);
};

export const getOrders = async (params: OrdersQueryParams = {}) => {
  const requestKey = buildOrdersRequestKey(params);
  const inFlight = inFlightOrdersRequests.get(requestKey);
  if (inFlight) return inFlight;

  const requestPromise = (async (): Promise<Order[]> => {
    const response = await requestWithCachedEndpointFallback(
      'orders_list',
      ORDERS_LIST_ENDPOINTS,
      (endpoint) => apiClient.get<unknown>(endpoint, { params })
    );
    const payload = extractListPayload(response.data);
    const normalizedOrders = payload.map(normalizeOrder);

    const unresolved = payload
      .map((item, index) => ({
        index,
        ref: resolveCustomerReference(item),
        hasCustomer: normalizedOrders[index].customer.trim().length > 0,
        hasEmail: normalizedOrders[index].email.trim().length > 0,
      }))
      .filter((item) => item.ref.length > 0 && (!item.hasCustomer || !item.hasEmail));

    if (unresolved.length === 0) return normalizedOrders;

    try {
      const customerLookup = await fetchCustomerLookup();
      if (customerLookup.size === 0) return normalizedOrders;

      return normalizedOrders.map((order, index) => {
        const target = unresolved.find((entry) => entry.index === index);
        if (!target) return order;

        const customer = customerLookup.get(target.ref);
        if (!customer) return order;

        return {
          ...order,
          customer: order.customer.trim().length > 0 ? order.customer : customer.name,
          email: order.email.trim().length > 0 ? order.email : customer.email,
        };
      });
    } catch {
      return normalizedOrders;
    }
  })();

  inFlightOrdersRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightOrdersRequests.delete(requestKey);
  }
};

export const getOrderById = async (id: string) => {
  const response = await requestWithEndpointFallback(
    buildOrderDetailEndpoints(id),
    (endpoint) => apiClient.get<OrderDetailPayload>(endpoint)
  );
  return normalizeOrderDetail(response.data);
};

export const updateOrderStatus = async (id: string, status: string) => {
  const response = await requestWithEndpointFallback(
    buildOrderStatusEndpoints(id),
    (endpoint) => apiClient.patch<OrderDetailPayload>(endpoint, { status })
  );
  return normalizeOrderDetail(response.data);
};

export const refundOrder = async (id: string, data: RefundPayload) => {
  const response = await requestWithEndpointFallback(
    buildOrderRefundEndpoints(id),
    (endpoint) =>
      apiClient.post<{ success?: boolean; refund_id?: string; amount?: number }>(endpoint, data)
  );
  return response.data;
};
