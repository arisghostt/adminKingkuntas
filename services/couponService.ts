import { apiClient } from './apiClient';

export type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CouponStatus = 'active' | 'scheduled' | 'expired' | 'disabled';
export type ApplicableTo = 'all' | 'category' | 'product';

export interface Coupon {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  used_count: number;
  is_active: boolean;
  applicable_to: ApplicableTo;
  applicable_categories: { id: number; name: string }[];
  applicable_products: { id: number; name: string }[];
  status: CouponStatus;
  created_at: string;
}

export interface CouponStats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  total_discounts_given: number;
}

export interface AnalyticsData {
  usage_over_time: { date: string; usages_count: number; total_discount_amount: number }[];
  top_coupons: {
    code: string;
    used_count: number;
    total_discount_given: number;
    revenue_generated: number;
  }[];
  discount_by_type: { type: string; count: number; total_amount: number }[];
}

export interface CouponListResponse {
  stats: CouponStats;
  results: Coupon[];
  count: number;
  page: number;
  page_size: number;
}

export interface CouponUsage {
  order_id: string | number;
  customer_name: string;
  discount_amount: number;
  used_at: string;
}

export interface CouponDetail extends Coupon {
  recent_usages?: CouponUsage[];
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

const toCouponType = (value: unknown): CouponType => {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (type === 'fixed_amount' || type === 'free_shipping') return type;
  return 'percentage';
};

const toCouponStatus = (value: unknown): CouponStatus => {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (status === 'scheduled' || status === 'expired' || status === 'disabled') return status;
  return 'active';
};

const toApplicableTo = (value: unknown): ApplicableTo => {
  const applicable = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (applicable === 'category' || applicable === 'product') return applicable;
  return 'all';
};

const normalizeItems = (value: unknown): { id: number; name: string }[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = toRecord(item);
      return {
        id: Math.trunc(toNumber(record.id)),
        name: typeof record.name === 'string' ? record.name : '',
      };
    })
    .filter((item) => item.id > 0);
};

const normalizeCoupon = (value: unknown): Coupon => {
  const record = toRecord(value);
  return {
    id: Math.trunc(toNumber(record.id)),
    code: typeof record.code === 'string' ? record.code : '',
    type: toCouponType(record.type),
    value: toNumber(record.value),
    min_order_amount: toNullableNumber(record.min_order_amount),
    max_discount_amount: toNullableNumber(record.max_discount_amount),
    start_date: typeof record.start_date === 'string' ? record.start_date : '',
    end_date: typeof record.end_date === 'string' ? record.end_date : '',
    usage_limit: toNullableNumber(record.usage_limit),
    usage_limit_per_user: toNullableNumber(record.usage_limit_per_user),
    used_count: Math.trunc(toNumber(record.used_count)),
    is_active: Boolean(record.is_active),
    applicable_to: toApplicableTo(record.applicable_to),
    applicable_categories: normalizeItems(record.applicable_categories),
    applicable_products: normalizeItems(record.applicable_products),
    status: toCouponStatus(record.status),
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
  };
};

const normalizeStats = (value: unknown): CouponStats => {
  const record = toRecord(value);
  return {
    total: Math.trunc(toNumber(record.total)),
    active: Math.trunc(toNumber(record.active)),
    scheduled: Math.trunc(toNumber(record.scheduled)),
    expired: Math.trunc(toNumber(record.expired)),
    total_discounts_given: toNumber(record.total_discounts_given),
  };
};

const normalizeCouponListResponse = (value: unknown): CouponListResponse => {
  const root = toRecord(value);
  const data = toRecord(root.data);
  const resultsRaw = Array.isArray(root.results)
    ? root.results
    : Array.isArray(data.results)
      ? data.results
      : [];

  return {
    stats: normalizeStats(root.stats ?? data.stats),
    results: resultsRaw.map(normalizeCoupon),
    count: Math.trunc(toNumber(root.count ?? data.count ?? resultsRaw.length)),
    page: Math.trunc(toNumber(root.page ?? data.page ?? 1)),
    page_size: Math.trunc(toNumber(root.page_size ?? data.page_size ?? resultsRaw.length)),
  };
};

