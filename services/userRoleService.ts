import axios from 'axios';
import { apiClient } from './apiClient';

export interface Permission {
  id: number;
  codename: string;
  name: string;
  source_id?: number;
  synthetic_id?: boolean;
}

export interface PermissionGroup {
  group: string;
  permissions: Permission[];
}

export interface RoleProfile {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  users_count: number;
  permissions: Permission[];
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  phone: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role: { id: number; name: string } | null;
  last_login: string | null;
  date_joined: string;
}

export interface ModulePermissionPayload {
  module_id: number;
  is_view: boolean;
  is_add: boolean;
  is_edit: boolean;
  is_delete: boolean;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  color?: string;
  permission_ids?: number[];
  permission_codenames?: string[];
  module_permissions?: ModulePermissionPayload[];
}

export interface UpdateRolePayload extends Partial<RoleProfile> {
  color?: string;
  permission_ids?: number[];
  permission_codenames?: string[];
  module_permissions?: ModulePermissionPayload[];
}

export interface CreateUserPayload {
  username: string;
  phone: string;
  email: string;
  password: string;
  role_id?: number | null;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  phone?: string;
  email?: string;
  password?: string;
  role_id?: number | null;
  is_active?: boolean;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return fallback;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const normalizeCodename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '');

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const record = toRecord(payload);

  if (Array.isArray(record.results)) return record.results as T[];
  if (Array.isArray(record.data)) return record.data as T[];
  if (Array.isArray(record.items)) return record.items as T[];
  if (Array.isArray(record.permissions)) return record.permissions as T[];
  if (Array.isArray(record.permission_groups)) return record.permission_groups as T[];
  if (Array.isArray(record.groups)) return record.groups as T[];
  if (Array.isArray(record.roles)) return record.roles as T[];
  if (Array.isArray(record.users)) return record.users as T[];

  return [];
};

const hashText = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
};

const prettifyCodename = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeGroupName = (value: unknown): string => {
  const text = toText(value);
  if (!text) return 'General';
  return prettifyCodename(text);
};

const normalizePermission = (payload: unknown): Permission => {
  if (typeof payload === 'string' || typeof payload === 'number') {
    const textValue = String(payload).trim();
    const numericId = toNumber(textValue, 0);
    const codename =
      (Number.isFinite(Number(textValue))
        ? `permission_${numericId}`
        : normalizeCodename(textValue)) || `permission_${hashText(textValue)}`;
    const sourceId = numericId > 0 ? numericId : undefined;

    return {
      id: sourceId ?? hashText(codename),
      codename,
      name: prettifyCodename(codename),
      source_id: sourceId,
      synthetic_id: sourceId === undefined,
    };
  }

  const permission = toRecord(payload);
  const codenameCandidate = normalizeCodename(
    toText(permission.codename) ||
      toText(permission.code) ||
      toText(permission.slug) ||
      toText(permission.name)
  );

  const idCandidate = toNumber(permission.id ?? permission.permission_id, 0);

  const codename = codenameCandidate || `permission_${idCandidate || hashText(JSON.stringify(permission))}`;
  const sourceId = idCandidate > 0 ? idCandidate : undefined;
  const id = sourceId ?? hashText(codename);

  const name =
    toText(permission.name) ||
    toText(permission.label) ||
    toText(permission.display_name) ||
    prettifyCodename(codename);

  return {
    id,
    codename,
    name,
    source_id: sourceId,
    synthetic_id: sourceId === undefined,
  };
};

const mapGroupedRecord = (grouped: Record<string, unknown>): PermissionGroup[] =>
  Object.entries(grouped)
    .map(([groupName, permissionsValue]) => ({
      group: normalizeGroupName(groupName),
      permissions: extractList<unknown>(permissionsValue).map(normalizePermission),
    }))
    .filter((group) => group.permissions.length > 0);

