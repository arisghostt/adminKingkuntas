import {
  clearAuthSession,
  getAccessTokenFromPayload,
  getAuthSession,
  getRefreshTokenFromPayload,
  setAuthSession,
} from '@/app/lib/auth';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

const API_ORIGIN = (() => {
  if (!API_BASE_URL) return '';
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return '';
  }
})();

const pickAssetFromObject = (value: Record<string, unknown>): string => {
  const candidates = [
    value.url,
    value.image,
    value.image_url,
    value.imageUrl,
    value.file,
    value.path,
    value.src,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return '';
};

const resolveAssetUrl = (value: unknown): string => {
  const asset =
    typeof value === 'string'
      ? value.trim()
      : value && typeof value === 'object'
        ? pickAssetFromObject(value as Record<string, unknown>)
        : '';
  if (asset.length === 0) return '';

  if (asset.startsWith('http://') || asset.startsWith('https://')) return asset;
  if (asset.startsWith('data:') || asset.startsWith('blob:')) return asset;

  if (asset.startsWith('/')) {
    return API_ORIGIN ? `${API_ORIGIN}${asset}` : asset;
  }

  if (asset.startsWith('media/') || asset.startsWith('uploads/')) {
    const normalized = `/${asset.replace(/^\/+/, '')}`;
    return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
  }

  if (API_ORIGIN) {
    return `${API_ORIGIN}/${asset.replace(/^\/+/, '')}`;
  }

  return asset.startsWith('/') ? asset : `/${asset}`;
};

type QueryValue = string | number | boolean | null | undefined;

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface UserCreatePayload {
  username: string;
  email: string;
  phone: string;
  password: string;
  role_id: number;
}

export interface UserUpdatePayload {
  role_id?: number;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
}

export interface UserRecord {
  id: string | number;
  username: string;
  email: string;
  phone: string;
  role: RolePayload | null;
  is_active: boolean;
  date_joined: string;
  last_login: string;
}

export interface UsersQueryParams {
  search?: string;
  role?: string | number;
  status?: string;
  [key: string]: QueryValue;
}

export interface RolePayload {
  id: number;
  name: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string | number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  color: string;
}

export interface RoleCreatePayload {
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  image: string;
  rating: number;
}

export interface ProductDetail extends Product {
  description: string;
  sku: string;
  reviews: number;
  features: string[];
  galleryImages: string[];
  relatedProducts: Product[];
}

export interface PaginatedProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

const buildUrl = (path: string, query?: Record<string, QueryValue>) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const dedupedPath =
    API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')
      ? normalizedPath.slice(4)
      : normalizedPath;

  const url = new URL(`${API_BASE_URL}${dedupedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const extractErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string') return payload.detail;
    if (typeof payload?.message === 'string') return payload.message;
    if (typeof payload?.error === 'string') return payload.error;

    if (Array.isArray(payload)) {
      const first = payload.find((item) => typeof item === 'string');
      if (typeof first === 'string') return first;
    }

    if (payload && typeof payload === 'object') {
      for (const [field, value] of Object.entries(payload as Record<string, unknown>)) {
        if (Array.isArray(value) && typeof value[0] === 'string') {
          return `${field}: ${value[0]}`;
        }
        if (typeof value === 'string') {
          return `${field}: ${value}`;
        }
      }
    }

    return JSON.stringify(payload);
  } catch {
    return response.statusText || 'Request failed';
  }
};

const normalizeList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { results?: unknown[] }).results)
  ) {
    return (payload as { results: T[] }).results;
  }
  return [];
};

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

const normalizeProduct = (payload: unknown): Product => {
  const product = toRecord(payload);
  const rawStatus = product.status;
  const status: Product['status'] = rawStatus === 'inactive' ? 'inactive' : 'active';
  const categoryValue = product.category;
  const category =
    typeof categoryValue === 'string'
      ? categoryValue
      : categoryValue && typeof categoryValue === 'object' && typeof (categoryValue as Record<string, unknown>).name === 'string'
        ? ((categoryValue as Record<string, unknown>).name as string)
        : '';
  const image =
    resolveAssetUrl(product.image) ||
    resolveAssetUrl(product.main_image) ||
    resolveAssetUrl(product.mainImage) ||
    resolveAssetUrl(product.image_url) ||
    resolveAssetUrl(product.imageUrl) ||
    resolveAssetUrl(product.thumbnail);

  const category_id =
    typeof product.category_id === 'string'
      ? product.category_id
      : product.category && typeof product.category === 'object' && typeof (product.category as any).id === 'string'
        ? (product.category as any).id
        : null;

  return {
    id: String(product.id ?? ''),
    name: typeof product.name === 'string' ? product.name : '',
    category,
    category_id,
    price: toNumber(product.price ?? product.unit_price ?? product.unitPrice ?? product.sale_price),
    stock: Math.trunc(toNumber(product.stock ?? product.quantity ?? product.stock_quantity ?? product.stockQuantity)),
    status,
    image,
    rating: toNumber(product.rating ?? product.average_rating ?? product.avg_rating),
  } as Product;
};

const normalizeProductDetail = (payload: unknown): ProductDetail => {
  const product = toRecord(payload);
  const baseProduct = normalizeProduct(product);

  const features = Array.isArray(product.features)
    ? product.features.filter((feature): feature is string => typeof feature === 'string')
    : [];

  const galleryRaw = Array.isArray(product.gallery_images)
    ? product.gallery_images
    : Array.isArray(product.galleryImages)
      ? product.galleryImages
      : Array.isArray(product.images)
        ? product.images
        : Array.isArray(product.gallery)
          ? product.gallery
          : [];

  const galleryImages = galleryRaw
    .map((image) => resolveAssetUrl(image))
    .filter((image) => image.length > 0);

  const relatedRaw = Array.isArray(product.relatedProducts)
    ? product.relatedProducts
    : Array.isArray(product.related_products)
      ? product.related_products
      : [];

  return {
    ...baseProduct,
    description: typeof product.description === 'string' ? product.description : '',
    sku: typeof product.sku === 'string' ? product.sku : '',
    reviews: Math.trunc(toNumber(product.reviews)),
    features,
    galleryImages,
    relatedProducts: relatedRaw.map(normalizeProduct),
  };
};

const normalizeStoredToken = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^(Bearer|Token)\s+/i, '').trim();
  return normalized.length > 0 ? normalized : null;
};

const getLegacyRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const directRefresh =
    window.localStorage.getItem('auth_refresh_token') ??
    window.localStorage.getItem('refresh_token');
  const normalizedDirectRefresh = normalizeStoredToken(directRefresh);
  if (normalizedDirectRefresh) return normalizedDirectRefresh;

  const rawSession = window.localStorage.getItem('kk_auth_session');
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as { refreshToken?: unknown };
    return normalizeStoredToken(parsed.refreshToken);
  } catch {
    return null;
  }
};

const setLegacyTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === 'undefined') return;
  const normalizedAccessToken = normalizeStoredToken(accessToken);
  if (!normalizedAccessToken) return;

  window.localStorage.setItem('auth_access_token', normalizedAccessToken);
  window.localStorage.setItem('access_token', normalizedAccessToken);
  document.cookie = `access_token=${encodeURIComponent(normalizedAccessToken)}; path=/`;

  const normalizedRefreshToken = normalizeStoredToken(refreshToken);
  if (normalizedRefreshToken) {
    window.localStorage.setItem('auth_refresh_token', normalizedRefreshToken);
    window.localStorage.setItem('refresh_token', normalizedRefreshToken);
  }
};

const clearLegacyTokens = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('auth_access_token');
  window.localStorage.removeItem('auth_refresh_token');
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const session = getAuthSession();
  const refreshToken =
    normalizeStoredToken(session?.refreshToken) ?? getLegacyRefreshToken();

  if (!refreshToken) return null;

  try {
    const response = await fetch(buildUrl('/api/auth/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as unknown;
    const refreshedAccessToken = getAccessTokenFromPayload(payload);
    const refreshedRefreshToken =
      getRefreshTokenFromPayload(payload) ?? refreshToken;

    if (!refreshedAccessToken) return null;

    if (session) {
      setAuthSession({
        ...session,
        accessToken: refreshedAccessToken,
        refreshToken: refreshedRefreshToken,
      });
    }

    setLegacyTokens(refreshedAccessToken, refreshedRefreshToken);
    return normalizeStoredToken(refreshedAccessToken);
  } catch {
    return null;
  }
};

export const getToken = (): string => {
  if (typeof window === 'undefined') return '';

  const cookieToken = document.cookie
    .split(';')
    .find((cookie) => cookie.trim().startsWith('access_token='))
    ?.split('=')
    .slice(1)
    .join('=');

  if (cookieToken) {
    return decodeURIComponent(cookieToken).replace(/^(Bearer|Token)\s+/i, '').trim();
  }

  const authAccessToken = window.localStorage.getItem('auth_access_token');
  if (authAccessToken) return authAccessToken.replace(/^(Bearer|Token)\s+/i, '').trim();

  const legacyAccessToken = window.localStorage.getItem('access_token');
  if (legacyAccessToken) return legacyAccessToken.replace(/^(Bearer|Token)\s+/i, '').trim();

  const rawSession = window.localStorage.getItem('kk_auth_session');
  if (!rawSession) return '';

  try {
    const parsed = JSON.parse(rawSession) as { accessToken?: unknown };
    if (typeof parsed.accessToken !== 'string') return '';
    return parsed.accessToken.replace(/^(Bearer|Token)\s+/i, '').trim();
  } catch {
    return '';
  }
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, QueryValue>
): Promise<T> => {
  const executeRequest = async (
    accessToken: string,
    forceAuthHeader = false
  ): Promise<Response> => {
    const headers = new Headers(options.headers ?? {});
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (accessToken && (forceAuthHeader || !headers.has('Authorization'))) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(buildUrl(path, query), {
      ...options,
      headers,
      credentials: 'include',
    });
  };

  const initialToken = getToken();
  let response = await executeRequest(initialToken);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isRefreshPath = /\/api\/auth\/refresh\/?$|\/auth\/refresh\/?$/.test(
    normalizedPath
  );

  if (response.status === 401 && !isRefreshPath) {
    const refreshedAccessToken = await refreshAccessToken();
    if (refreshedAccessToken) {
      response = await executeRequest(refreshedAccessToken, true);
    } else if (typeof window !== 'undefined' && getAuthSession()) {
      clearAuthSession();
      clearLegacyTokens();
      redirectToLogin();
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<LoginResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

export const usersApi = {
  getAll: async (params?: UsersQueryParams) => {
    const payload = await apiFetch<unknown>('/api/users/', { method: 'GET' }, params);
    return normalizeList<UserRecord>(payload);
  },
  getById: (id: string | number) =>
    apiFetch<UserRecord>(`/api/users/${id}/`, {
      method: 'GET',
    }),
  getMe: () =>
    apiFetch<UserRecord>('/api/users/me/', {
      method: 'GET',
    }),
  updateMe: (data: UserUpdatePayload) =>
    apiFetch('/api/users/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('profile_image', file);
    return apiFetch('/api/users/me/', {
      method: 'PATCH',
      body: formData,
    });
  },
  create: (data: UserCreatePayload) =>
    apiFetch('/api/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string | number, data: UserUpdatePayload) =>
    apiFetch(`/api/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string | number) =>
    apiFetch(`/api/users/${id}/`, {
      method: 'DELETE',
    }),
};

