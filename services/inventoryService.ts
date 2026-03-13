import { API_BASE_URL, apiClient } from './apiClient';

export interface InventoryStats {
  total_products: number;
  stock_in_month: number;
  stock_out_month: number;
  low_stock_count: number;
  total_products_change: number;
  stock_in_change: number;
  stock_out_change: number;
  low_stock_change: number;
}

export interface StockMovement {
  id: number;
  product_id: string;
  product_name: string;
  product_image: string;
  category: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  date: string;
  current_stock_after: number;
}

export interface LowStockItem {
  id: string;
  product_name: string;
  product_image: string;
  current_stock: number;
  min_stock: number;
  category: string;
  last_restocked: string;
  status: 'critical' | 'warning' | 'out_of_stock';
}

export interface AlertsSummary {
  critical: number;
  warning: number;
  out_of_stock: number;
}

export interface AnalyticsData {
  movements_chart: { date: string; stock_in: number; stock_out: number }[];
  by_category: { category: string; total_products: number; total_stock: number; percentage: number }[];
  top_products: { product_name: string; total_movements: number; stock_in: number; stock_out: number }[];
}

export interface StockMovementsQueryParams {
  type?: 'in' | 'out';
  search?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}

export interface StockMovementsResponse {
  results: StockMovement[];
  total: number;
  page: number;
  page_size: number;
}

export interface InventoryAlertsResponse {
  summary: AlertsSummary;
  items: LowStockItem[];
}

interface StockMovementPayload {
  id?: number | string;
  product_id?: number | string;
  product_name?: string;
  product?: string;
  product_image?: string;
  image?: string;
  category?: string;
  type?: string;
  quantity?: number | string;
  reason?: string;
  date?: string;
  created_at?: string;
  current_stock_after?: number | string;
  stock_after?: number | string;
}

interface StockMovementsPayload {
  results?: StockMovementPayload[];
  count?: number | string;
  total?: number | string;
  page?: number | string;
  page_size?: number | string;
}

interface LowStockItemPayload {
  id?: number | string;
  product_id?: number | string;
  product_name?: string;
  name?: string;
  product_image?: string;
  image?: string;
  current_stock?: number | string;
  stock?: number | string;
  min_stock?: number | string;
  category?: string;
  last_restocked?: string;
  status?: string;
}

interface AlertsSummaryPayload {
  critical?: number | string;
  warning?: number | string;
  out_of_stock?: number | string;
}

interface InventoryAlertsPayload {
  summary?: AlertsSummaryPayload;
  items?: LowStockItemPayload[];
  results?: LowStockItemPayload[];
}

interface AnalyticsPayload {
  movements_chart?: Array<Record<string, unknown>>;
  by_category?: Array<Record<string, unknown>>;
  top_products?: Array<Record<string, unknown>>;
}

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
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const normalized = value.trim();
  return normalized.includes('T') ? normalized.split('T')[0] : normalized;
};

const resolveAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const normalized = value.trim();

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/media/')) return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;

  return normalized;
};

const normalizeMovementType = (value: unknown): 'in' | 'out' => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'out' ? 'out' : 'in';
};

const normalizeAlertStatus = (value: unknown): 'critical' | 'warning' | 'out_of_stock' => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'critical') return 'critical';
  if (normalized === 'out_of_stock' || normalized === 'out-of-stock') return 'out_of_stock';
  return 'warning';
};

const normalizeInventoryStats = (payload: unknown): InventoryStats => {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const nested =
    (root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null) ??
    (root.result && typeof root.result === 'object' ? (root.result as Record<string, unknown>) : null) ??
    (root.results && typeof root.results === 'object' ? (root.results as Record<string, unknown>) : null) ??
    (root.stats && typeof root.stats === 'object' ? (root.stats as Record<string, unknown>) : null);
  const record = nested ?? root;

  return {
    total_products: Math.trunc(
      toNumber(record.total_products ?? record.totalProducts ?? record.products_count ?? record.productsCount)
    ),
    stock_in_month: Math.trunc(
      toNumber(record.stock_in_month ?? record.stockInMonth ?? record.stock_in ?? record.stockIn)
    ),
    stock_out_month: Math.trunc(
      toNumber(record.stock_out_month ?? record.stockOutMonth ?? record.stock_out ?? record.stockOut)
    ),
    low_stock_count: Math.trunc(
      toNumber(record.low_stock_count ?? record.lowStockCount ?? record.low_stock ?? record.lowStock)
    ),
    total_products_change: toNumber(record.total_products_change ?? record.totalProductsChange),
    stock_in_change: toNumber(record.stock_in_change ?? record.stockInChange),
    stock_out_change: toNumber(record.stock_out_change ?? record.stockOutChange),
    low_stock_change: toNumber(record.low_stock_change ?? record.lowStockChange),
  };
};

const normalizeStockMovement = (payload: StockMovementPayload): StockMovement => ({
  id: Math.trunc(toNumber(payload.id)),
  product_id: String(payload.product_id ?? ''),
  product_name:
    typeof payload.product_name === 'string'
      ? payload.product_name
      : typeof payload.product === 'string'
        ? payload.product
        : '',
  product_image: resolveAssetUrl(payload.product_image ?? payload.image),
  category: typeof payload.category === 'string' ? payload.category : '',
  type: normalizeMovementType(payload.type),
  quantity: Math.trunc(toNumber(payload.quantity)),
  reason: typeof payload.reason === 'string' ? payload.reason : '',
  date: normalizeDate(payload.date ?? payload.created_at),
  current_stock_after: Math.trunc(toNumber(payload.current_stock_after ?? payload.stock_after)),
});