const normalizePermissionGroupsPayload = (payload: unknown): PermissionGroup[] => {
  const record = toRecord(payload);

  const groupedCandidate = record.grouped_permissions ?? record.permissions_by_group ?? record.by_group;
  if (groupedCandidate && typeof groupedCandidate === 'object' && !Array.isArray(groupedCandidate)) {
    return mapGroupedRecord(groupedCandidate as Record<string, unknown>);
  }

  const groupedArrays = [record.permission_groups, record.groups, record.grouped];
  for (const groupedArray of groupedArrays) {
    if (!Array.isArray(groupedArray)) continue;

    const mapped = groupedArray
      .map((entry) => {
        const group = toRecord(entry);
        const groupName =
          group.group ?? group.name ?? group.title ?? group.module ?? group.app_label;
        const permissionsSource =
          group.permissions ?? group.items ?? group.results ?? group.children;

        return {
          group: normalizeGroupName(groupName),
          permissions: extractList<unknown>(permissionsSource).map(normalizePermission),
        };
      })
      .filter((entry) => entry.permissions.length > 0);

    if (mapped.length > 0) return mapped;
  }

  const groupsCandidate = extractList<unknown>(payload);
  const firstGroup = toRecord(groupsCandidate[0]);
  const hasGroupedShape =
    (Object.prototype.hasOwnProperty.call(firstGroup, 'group') ||
      Object.prototype.hasOwnProperty.call(firstGroup, 'name') ||
      Object.prototype.hasOwnProperty.call(firstGroup, 'module')) &&
    (Array.isArray(firstGroup.permissions) ||
      Array.isArray(firstGroup.items) ||
      Array.isArray(firstGroup.results));

  if (hasGroupedShape) {
    return groupsCandidate
      .map((item) => {
        const group = toRecord(item);
        const permissionsSource =
          group.permissions ?? group.items ?? group.results ?? group.children;

        return {
          group: normalizeGroupName(group.group ?? group.name ?? group.title ?? group.module),
          permissions: extractList<unknown>(permissionsSource).map(normalizePermission),
        };
      })
      .filter((entry) => entry.permissions.length > 0);
  }

  const flatPermissions = groupsCandidate.map(normalizePermission);
  return groupPermissions(flatPermissions);
};

const normalizeRole = (payload: unknown): RoleProfile => {
  const role = toRecord(payload);
  const usersListCandidate =
    (Array.isArray(role.users) && role.users) ||
    (Array.isArray(role.assigned_users) && role.assigned_users) ||
    (Array.isArray(role.members) && role.members) ||
    (Array.isArray(role.user_set) && role.user_set) ||
    null;
  const permissionsRaw = extractList<unknown>(
    role.permissions ??
      role.permission_ids ??
      role.permissionIds ??
      role.permission_codenames ??
      role.permission_codes
  );

  return {
    id: toNumber(role.id ?? role.group_id ?? role.role_id),
    name: toText(role.name ?? role.group_name ?? role.title) || 'Role',
    description: toText(role.description),
    is_active: Boolean(role.is_active ?? role.active ?? true),
    users_count: toNumber(
      role.users_count ??
        role.user_count ??
        role.usersCount ??
        role.assigned_users_count ??
        role.members_count ??
        (usersListCandidate ? usersListCandidate.length : 0)
    ),
    permissions: permissionsRaw.map(normalizePermission),
    created_at: toText(role.created_at ?? role.createdAt ?? role.created ?? role.date_created),
  };
};

const normalizeUser = (payload: unknown): AdminUser => {
  const user = toRecord(payload);
  const roleRaw = toRecord(user.role ?? user.group);
  const roleListEntry = Array.isArray(user.roles)
    ? toRecord(user.roles[0])
    : Array.isArray(user.groups)
      ? toRecord(user.groups[0])
      : {};
  const roleId = toNumber(
    roleRaw.id ??
      roleRaw.role_id ??
      roleRaw.group_id ??
      roleListEntry.id ??
      roleListEntry.role_id ??
      roleListEntry.group_id ??
      user.role_id ??
      user.group_id
  );
  const roleName =
    toText(
      roleRaw.name ??
        roleRaw.role_name ??
        roleRaw.group_name ??
        roleListEntry.name ??
        roleListEntry.role_name ??
        roleListEntry.group_name ??
        user.role_name ??
        user.group_name
    ) || 'Role';
  const username =
    toText(user.username) ||
    [toText(user.first_name ?? user.firstName), toText(user.last_name ?? user.lastName)]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    toText(user.email) ||
    `user_${toNumber(user.id)}`;

  return {
    id: toNumber(user.id),
    username,
    phone: toText(user.phone ?? user.mobile ?? user.phone_number ?? user.phoneNumber),
    email: toText(user.email),
    is_active: Boolean(user.is_active ?? user.active ?? true),
    is_superuser: Boolean(user.is_superuser ?? user.superuser),
    role: roleId
      ? {
          id: roleId,
          name: roleName,
        }
      : null,
    last_login: toText(user.last_login ?? user.lastLogin) || null,
    date_joined: toText(user.date_joined ?? user.dateJoined),
  };
};

