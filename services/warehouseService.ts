import { apiClient } from './apiClient';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  is_active: boolean;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
};

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const record = toRecord(payload);

  const candidates = ['results', 'items', 'data', 'warehouses'];
  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
};

const normalizeWarehouse = (payload: unknown): Warehouse => {
  const record = toRecord(payload);

  return {
    id: String(record.id ?? ''),
    name: toText(record.name),
    code: toText(record.code ?? record.reference),
    location: toText(record.location ?? record.address),
    is_active: toBoolean(record.is_active ?? record.active ?? true),
  };
};

export const getWarehouses = async (): Promise<Warehouse[]> => {
  const response = await apiClient.get<unknown>('/api/warehouses/');
  return extractList<unknown>(response.data).map(normalizeWarehouse);
};

export const createWarehouse = async (
  data: Record<string, unknown>
): Promise<Warehouse> => {
  const response = await apiClient.post<unknown>('/api/warehouses/', data);
  return normalizeWarehouse(response.data);
};