const normalizeStockMovementsResponse = (payload: unknown): StockMovementsResponse => {
  if (Array.isArray(payload)) {
    const results = payload.map((item) => normalizeStockMovement(item as StockMovementPayload));
    return {
      results,
      total: results.length,
      page: 1,
      page_size: results.length,
    };
  }

  const record =
    payload && typeof payload === 'object' ? (payload as StockMovementsPayload) : {};
  const results = Array.isArray(record.results) ? record.results.map(normalizeStockMovement) : [];

  return {
    results,
    total: Math.trunc(toNumber(record.total ?? record.count ?? results.length)),
    page: Math.trunc(toNumber(record.page || 1)),
    page_size: Math.trunc(toNumber(record.page_size || results.length)),
  };
};

const normalizeLowStockItem = (payload: LowStockItemPayload): LowStockItem => ({
  id: String(payload.id ?? payload.product_id ?? ''),
  product_name:
    typeof payload.product_name === 'string'
      ? payload.product_name
      : typeof payload.name === 'string'
        ? payload.name
        : '',
  product_image: resolveAssetUrl(payload.product_image ?? payload.image),
  current_stock: Math.trunc(toNumber(payload.current_stock ?? payload.stock)),
  min_stock: Math.trunc(toNumber(payload.min_stock)),
  category: typeof payload.category === 'string' ? payload.category : '',
  last_restocked: normalizeDate(payload.last_restocked),
  status: normalizeAlertStatus(payload.status),
});

const normalizeAlertsSummary = (payload: AlertsSummaryPayload | undefined): AlertsSummary => ({
  critical: Math.trunc(toNumber(payload?.critical)),
  warning: Math.trunc(toNumber(payload?.warning)),
  out_of_stock: Math.trunc(toNumber(payload?.out_of_stock)),
});

const normalizeInventoryAlerts = (payload: unknown): InventoryAlertsResponse => {
  if (Array.isArray(payload)) {
    const items = payload.map((item) => normalizeLowStockItem(item as LowStockItemPayload));
    return {
      summary: {
        critical: items.filter((item) => item.status === 'critical').length,
        warning: items.filter((item) => item.status === 'warning').length,
        out_of_stock: items.filter((item) => item.status === 'out_of_stock').length,
      },
      items,
    };
  }

  const record =
    payload && typeof payload === 'object' ? (payload as InventoryAlertsPayload) : {};

  const itemsRaw = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.results)
      ? record.results
      : [];
  const items = itemsRaw.map(normalizeLowStockItem);

  return {
    summary: normalizeAlertsSummary(record.summary),
    items,
  };
};

const normalizeAnalytics = (payload: unknown): AnalyticsData => {
  const record = payload && typeof payload === 'object' ? (payload as AnalyticsPayload) : {};

  return {
    movements_chart: Array.isArray(record.movements_chart)
      ? record.movements_chart.map((item) => ({
        date: normalizeDate(item.date),
        stock_in: Math.trunc(toNumber(item.stock_in)),
        stock_out: Math.trunc(toNumber(item.stock_out)),
      }))
      : [],
    by_category: Array.isArray(record.by_category)
      ? record.by_category.map((item) => ({
        category: typeof item.category === 'string' ? item.category : '',
        total_products: Math.trunc(toNumber(item.total_products)),
        total_stock: Math.trunc(toNumber(item.total_stock)),
        percentage: toNumber(item.percentage),
      }))
      : [],
    top_products: Array.isArray(record.top_products)
      ? record.top_products.map((item) => ({
        product_name: typeof item.product_name === 'string' ? item.product_name : '',
        total_movements: Math.trunc(toNumber(item.total_movements)),
        stock_in: Math.trunc(toNumber(item.stock_in)),
        stock_out: Math.trunc(toNumber(item.stock_out)),
      }))
      : [],
  };
};

export const getInventoryStats = async (): Promise<InventoryStats> => {
  const response = await apiClient.get('/api/admin/inventory/stats/');
  return normalizeInventoryStats(response.data);
};

export const getStockMovements = async (
  params: StockMovementsQueryParams = {}
): Promise<StockMovementsResponse> => {
  const response = await apiClient.get('/api/admin/inventory/movements', { params });
  return normalizeStockMovementsResponse(response.data);
};

export const createStockMovement = async (data: {
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
}): Promise<StockMovement> => {
  const response = await apiClient.post('/api/admin/inventory/movements', data);
  return normalizeStockMovement(response.data as StockMovementPayload);
};

export const getInventoryAlerts = async (status?: string): Promise<InventoryAlertsResponse> => {
  const response = await apiClient.get('/api/admin/inventory/alerts', {
    params: status && status !== 'all' ? { status } : undefined,
  });
  return normalizeInventoryAlerts(response.data);
};

export const restockProduct = async (
  productId: string,
  data: { quantity: number; reason?: string }
): Promise<void> => {
  await apiClient.patch(`/api/admin/inventory/alerts/${productId}/restock`, data);
};

export const getAnalytics = async (period: '7d' | '30d' | '90d'): Promise<AnalyticsData> => {
  const response = await apiClient.get('/api/admin/inventory/analytics', {
    params: { period },
  });
  return normalizeAnalytics(response.data);
};

export const exportMovements = async (params: StockMovementsQueryParams = {}): Promise<void> => {
  const response = await apiClient.get('/api/admin/inventory/export', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = `inventory-movements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};