const groupPermissions = (permissions: Permission[]): PermissionGroup[] => {
  const grouped = new Map<string, Permission[]>();

  permissions.forEach((permission) => {
    const groupName = permission.codename.includes('_')
      ? permission.codename.split('_')[1] || 'general'
      : 'general';

    const normalizedGroup = groupName
      .replace(/[_.-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'General';

    const bucket = grouped.get(normalizedGroup) ?? [];
    bucket.push(permission);
    grouped.set(normalizedGroup, bucket);
  });

  return [...grouped.entries()]
    .map(([group, groupPermissionsList]) => ({
      group,
      permissions: groupPermissionsList.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
};

const USER_COLLECTION_ENDPOINTS = ['/api/users/', '/api/users', '/api/admin/users', '/api/admin/users/'];
const ROLE_COLLECTION_ENDPOINTS = ['/api/roles/', '/api/roles', '/api/admin/roles', '/api/admin/roles/'];
const PERMISSIONS_ENDPOINTS = ['/api/permissions/', '/api/permissions', '/api/admin/permissions', '/api/admin/permissions/'];
const ENDPOINT_UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
const ENDPOINT_ALL_FAILED_COOLDOWN_MS = 30 * 1000;

type EndpointCacheKey = 'users' | 'roles' | 'permissions';

const preferredEndpointByKey = new Map<EndpointCacheKey, string>();
const endpointUnavailableUntil = new Map<string, number>();
const allEndpointsFailedUntil = new Map<EndpointCacheKey, number>();

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const toDetailPath = (collectionPath: string, id: number): string => {
  const base = stripTrailingSlash(collectionPath);
  return `${base}/${id}/`;
};

const toActionPath = (detailPath: string, action: string): string => {
  const normalizedAction = action.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalizedAction) return detailPath;
  const base = detailPath.endsWith('/') ? detailPath : `${detailPath}/`;
  return `${base}${normalizedAction}/`;
};

const isNotFoundError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

const isForbiddenError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 403;

const isMissingPermissionsError = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  (error.response?.status === 404 || error.response?.status === 405);

const isMethodNotAllowedError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 405;

const isValidationPayloadError = (error: unknown): boolean =>
  axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 422);

const isAdminEndpoint = (endpoint: string): boolean =>
  endpoint.includes('/api/admin/');

const shouldTryNextEndpoint = (endpoint: string, error: unknown): boolean => {
  if (isNotFoundError(error)) return true;
  if (isMethodNotAllowedError(error) && isAdminEndpoint(endpoint)) return true;
  if (isForbiddenError(error) && isAdminEndpoint(endpoint)) return true;
  return false;
};

const endpointCacheToken = (cacheKey: EndpointCacheKey, endpoint: string): string =>
  `${cacheKey}:${endpoint}`;

const getCandidateEndpoints = (cacheKey: EndpointCacheKey, endpoints: string[]): string[] => {
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

const markEndpointUnavailable = (cacheKey: EndpointCacheKey, endpoint: string) => {
  endpointUnavailableUntil.set(
    endpointCacheToken(cacheKey, endpoint),
    Date.now() + ENDPOINT_UNAVAILABLE_TTL_MS
  );
};

const withEndpointFallback = async <T>(
  cacheKey: EndpointCacheKey,
  endpoints: string[],
  request: (endpoint: string) => Promise<T>
): Promise<T> => {
  const now = Date.now();
  const allFailedUntil = allEndpointsFailedUntil.get(cacheKey) ?? 0;
  if (allFailedUntil > now) {
    throw new Error('No reachable API endpoint found.');
  }

  let lastError: unknown = null;
  const candidateEndpoints = getCandidateEndpoints(cacheKey, endpoints);

  for (const endpoint of candidateEndpoints) {
    try {
      const payload = await request(endpoint);
      preferredEndpointByKey.set(cacheKey, endpoint);
      allEndpointsFailedUntil.delete(cacheKey);
      return payload;
    } catch (error) {
      if (shouldTryNextEndpoint(endpoint, error)) {
        lastError = error;
        markEndpointUnavailable(cacheKey, endpoint);
        continue;
      }
      throw error;
    }
  }

  allEndpointsFailedUntil.set(cacheKey, Date.now() + ENDPOINT_ALL_FAILED_COOLDOWN_MS);
  if (lastError) throw lastError;
  throw new Error('No reachable API endpoint found.');
};

const dedupeNumbers = (values: number[] | undefined): number[] => {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
};

const dedupeCodenames = (values: string[] | undefined): string[] => {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeCodename(value)).filter(Boolean))];
};

const buildRolePayloadAttempts = (
  data: CreateRolePayload | UpdateRolePayload
): Array<Record<string, unknown>> => {
  const base: Record<string, unknown> = {};

  if (typeof data.name === 'string') base.name = data.name;
  if (typeof data.description === 'string') base.description = data.description;
  if ('color' in data && typeof data.color === 'string') base.color = data.color;
  if ('is_active' in data && typeof data.is_active === 'boolean') {
    base.is_active = data.is_active;
  }

  const hasModulePermissionsInput = Array.isArray(data.module_permissions) && data.module_permissions.length > 0;
  const attempts: Array<Record<string, unknown>> = [];

  // Primary payload : { name, description, color, module_permissions }
  if (hasModulePermissionsInput) {
    attempts.push({
      ...base,
      module_permissions: data.module_permissions,
    });
  }

  // Legacy permission handling
  const permissionIds = dedupeNumbers(data.permission_ids);
  const permissionCodenames = dedupeCodenames(data.permission_codenames);
  const hasPermissionIdsInput = permissionIds.length > 0;
  const hasPermissionCodenamesInput = permissionCodenames.length > 0;

  if (hasPermissionIdsInput) {
    attempts.push({ ...base, permissions: permissionIds });
    attempts.push({ ...base, permission_ids: permissionIds });
  }

  if (hasPermissionCodenamesInput) {
    attempts.push({ ...base, permissions: permissionCodenames });
    attempts.push({ ...base, permission_codenames: permissionCodenames });
  }

  // Fallback payload: { name, description }
  const minimalFallback: Record<string, unknown> = {};
  if (typeof data.name === 'string') minimalFallback.name = data.name;
  if (typeof data.description === 'string') minimalFallback.description = data.description;
  attempts.push(minimalFallback);

  const seen = new Set<string>();
  return attempts.filter((entry) => {
    const key = JSON.stringify(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const postWithPayloadFallback = async (
  endpoint: string,
  payloadAttempts: Array<Record<string, unknown>>
): Promise<unknown> => {
  let lastValidationError: unknown = null;

  for (const payload of payloadAttempts) {
    try {
      const response = await apiClient.post<unknown>(endpoint, payload);
      return response.data;
    } catch (error) {
      if (isValidationPayloadError(error)) {
        lastValidationError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastValidationError ?? new Error('Unable to create role with provided payload.');
};

const putOrPatchWithPayloadFallback = async (
  endpoint: string,
  payloadAttempts: Array<Record<string, unknown>>
): Promise<unknown> => {
  let lastValidationError: unknown = null;

  for (const payload of payloadAttempts) {
    try {
      const response = await apiClient.put<unknown>(endpoint, payload);
      return response.data;
    } catch (error) {
      if (isMethodNotAllowedError(error)) {
        try {
          const patchResponse = await apiClient.patch<unknown>(endpoint, payload);
          return patchResponse.data;
        } catch (patchError) {
          if (isValidationPayloadError(patchError)) {
            lastValidationError = patchError;
            continue;
          }

          if (isMethodNotAllowedError(patchError)) {
            lastValidationError = patchError;
            continue;
          }

          throw patchError;
        }
      }

      if (isValidationPayloadError(error)) {
        lastValidationError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastValidationError ?? new Error('Unable to update role with provided payload.');
};

export const getPermissions = async (): Promise<PermissionGroup[]> => {
  try {
    const payload = await withEndpointFallback('permissions', PERMISSIONS_ENDPOINTS, async (endpoint) => {
      const response = await apiClient.get<unknown>(endpoint);
      return response.data;
    });
    return normalizePermissionGroupsPayload(payload);
  } catch (error) {
    if (isMissingPermissionsError(error)) {
      return [];
    }
    if (isNotFoundError(error)) {
      return [];
    }
    if (isForbiddenError(error)) {
      return [];
    }
    throw error;
  }
};

export const getRoles = async (): Promise<RoleProfile[]> => {
  const payload = await withEndpointFallback('roles', ROLE_COLLECTION_ENDPOINTS, async (endpoint) => {
    const response = await apiClient.get<unknown>(endpoint);
    return response.data;
  });
  return extractList<unknown>(payload).map(normalizeRole);
};

export const createRole = async (data: CreateRolePayload): Promise<RoleProfile> => {
  const payloadAttempts = buildRolePayloadAttempts(data);
  const payload = await withEndpointFallback('roles', ROLE_COLLECTION_ENDPOINTS, async (endpoint) => {
    return postWithPayloadFallback(endpoint, payloadAttempts);
  });
  return normalizeRole(payload);
};

export const updateRole = async (
  id: number,
  data: UpdateRolePayload
): Promise<RoleProfile> => {
  const payloadAttempts = buildRolePayloadAttempts(data);
  const payload = await withEndpointFallback('roles', ROLE_COLLECTION_ENDPOINTS, async (endpoint) => {
    const detailPath = toDetailPath(endpoint, id);
    return putOrPatchWithPayloadFallback(detailPath, payloadAttempts);
  });
  return normalizeRole(payload);
};

export const toggleRole = async (id: number, is_active: boolean): Promise<RoleProfile> => {
  const payload = await withEndpointFallback('roles', ROLE_COLLECTION_ENDPOINTS, async (endpoint) => {
    const detailPath = toDetailPath(endpoint, id);
    const response = await apiClient.patch<unknown>(detailPath, { is_active });
    return response.data;
  });
  return normalizeRole(payload);
};

export const deleteRole = async (id: number): Promise<void> => {
  await withEndpointFallback('roles', ROLE_COLLECTION_ENDPOINTS, async (endpoint) => {
    const detailPath = toDetailPath(endpoint, id);
    await apiClient.delete(detailPath);
  });
};

export const getUsers = async (): Promise<AdminUser[]> => {
  const payload = await withEndpointFallback('users', USER_COLLECTION_ENDPOINTS, async (endpoint) => {
    const response = await apiClient.get<unknown>(endpoint);
    return response.data;
  });
  return extractList<unknown>(payload).map(normalizeUser);
};

export const createUser = async (data: CreateUserPayload): Promise<AdminUser> => {
  const payload = await withEndpointFallback('users', USER_COLLECTION_ENDPOINTS, async (endpoint) => {
    const response = await apiClient.post<unknown>(endpoint, data);
    return response.data;
  });
  return normalizeUser(payload);
};

export const updateUser = async (
  id: number,
  data: UpdateUserPayload
): Promise<AdminUser> => {
  const payload = await withEndpointFallback('users', USER_COLLECTION_ENDPOINTS, async (endpoint) => {
    const detailPath = toDetailPath(endpoint, id);
    const response = await apiClient.patch<unknown>(detailPath, data);
    return response.data;
  });
  return normalizeUser(payload);
};

export const resetPassword = async (id: number, new_password: string): Promise<void> => {
  await withEndpointFallback('users', USER_COLLECTION_ENDPOINTS, async (endpoint) => {
    const detailPath = toDetailPath(endpoint, id);
    const actionPath = toActionPath(detailPath, 'reset-password');
    await apiClient.patch(actionPath, { new_password });
  });
};

export const deleteUser = async (id: number): Promise<void> => {
  await withEndpointFallback('users', USER_COLLECTION_ENDPOINTS, async (endpoint) => {
    const detailPath = toDetailPath(endpoint, id);
    await apiClient.delete(detailPath);
  });
};
