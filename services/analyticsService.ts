import { apiClient } from './apiClient';
import { OrderStatus } from './orderService';

// Interfaces for Analytics
export interface AnalyticsStats {
  totalRevenue: { value: number; change: number };
  totalOrders: { value: number; change: number };
  newCustomers: { value: number; change: number };
  productsSold: { value: number; change: number };
}

export interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface CategoryData {
  [key: string]: unknown;
  name: string;
  value: number;
  color: string;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  performance: number;
}

// Helper to calculate percentage change
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number(((current - previous) / previous * 100).toFixed(1));
};

// Helper for date manipulation
const getMonthKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short' });
};

export const getAnalyticsStats = async (): Promise<AnalyticsStats> => {
  try {
    const [ordersRes, customersRes] = await Promise.all([
      apiClient.get('/api/sales/orders/'),
      apiClient.get('/api/parties/customers/')
    ]);

    const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
    const customers = Array.isArray(customersRes.data) ? customersRes.data : (customersRes.data.results || []);

    const now = new Date();
    const currentMonthKey = getMonthKey(now.toISOString());
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = getMonthKey(prevMonth.toISOString());

    // Revenue & Products Sold
    let currentRevenue = 0;
    let prevRevenue = 0;
    let currentSold = 0;
    let prevSold = 0;
    let currentOrdersCount = 0;
    let prevOrdersCount = 0;

    orders.forEach((o: any) => {
      const amount = Number(o.total_amount || o.total || 0);
      const status = String(o.status || o.order_status || '').toLowerCase();
      const dateKey = getMonthKey(o.order_date || o.date || o.created_at);
      
      const isDelivered = status === 'delivered' || status === 'confirmed';
      const items = o.lines || o.items || [];
      const qty = items.reduce((sum: number, item: any) => sum + Number(item.quantity || item.qty || 0), 0);

      if (dateKey === currentMonthKey) {
        currentOrdersCount++;
        if (isDelivered) {
          currentRevenue += amount;
          currentSold += qty;
        }
      } else if (dateKey === prevMonthKey) {
        prevOrdersCount++;
        if (isDelivered) {
          prevRevenue += amount;
          prevSold += qty;
        }
      }
    });

    // New Customers
    const currentNewCust = customers.filter((c: any) => getMonthKey(c.created_at) === currentMonthKey).length;
    const prevNewCust = customers.filter((c: any) => getMonthKey(c.created_at) === prevMonthKey).length;

    return {
      totalRevenue: { value: currentRevenue, change: calculateChange(currentRevenue, prevRevenue) },
      totalOrders: { value: currentOrdersCount, change: calculateChange(currentOrdersCount, prevOrdersCount) },
      newCustomers: { value: currentNewCust, change: calculateChange(currentNewCust, prevNewCust) },
      productsSold: { value: currentSold, change: calculateChange(currentSold, prevSold) }
    };
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    return {
      totalRevenue: { value: 0, change: 0 },
      totalOrders: { value: 0, change: 0 },
      newCustomers: { value: 0, change: 0 },
      productsSold: { value: 0, change: 0 }
    };
  }
};

export const getMonthlyChartData = async (): Promise<MonthlyData[]> => {
  try {
    const [ordersRes, customersRes] = await Promise.all([
      apiClient.get('/api/sales/orders/'),
      apiClient.get('/api/parties/customers/')
    ]);

    const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data.results || []);
    const customers = Array.isArray(customersRes.data) ? customersRes.data : (customersRes.data.results || []);

    const last6Months: Record<string, MonthlyData> = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d.toISOString());
      last6Months[key] = {
        month: getMonthLabel(d.toISOString()),
        revenue: 0,
        orders: 0,
        customers: 0
      };
    }

    orders.forEach((o: any) => {
      const key = getMonthKey(o.order_date || o.date || o.created_at);
      if (last6Months[key]) {
        last6Months[key].orders++;
        const status = String(o.status || o.order_status || '').toLowerCase();
        if (status === 'delivered' || status === 'confirmed') {
          last6Months[key].revenue += Number(o.total_amount || o.total || 0);
        }
      }
    });

    customers.forEach((c: any) => {
      const key = getMonthKey(c.created_at);
      if (last6Months[key]) {
        last6Months[key].customers++;
      }
    });

    return Object.values(last6Months);
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    return [];
  }
};

export const getCategoryData = async (): Promise<CategoryData[]> => {
  try {
    const response = await apiClient.get('/api/products/');
    const products = Array.isArray(response.data) ? response.data : (response.data.results || []);
    
    const categoryCounts: Record<string, number> = {};
    let total = 0;

    products.forEach((p: any) => {
      const catName = p.category?.name || 'Other';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      total++;
    });

    const colors: Record<string, string> = {
      'Electronics': '#3b82f6',
      'Clothing': '#10b981',
      'Home & Garden': '#f59e0b',
      'Sports': '#ef4444',
      'Books': '#8b5cf6',
      'Other': '#94a3b8'
    };

    return Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[name] || '#6366f1'
    }));
  } catch (error) {
    console.error('Error fetching category data:', error);
    return [];
  }
};

export const getTopProducts = async (): Promise<TopProduct[]> => {
  try {
    const response = await apiClient.get('/api/sales/orders/');
    const orders = Array.isArray(response.data) ? response.data : (response.data.results || []);
    
    const productStats: Record<string, { sales: number; revenue: number }> = {};
    let maxSales = 0;

    orders.forEach((o: any) => {
      const status = String(o.status || o.order_status || '').toLowerCase();
      if (status !== 'delivered' && status !== 'confirmed') return;

      const items = o.lines || o.items || [];
      items.forEach((item: any) => {
        const name = item.product_name || item.name || 'Unknown Product';
        const qty = Number(item.quantity || item.qty || 0);
        const price = Number(item.price || item.unit_price || 0);
        
        if (!productStats[name]) {
          productStats[name] = { sales: 0, revenue: 0 };
        }
        productStats[name].sales += qty;
        productStats[name].revenue += qty * price;
        
        if (productStats[name].sales > maxSales) maxSales = productStats[name].sales;
      });
    });

    return Object.entries(productStats)
      .map(([name, stats]) => ({
        name,
        sales: stats.sales,
        revenue: stats.revenue,
        performance: maxSales > 0 ? Math.round((stats.sales / maxSales) * 100) : 0
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  } catch (error) {
    console.error('Error fetching top products:', error);
    return [];
  }
};
