'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Edit,
  Loader2,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useLanguage } from '../hooks/useLanguage';
import { usePermissions } from '@/app/hooks/usePermissions';
import { categoriesApi, productsApi } from '@/lib/api';
import {
  createCoupon,
  deleteCoupon,
  duplicateCoupon,
  getAnalytics,
  getCouponById,
  getCoupons,
  toggleCoupon,
  updateCoupon,
  type AnalyticsData,
  type ApplicableTo,
  type Coupon,
  type CouponStats,
  type CouponType,
} from '@/services/couponService';

type ToastState = { type: 'success' | 'error'; message: string } | null;

interface SelectableItem {
  id: number;
  name: string;
}

interface CouponFormState {
  code: string;
  type: CouponType;
  value: string;
  min_order_amount: string;
  max_discount_amount: string;
  start_date: string;
  end_date: string;
  usage_limit: string;
  usage_limit_per_user: string;
  applicable_to: ApplicableTo;
  applicable_categories: number[];
  applicable_products: number[];
}

const defaultAnalytics: AnalyticsData = {
  usage_over_time: [],
  top_coupons: [],
  discount_by_type: [],
};

const periodOptions = ['7d', '30d', '90d'] as const;

const toCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const toDateInputValue = (value: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value.includes('T')) return value.split('T')[0];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value: string, withYear = true) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  if (!withYear) return `${day}/${month}`;
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
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

const generateCouponCode = () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let output = '';
  for (let i = 0; i < 8; i += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
};

const getTypeBadgeClasses = (type: CouponType) => {
  if (type === 'percentage') return 'bg-purple-100 text-purple-700';
  if (type === 'fixed_amount') return 'bg-blue-100 text-blue-700';
  return 'bg-green-100 text-green-700';
};