const normalizeRecentUsages = (value: unknown): CouponUsage[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = toRecord(item);
    return {
      order_id:
        typeof record.order_id === 'string' || typeof record.order_id === 'number'
          ? record.order_id
          : '',
      customer_name: typeof record.customer_name === 'string' ? record.customer_name : '',
      discount_amount: toNumber(record.discount_amount),
      used_at: typeof record.used_at === 'string' ? record.used_at : '',
    };
  });
};

const normalizeCouponDetail = (value: unknown): CouponDetail => {
  const record = toRecord(value);
  const coupon = normalizeCoupon(value);
  const recentUsages = normalizeRecentUsages(record.recent_usages);
  if (recentUsages.length === 0) return coupon;
  return { ...coupon, recent_usages: recentUsages };
};

const normalizeAnalytics = (value: unknown): AnalyticsData => {
  const record = toRecord(value);
  return {
    usage_over_time: Array.isArray(record.usage_over_time)
      ? record.usage_over_time.map((item) => {
          const row = toRecord(item);
          return {
            date: typeof row.date === 'string' ? row.date : '',
            usages_count: Math.trunc(toNumber(row.usages_count)),
            total_discount_amount: toNumber(row.total_discount_amount),
          };
        })
      : [],
    top_coupons: Array.isArray(record.top_coupons)
      ? record.top_coupons.map((item) => {
          const row = toRecord(item);
          return {
            code: typeof row.code === 'string' ? row.code : '',
            used_count: Math.trunc(toNumber(row.used_count)),
            total_discount_given: toNumber(row.total_discount_given),
            revenue_generated: toNumber(row.revenue_generated),
          };
        })
      : [],
    discount_by_type: Array.isArray(record.discount_by_type)
      ? record.discount_by_type.map((item) => {
          const row = toRecord(item);
          return {
            type: typeof row.type === 'string' ? row.type : '',
            count: Math.trunc(toNumber(row.count)),
            total_amount: toNumber(row.total_amount),
          };
        })
      : [],
  };
};

const normalizeCouponPayload = (data: Partial<Coupon>) => {
  const payload: Record<string, unknown> = { ...data };
  if (Array.isArray(data.applicable_categories)) {
    payload.applicable_categories = data.applicable_categories.map((item) =>
      typeof item === 'number' ? item : item.id
    );
  }
  if (Array.isArray(data.applicable_products)) {
    payload.applicable_products = data.applicable_products.map((item) =>
      typeof item === 'number' ? item : item.id
    );
  }
  return payload;
};

export const getCoupons = async (params: {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<CouponListResponse> => {
  const response = await apiClient.get('/api/admin/coupons', { params });
  return normalizeCouponListResponse(response.data);
};

export const getCouponById = async (id: number): Promise<CouponDetail> => {
  const response = await apiClient.get(`/api/admin/coupons/${id}`);
  return normalizeCouponDetail(response.data);
};

export const createCoupon = async (data: Partial<Coupon>): Promise<CouponDetail> => {
  const response = await apiClient.post('/api/admin/coupons', normalizeCouponPayload(data));
  return normalizeCouponDetail(response.data);
};

export const updateCoupon = async (id: number, data: Partial<Coupon>): Promise<CouponDetail> => {
  const response = await apiClient.put(`/api/admin/coupons/${id}`, normalizeCouponPayload(data));
  return normalizeCouponDetail(response.data);
};

export const toggleCoupon = async (id: number, is_active: boolean): Promise<CouponDetail> => {
  const response = await apiClient.patch(`/api/admin/coupons/${id}`, { is_active });
  return normalizeCouponDetail(response.data);
};

export const deleteCoupon = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/admin/coupons/${id}`);
};

export const duplicateCoupon = async (id: number): Promise<CouponDetail> => {
  const response = await apiClient.post(`/api/admin/coupons/${id}/duplicate`);
  return normalizeCouponDetail(response.data);
};

export const getAnalytics = async (period: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData> => {
  const response = await apiClient.get('/api/admin/coupons/analytics', { params: { period } });
  return normalizeAnalytics(response.data);
};
