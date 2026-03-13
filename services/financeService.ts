import { apiClient } from './apiClient';

export interface FinanceExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: string;
}

export interface FinancePayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  date: string;
  reference: string;
  customer_name: string;
}

export interface FinanceReportResponse {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  period: string;
  raw: Record<string, unknown>;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeDate = (value: unknown): string => {
  const text = toText(value);
  if (!text) return '';
  return text.includes('T') ? text.split('T')[0] : text;
};

const extractList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const record = toRecord(payload);

  const candidates = ['results', 'items', 'data', 'payments', 'expenses'];
  for (const key of candidates) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
};

const normalizeExpense = (payload: unknown): FinanceExpense => {
  const record = toRecord(payload);

  return {
    id: String(record.id ?? ''),
    description: toText(record.description ?? record.title ?? record.reason),
    amount: toNumber(record.amount ?? record.total),
    category: toText(record.category ?? record.type),
    date: normalizeDate(record.date ?? record.created_at),
    status: toText(record.status) || 'recorded',
  };
};

const normalizePayment = (payload: unknown): FinancePayment => {
  const record = toRecord(payload);
  const customer = toRecord(record.customer);

  return {
    id: String(record.id ?? ''),
    amount: toNumber(record.amount ?? record.total),
    method: toText(record.method ?? record.payment_method ?? record.type),
    status: toText(record.status) || 'completed',
    date: normalizeDate(record.date ?? record.created_at ?? record.payment_date),
    reference: toText(record.reference ?? record.transaction_id ?? record.invoice_number),
    customer_name: toText(record.customer_name ?? customer.name ?? customer.full_name ?? customer.username),
  };
};

export const getFinanceExpenses = async (): Promise<FinanceExpense[]> => {
  const response = await apiClient.get<unknown>('/api/finance/expenses/');
  return extractList<unknown>(response.data).map(normalizeExpense);
};

export const createFinanceExpense = async (
  data: Record<string, unknown>
): Promise<FinanceExpense> => {
  const response = await apiClient.post<unknown>('/api/finance/expenses/', data);
  return normalizeExpense(response.data);
};

export const getFinancePayments = async (): Promise<FinancePayment[]> => {
  const response = await apiClient.get<unknown>('/api/finance/payments/');
  return extractList<unknown>(response.data).map(normalizePayment);
};

export const createFinancePayment = async (
  data: Record<string, unknown>
): Promise<FinancePayment> => {
  const response = await apiClient.post<unknown>('/api/finance/payments/', data);
  return normalizePayment(response.data);
};

export const generateFinanceReport = async (
  data: Record<string, unknown>
): Promise<FinanceReportResponse> => {
  const response = await apiClient.post<Record<string, unknown>>('/api/finance/reports/', data);
  const record = toRecord(response.data);

  return {
    total_income: toNumber(record.total_income ?? record.income),
    total_expenses: toNumber(record.total_expenses ?? record.expenses),
    net_profit: toNumber(record.net_profit ?? record.profit),
    period: toText(record.period),
    raw: record,
  };
};