export const rolesApi = {
  getAll: async (): Promise<any[]> => {
    const payload = await apiFetch<unknown>('/api/roles/', { method: 'GET' });
    return normalizeList<Role>(payload);
  },
  create: (data: RoleCreatePayload | string) =>
    apiFetch('/api/roles/', {
      method: 'POST',
      body: JSON.stringify(typeof data === 'string' ? { name: data } : data),
    }),
  update: (id: string | number, data: RoleCreatePayload) =>
    apiFetch(`/api/roles/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string | number) =>
    apiFetch(`/api/roles/${id}/`, {
      method: 'DELETE',
    }),
};

export const permissionsApi = {
  getAll: async () => {
    const payload = await apiFetch<unknown>('/api/permissions/', { method: 'GET' });
    return normalizeList<Permission>(payload);
  },
};

export const productsApi = {
  getAll: async (params?: {
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
  }) => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString();

    const payload = await apiFetch<unknown>(`/products/${query ? `?${query}` : ''}`);

    if (Array.isArray(payload)) {
      const results = payload.map(normalizeProduct);
      return { count: results.length, next: null, previous: null, results };
    }

    const paginated = toRecord(payload);
    const rawResults = Array.isArray(paginated.results) ? paginated.results : [];

    return {
      count: Math.trunc(toNumber(paginated.count, rawResults.length)),
      next: typeof paginated.next === 'string' ? paginated.next : null,
      previous: typeof paginated.previous === 'string' ? paginated.previous : null,
      results: rawResults.map(normalizeProduct),
    };
  },
  getById: async (id: string) => {
    const payload = await apiFetch<unknown>(`/products/${id}/`);
    return normalizeProductDetail(payload);
  },
  create: (data: FormData) =>
    apiFetch('/products/', {
      method: 'POST',
      body: data,
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
  update: (id: string, data: FormData) =>
    apiFetch(`/products/${id}/`, {
      method: 'PUT',
      body: data,
      headers: { Authorization: `Bearer ${getToken()}` },
    }),
  delete: async (id: string) => {
    try {
      return await apiFetch(`/products/${id}/`, { method: 'DELETE' });
    } catch (error) {
      // Retry without trailing slash for APIs configured with non-slash URLs.
      return apiFetch(`/products/${id}`, { method: 'DELETE' }).catch(() => {
        throw error;
      });
    }
  },
  clearMainImage: async (id: string) => {
    try {
      return await apiFetch(`/products/${id}/main-image/clear/`, { method: 'POST' });
    } catch (error) {
      return apiFetch(`/products/${id}/main-image/clear`, { method: 'POST' }).catch(() => {
        throw error;
      });
    }
  },
  deleteGalleryImages: async (id: string, images: string[]) => {
    if (images.length === 0) {
      return { success: true, deleted: 0 };
    }

    const body = JSON.stringify({ images });
    try {
      return await apiFetch(`/products/${id}/gallery-images/delete/`, {
        method: 'POST',
        body,
      });
    } catch (error) {
      return apiFetch(`/products/${id}/gallery-images/delete`, {
        method: 'POST',
        body,
      }).catch(() => {
        throw error;
      });
    }
  },
};

export const categoriesApi = {
  getAll: () => apiFetch('/categories/') as Promise<Category[]>,
  create: (data: { name: string; description: string }) =>
    apiFetch('/categories/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name: string; description: string }) =>
    apiFetch(`/categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/categories/${id}/`, { method: 'DELETE' }),
};