const getStatusBadgeClasses = (status: Coupon['status']) => {
  if (status === 'active') return 'bg-green-100 text-green-700';
  if (status === 'scheduled') return 'bg-orange-100 text-orange-700';
  if (status === 'expired') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const getStatusDot = (status: Coupon['status']) => {
  if (status === 'active') return '●';
  if (status === 'scheduled') return '◷';
  if (status === 'expired') return '✕';
  return '○';
};

const initialFormState = (): CouponFormState => ({
  code: '',
  type: 'percentage',
  value: '',
  min_order_amount: '',
  max_discount_amount: '',
  start_date: '',
  end_date: '',
  usage_limit: '',
  usage_limit_per_user: '1',
  applicable_to: 'all',
  applicable_categories: [],
  applicable_products: [],
});

const mapCouponToForm = (coupon: Coupon): CouponFormState => ({
  code: coupon.code,
  type: coupon.type,
  value: coupon.type === 'free_shipping' ? '' : String(coupon.value),
  min_order_amount: coupon.min_order_amount == null ? '' : String(coupon.min_order_amount),
  max_discount_amount: coupon.max_discount_amount == null ? '' : String(coupon.max_discount_amount),
  start_date: toDateInputValue(coupon.start_date),
  end_date: toDateInputValue(coupon.end_date),
  usage_limit: coupon.usage_limit == null ? '' : String(coupon.usage_limit),
  usage_limit_per_user:
    coupon.usage_limit_per_user == null ? '1' : String(coupon.usage_limit_per_user),
  applicable_to: coupon.applicable_to,
  applicable_categories: coupon.applicable_categories.map((category) => category.id),
  applicable_products: coupon.applicable_products.map((product) => product.id),
});

export default function PromotionsPage() {
  const { t } = useLanguage();
  const { canManagePromotions, isSuperAdmin } = usePermissions();
  const canMutatePromotions = canManagePromotions || isSuperAdmin;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [modalStep, setModalStep] = useState(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const [form, setForm] = useState<CouponFormState>(initialFormState);
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectableItem[]>([]);
  const [productOptions, setProductOptions] = useState<SelectableItem[]>([]);

  const initializedRef = useRef(false);

  const resolveErrorMessage = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return t('pages.login.errorInvalidTokenRole');
        const detail = extractErrorDetail(err.response?.data);
        if (detail) return detail;
      }

      if (err instanceof Error && err.message.trim().length > 0) return err.message;
      return t('common.failed');
    },
    [t]
  );

  const pushToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getCoupons({
        search: debouncedSearch || undefined,
        status: statusFilter,
        type: typeFilter,
      });
      setCoupons(data.results);
      setStats(data.stats);
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
      setCoupons([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, typeFilter, resolveErrorMessage]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setError('');

    try {
      const data = await getAnalytics(analyticsPeriod);
      setAnalytics(data);
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
      setAnalytics(defaultAnalytics);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsPeriod, resolveErrorMessage]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setLoading(true);
      setAnalyticsLoading(true);
      setError('');

      try {
        const [couponResponse, analyticsResponse] = await Promise.all([
          getCoupons({ status: statusFilter, type: typeFilter }),
          getAnalytics(analyticsPeriod),
        ]);

        if (!active) return;
        setCoupons(couponResponse.results);
        setStats(couponResponse.stats);
        setAnalytics(analyticsResponse);
      } catch (initError) {
        if (!active) return;
        setError(resolveErrorMessage(initError));
        setCoupons([]);
        setStats(null);
        setAnalytics(defaultAnalytics);
      } finally {
        if (!active) return;
        setLoading(false);
        setAnalyticsLoading(false);
        initializedRef.current = true;
      }
    };

    initialize();

    return () => {
      active = false;
    };
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    if (!initializedRef.current) return;
    fetchAnalytics();
  }, [fetchAnalytics]);

  const ensureSelectableData = useCallback(async () => {
    if (categoryOptions.length > 0 && productOptions.length > 0) return;

    setOptionsLoading(true);
    setModalError('');

    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        categoriesApi.getAll(),
        productsApi.getAll(),
      ]);

      setCategoryOptions(
        categoriesResponse
          .map((category) => ({
            id: Number(category.id),
            name: category.name,
          }))
          .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name.trim().length > 0)
      );

      setProductOptions(
        productsResponse.results
          .map((product) => ({
            id: Number(product.id),
            name: product.name,
          }))
          .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name.trim().length > 0)
      );
    } catch (fetchError) {
      setModalError(resolveErrorMessage(fetchError));
    } finally {
      setOptionsLoading(false);
    }
  }, [categoryOptions.length, productOptions.length, resolveErrorMessage]);

  const resetModalState = () => {
    setModalStep(1);
    setModalError('');
    setModalSubmitting(false);
  };

  const openCreateModal = async () => {
    setEditingCoupon(null);
    setForm(initialFormState());
    resetModalState();
    setShowModal(true);
    await ensureSelectableData();
  };

  const openEditModal = async (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm(mapCouponToForm(coupon));
    resetModalState();
    setShowModal(true);

    await ensureSelectableData();

    try {
      const freshCoupon = await getCouponById(coupon.id);
      setEditingCoupon(freshCoupon);
      setForm(mapCouponToForm(freshCoupon));
    } catch {
      // Keep current list data when detail endpoint fails.
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
    setForm(initialFormState());
    resetModalState();
  };

  const validateStepOne = () => {
    if (!form.type) return t('pages.promotions.modal.validation.typeRequired');

    if (form.type !== 'free_shipping') {
      const value = Number(form.value);
      if (!Number.isFinite(value) || value <= 0) {
        return t('pages.promotions.modal.validation.valueRequired');
      }
      if (form.type === 'percentage' && value > 100) {
        return t('pages.promotions.modal.validation.percentageMax');
      }
    }

    return '';
  };

  const validateStepTwo = () => {
    if (!form.start_date || !form.end_date) {
      return t('pages.promotions.modal.validation.dateRequired');
    }

    const start = new Date(`${form.start_date}T00:00:00`);
    const end = new Date(`${form.end_date}T00:00:00`);
    if (end <= start) {
      return t('pages.promotions.modal.validation.endAfterStart');
    }

    if (form.applicable_to === 'category' && form.applicable_categories.length === 0) {
      return t('pages.promotions.modal.validation.categoryRequired');
    }

    if (form.applicable_to === 'product' && form.applicable_products.length === 0) {
      return t('pages.promotions.modal.validation.productRequired');
    }

    return '';
  };

  const handleNextStep = () => {
    const message = validateStepOne();
    if (message) {
      setModalError(message);
      return;
    }
    setModalError('');
    setModalStep(2);
  };

  const handlePreviousStep = () => {
    setModalError('');
    setModalStep(1);
  };

  const buildCouponPayload = (): Partial<Coupon> => {
    const selectedCategories = form.applicable_categories.map((id) => {
      const found = categoryOptions.find((item) => item.id === id);
      return { id, name: found?.name ?? '' };
    });

    const selectedProducts = form.applicable_products.map((id) => {
      const found = productOptions.find((item) => item.id === id);
      return { id, name: found?.name ?? '' };
    });

    const startDate = new Date(`${form.start_date}T00:00:00Z`).toISOString();
    const endDate = new Date(`${form.end_date}T23:59:59Z`).toISOString();

    return {
      code: form.code.trim() || undefined,
      type: form.type,
      value: form.type === 'free_shipping' ? 0 : Number(form.value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      max_discount_amount:
        form.type === 'percentage' && form.max_discount_amount
          ? Number(form.max_discount_amount)
          : null,
      start_date: startDate,
      end_date: endDate,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      usage_limit_per_user: form.usage_limit_per_user ? Number(form.usage_limit_per_user) : null,
      applicable_to: form.applicable_to,
      applicable_categories: form.applicable_to === 'category' ? selectedCategories : [],
      applicable_products: form.applicable_to === 'product' ? selectedProducts : [],
      is_active: editingCoupon?.is_active ?? true,
    };
  };

  const handleModalSubmit = async () => {
    const stepError = validateStepTwo();
    if (stepError) {
      setModalError(stepError);
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = buildCouponPayload();

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, payload);
        pushToast('success', t('pages.promotions.actions.updatedSuccess'));
      } else {
        await createCoupon(payload);
        pushToast('success', t('pages.promotions.actions.createdSuccess'));
      }

      closeModal();
      await Promise.all([fetchCoupons(), fetchAnalytics()]);
    } catch (submitError) {
      setModalError(resolveErrorMessage(submitError));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await toggleCoupon(coupon.id, !coupon.is_active);
      await fetchCoupons();
      pushToast('success', t('pages.promotions.actions.toggleSuccess'));
    } catch (toggleError) {
      pushToast('error', resolveErrorMessage(toggleError));
    }
  };

  const handleDuplicate = async (coupon: Coupon) => {
    try {
      await duplicateCoupon(coupon.id);
      await Promise.all([fetchCoupons(), fetchAnalytics()]);
      pushToast('success', t('pages.promotions.actions.duplicateSuccess'));
    } catch (duplicateError) {
      pushToast('error', resolveErrorMessage(duplicateError));
    }
  };

  const askDelete = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;

    try {
      await deleteCoupon(couponToDelete.id);
      setShowDeleteConfirm(false);
      setCouponToDelete(null);
      await Promise.all([fetchCoupons(), fetchAnalytics()]);
      pushToast('success', t('pages.promotions.actions.deletedSuccess'));
    } catch (deleteError) {
      pushToast('error', resolveErrorMessage(deleteError));
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      pushToast('error', t('common.failed'));
    }
  };

  const pieData = useMemo(() => {
    const source = analytics?.discount_by_type ?? [];
    return source.map((entry) => {
      const normalized = String(entry.type).toLowerCase();
      const label =
        normalized === 'percentage'
          ? t('pages.promotions.typeLabels.percentageLong')
          : normalized === 'fixed_amount'
            ? t('pages.promotions.typeLabels.fixedAmountLong')
            : t('pages.promotions.typeLabels.freeShippingLong');

      const color =
        normalized === 'percentage'
          ? '#8b5cf6'
          : normalized === 'fixed_amount'
            ? '#3b82f6'
            : '#22c55e';

      return {
        ...entry,
        label,
        color,
      };
    });
  }, [analytics?.discount_by_type, t]);

  const statsCards = useMemo(
    () => [
      {
        title: t('pages.promotions.stats.totalCoupons'),
        value: stats?.total ?? 0,
        icon: Tag,
        iconClass: 'bg-blue-100 text-blue-600',
      },
      {
        title: t('pages.promotions.stats.active'),
        value: stats?.active ?? 0,
        icon: CheckCircle,
        iconClass: 'bg-green-100 text-green-600',
      },
      {
        title: t('pages.promotions.stats.scheduled'),
        value: stats?.scheduled ?? 0,
        icon: Clock,
        iconClass: 'bg-orange-100 text-orange-600',
      },
      {
        title: t('pages.promotions.stats.expired'),
        value: stats?.expired ?? 0,
        icon: XCircle,
        iconClass: 'bg-red-100 text-red-600',
      },
    ],
    [stats, t]
  );

  return (
    <DashboardLayout>
      {toast ? (
        <div className="fixed top-4 right-4 z-[70]">
          <div
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {t('pages.promotions.title')}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('pages.promotions.subtitle')}</p>
          </div>
          {canMutatePromotions && (
            <button
              type="button"
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('pages.promotions.buttons.createCoupon')}
            </button>
          )}
        </div>
      </motion.div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8"
      >
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? 0 : card.value}</p>
                  {card.title === t('pages.promotions.stats.expired') ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {toCurrency(stats?.total_discounts_given ?? 0)} {t('pages.promotions.stats.discountsGiven')}
                    </p>
                  ) : null}
                </div>
                <div className={`p-3 rounded-full ${card.iconClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
            {t('pages.promotions.analytics.title')}
          </h3>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {periodOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnalyticsPeriod(option)}
                className={`px-3 py-1.5 text-sm ${
                  analyticsPeriod === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${analyticsLoading ? 'opacity-60' : ''}`}>
          <div className="border border-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              {t('pages.promotions.analytics.usageOverTime')}
            </h4>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.usage_over_time ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => formatDate(String(value), false)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number | string | undefined, name, item) => {
                      if (name === 'usages_count') {
                        const payload = item?.payload as { total_discount_amount?: number } | undefined;
                        return [
                          `${Number(value ?? 0)} ${t('pages.promotions.analytics.uses')}, ${toCurrency(
                            payload?.total_discount_amount ?? 0
                          )} ${t('pages.promotions.analytics.discounts')}`,
                          formatDate(String(item?.payload?.date ?? ''), false),
                        ];
                      }
                      return [String(value ?? 0), String(name ?? '')];
                    }}
                    labelFormatter={(label) => formatDate(String(label), false)}
                  />
                  <Area
                    type="monotone"
                    dataKey="usages_count"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.16}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              {t('pages.promotions.analytics.discountsByType')}
            </h4>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="44%"
                    outerRadius={80}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`${entry.type}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined, _name, item) => {
                      const payload = item?.payload as { total_amount?: number } | undefined;
                      return [
                        `${Number(value ?? 0)} • ${toCurrency(payload?.total_amount ?? 0)}`,
                        String(item?.payload?.label ?? ''),
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              {pieData.map((entry) => (
                <div key={entry.type} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 border border-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              {t('pages.promotions.analytics.topPerformingCoupons')}
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('pages.promotions.analytics.rank')}
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('pages.promotions.analytics.code')}
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('pages.promotions.analytics.usesHeader')}
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('pages.promotions.analytics.totalDiscount')}
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                      {t('pages.promotions.analytics.revenueGenerated')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.top_coupons ?? []).slice(0, 5).map((coupon, index) => {
                    const badgeClass =
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                          ? 'bg-gray-200 text-gray-700'
                          : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-50 text-blue-600';

                    return (
                      <tr key={`${coupon.code}-${index}`} className="border-b last:border-b-0 border-gray-100">
                        <td className="py-3 text-sm">
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full font-semibold ${badgeClass}`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900">{coupon.code}</td>
                        <td className="py-3 text-sm text-gray-700">{coupon.used_count}</td>
                        <td className="py-3 text-sm text-gray-700">{toCurrency(coupon.total_discount_given)}</td>
                        <td className="py-3 text-sm text-gray-700">{toCurrency(coupon.revenue_generated)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('pages.promotions.filters.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{t('pages.promotions.filters.statusAll')}</option>
            <option value="active">{t('pages.promotions.filters.statusActive')}</option>
            <option value="scheduled">{t('pages.promotions.filters.statusScheduled')}</option>
            <option value="expired">{t('pages.promotions.filters.statusExpired')}</option>
            <option value="disabled">{t('pages.promotions.filters.statusDisabled')}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">{t('pages.promotions.filters.typeAll')}</option>
            <option value="percentage">{t('pages.promotions.filters.typePercentage')}</option>
            <option value="fixed_amount">{t('pages.promotions.filters.typeFixedAmount')}</option>
            <option value="free_shipping">{t('pages.promotions.filters.typeFreeShipping')}</option>
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.promotions.table.code')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.promotions.table.type')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.promotions.table.value')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  {t('pages.promotions.table.minOrder')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  {t('pages.promotions.table.usage')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  {t('pages.promotions.table.validPeriod')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.promotions.table.status')}
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('pages.promotions.table.actions')}
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {!loading && coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                    {t('pages.promotions.table.noCoupons')}
                  </td>
                </tr>
              ) : null}

              {coupons.map((coupon, index) => {
                const usageLimit = coupon.usage_limit;
                const usageRatio =
                  usageLimit && usageLimit > 0
                    ? Math.min(100, Math.round((coupon.used_count / usageLimit) * 100))
                    : 0;

                const typeLabel =
                  coupon.type === 'percentage'
                    ? t('pages.promotions.typeLabels.percentOff')
                    : coupon.type === 'fixed_amount'
                      ? t('pages.promotions.typeLabels.fixed')
                      : t('pages.promotions.typeLabels.freeShip');

                const valueLabel =
                  coupon.type === 'percentage'
                    ? `${coupon.value}%`
                    : coupon.type === 'fixed_amount'
                      ? toCurrency(coupon.value)
                      : t('pages.promotions.valueLabels.free');

                const validPeriodClass =
                  coupon.status === 'expired'
                    ? 'text-red-600'
                    : coupon.status === 'scheduled'
                      ? 'text-orange-600'
                      : 'text-gray-700';

                const toggleDanger = coupon.status === 'active' || coupon.status === 'scheduled';

                return (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-gray-500 hover:text-gray-700 p-1"
                          title={t('pages.promotions.actions.copyCode')}
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeClasses(coupon.type)}`}>
                        {typeLabel}
                      </span>
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {valueLabel}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">
                      {coupon.min_order_amount == null ? '—' : toCurrency(coupon.min_order_amount)}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-700 hidden lg:table-cell min-w-[170px]">
                      <div>{coupon.used_count} / {coupon.usage_limit ?? '∞'}</div>
                      {usageLimit != null ? (
                        <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${usageRatio}%` }} />
                        </div>
                      ) : null}
                    </td>

                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-sm hidden xl:table-cell whitespace-nowrap ${validPeriodClass}`}>
                      {formatDate(coupon.start_date)} → {formatDate(coupon.end_date)}
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(coupon.status)}`}>
                        {getStatusDot(coupon.status)} {t(`pages.promotions.statusLabels.${coupon.status}`)}
                      </span>
                    </td>

                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {canMutatePromotions && (
                          <button
                            type="button"
                            onClick={() => handleToggle(coupon)}
                            className={`p-1.5 ${toggleDanger ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                            title={
                              toggleDanger
                                ? t('pages.promotions.actions.toggleDisable')
                                : t('pages.promotions.actions.toggleEnable')
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDuplicate(coupon)}
                          className="p-1.5 text-blue-600 hover:text-blue-700"
                          title={t('pages.promotions.actions.duplicate')}
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {canMutatePromotions && (
                          <button
                            type="button"
                            onClick={() => openEditModal(coupon)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700"
                            title={t('pages.promotions.actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {canMutatePromotions && (
                          <button
                            type="button"
                            onClick={() => askDelete(coupon)}
                            className="p-1.5 text-red-600 hover:text-red-700"
                            title={t('pages.promotions.actions.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500 border-t border-gray-200">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : null}
      </motion.div>

      {showModal && canMutatePromotions ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl border border-gray-200 max-h-[92vh] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCoupon
                    ? t('pages.promotions.modal.editTitle')
                    : t('pages.promotions.modal.createTitle')}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {modalStep === 1
                    ? t('pages.promotions.modal.step1')
                    : t('pages.promotions.modal.step2')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 sm:px-6 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center ${modalStep === 1 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  1
                </div>
                <div className="h-0.5 flex-1 bg-gray-200" />
                <div className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center ${modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  2
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[62vh] space-y-4">
              {modalStep === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('pages.promotions.modal.fields.code')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.code}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('pages.promotions.modal.fields.codePlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, code: generateCouponCode() }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        {t('pages.promotions.buttons.generate')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('pages.promotions.modal.fields.type')}
                      </label>
                      <select
                        value={form.type}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            type: event.target.value as CouponType,
                            value: event.target.value === 'free_shipping' ? '' : prev.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="percentage">{t('pages.promotions.filters.typePercentage')}</option>
                        <option value="fixed_amount">{t('pages.promotions.filters.typeFixedAmount')}</option>
                        <option value="free_shipping">{t('pages.promotions.filters.typeFreeShipping')}</option>
                      </select>
                    </div>

                    {form.type !== 'free_shipping' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('pages.promotions.modal.fields.value')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.value}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, value: event.target.value }))
                          }
                          placeholder={
                            form.type === 'percentage'
                              ? t('pages.promotions.modal.fields.valuePlaceholderPercent')
                              : t('pages.promotions.modal.fields.valuePlaceholderFixed')
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('pages.promotions.modal.fields.minOrderAmount')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.min_order_amount}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, min_order_amount: event.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {form.type === 'percentage' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('pages.promotions.modal.fields.maxDiscountAmount')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.max_discount_amount}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, max_discount_amount: event.target.value }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('pages.promotions.modal.fields.startDate')}
                      </label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, start_date: event.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('pages.promotions.modal.fields.endDate')}
                      </label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, end_date: event.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('pages.promotions.modal.fields.usageLimit')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.usage_limit}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, usage_limit: event.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('pages.promotions.modal.fields.usageLimitPerUser')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.usage_limit_per_user}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, usage_limit_per_user: event.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">
                      {t('pages.promotions.modal.fields.applicableTo')}
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="applicable_to"
                          checked={form.applicable_to === 'all'}
                          onChange={() =>
                            setForm((prev) => ({ ...prev, applicable_to: 'all' }))
                          }
                        />
                        {t('pages.promotions.modal.fields.allProducts')}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="applicable_to"
                          checked={form.applicable_to === 'category'}
                          onChange={() =>
                            setForm((prev) => ({ ...prev, applicable_to: 'category' }))
                          }
                        />
                        {t('pages.promotions.modal.fields.specificCategories')}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="applicable_to"
                          checked={form.applicable_to === 'product'}
                          onChange={() =>
                            setForm((prev) => ({ ...prev, applicable_to: 'product' }))
                          }
                        />
                        {t('pages.promotions.modal.fields.specificProducts')}
                      </label>
                    </div>
                  </div>

                  {form.applicable_to === 'category' ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {t('pages.promotions.modal.fields.selectCategories')}
                      </p>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                        {optionsLoading ? (
                          <div className="text-sm text-gray-500 p-2">{t('common.loading')}</div>
                        ) : categoryOptions.length === 0 ? (
                          <div className="text-sm text-gray-500 p-2">{t('common.noResults')}</div>
                        ) : (
                          categoryOptions.map((category) => (
                            <label key={category.id} className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={form.applicable_categories.includes(category.id)}
                                onChange={(event) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    applicable_categories: event.target.checked
                                      ? [...prev.applicable_categories, category.id]
                                      : prev.applicable_categories.filter((id) => id !== category.id),
                                  }))
                                }
                              />
                              {category.name}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}

                  {form.applicable_to === 'product' ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {t('pages.promotions.modal.fields.selectProducts')}
                      </p>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                        {optionsLoading ? (
                          <div className="text-sm text-gray-500 p-2">{t('common.loading')}</div>
                        ) : productOptions.length === 0 ? (
                          <div className="text-sm text-gray-500 p-2">{t('common.noResults')}</div>
                        ) : (
                          productOptions.map((product) => (
                            <label key={product.id} className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={form.applicable_products.includes(product.id)}
                                onChange={(event) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    applicable_products: event.target.checked
                                      ? [...prev.applicable_products, product.id]
                                      : prev.applicable_products.filter((id) => id !== product.id),
                                  }))
                                }
                              />
                              {product.name}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-200">
              {modalError ? <p className="text-sm text-red-600 mb-3">{modalError}</p> : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {modalStep === 2 ? (
                    <button
                      type="button"
                      onClick={handlePreviousStep}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      {t('pages.promotions.buttons.previous')}
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    {t('pages.promotions.buttons.cancel')}
                  </button>

                  {modalStep === 1 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {t('pages.promotions.buttons.next')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleModalSubmit}
                      disabled={modalSubmitting}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60 flex items-center gap-2"
                    >
                      {modalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {editingCoupon
                        ? t('pages.promotions.buttons.saveChanges')
                        : t('pages.promotions.buttons.createCoupon')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm && couponToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('pages.promotions.deleteConfirm.title')}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600">
                {t('pages.promotions.deleteConfirm.message', { code: couponToDelete.code })}
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setCouponToDelete(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  {t('pages.promotions.buttons.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  {t('pages.promotions.deleteConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
