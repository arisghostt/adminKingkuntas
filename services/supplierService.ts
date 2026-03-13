import { apiClient } from './apiClient';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: string;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const record = toRecord(payload);

  const candidates = ['results', 'items', 'data', 'suppliers'];
  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
};

const normalizeSupplier = (payload: unknown): Supplier => {
  const record = toRecord(payload);

  return {
    id: String(record.id ?? ''),
    name: toText(record.name ?? record.full_name),
    email: toText(record.email),
    phone: toText(record.phone),
    location: toText(record.location ?? record.address),
    status: toText(record.status) || 'active',
  };
};

export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await apiClient.get<unknown>('/api/parties/suppliers/');
  return extractList<unknown>(response.data).map(normalizeSupplier);
};

export const createSupplier = async (
  data: Record<string, unknown>
): Promise<Supplier> => {
  const response = await apiClient.post<unknown>('/api/parties/suppliers/', data);
  return normalizeSupplier(response.data);
};

export const getSupplierById = async (id: string): Promise<Supplier> => {
  const response = await apiClient.get<unknown>(`/api/parties/suppliers/${id}/`);
  return normalizeSupplier(response.data);
};

export const updateSupplier = async (
  id: string,
  data: Record<string, unknown>
): Promise<Supplier> => {
  const response = await apiClient.put<unknown>(`/api/parties/suppliers/${id}/`, data);
  return normalizeSupplier(response.data);
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/parties/suppliers/${id}/`);
};
