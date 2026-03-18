import { apiClient } from './apiClient';

export interface DashboardStats {
  total_revenue: number;
  total_revenue_change: number;
  orders_count: number;
  orders_change: number;
  customers_count: number;
  customers_change: number;
  refunds_count: number;
  refunds_amount: number;
  refunds_change: number;
}

export const defaultDashboardStats: DashboardStats = {
  total_revenue: 0,
  total_revenue_change: 0,
  orders_count: 0,
  orders_change: 0,
  customers_count: 0,
  customers_change: 0,
  refunds_count: 0,
  refunds_amount: 0,
  refunds_change: 0,
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get('/api/admin/dashboard/stats/');
  // normaliser les champs avec fallback à 0 si absent
  return { ...defaultDashboardStats, ...response.data };
};
