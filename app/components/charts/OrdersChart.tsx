'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import type { Order } from '@/services/orderService';

interface OrdersChartProps {
  orders?: Order[];
  loading?: boolean;
}

export default function OrdersChart({ orders = [], loading = false }: OrdersChartProps) {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const orderData = useMemo(() => {
    const totals = {
      completed: 0,
      processing: 0,
      pending: 0,
      cancelled: 0,
    };

    for (const order of orders) {
      if (order.status === 'delivered') {
        totals.completed += 1;
      } else if (order.status === 'processing' || order.status === 'shipped') {
        totals.processing += 1;
      } else if (order.status === 'cancelled') {
        totals.cancelled += 1;
      } else {
        totals.pending += 1;
      }
    }

    const totalOrders = Math.max(1, orders.length);

    return [
      {
        name: t('pages.dashboard.charts.orderStatuses.completed'),
        value: Math.round((totals.completed / totalOrders) * 100),
        color: '#10b981',
      },
      {
        name: t('pages.dashboard.charts.orderStatuses.processing'),
        value: Math.round((totals.processing / totalOrders) * 100),
        color: '#f59e0b',
      },
      {
        name: t('pages.dashboard.charts.orderStatuses.pending'),
        value: Math.round((totals.pending / totalOrders) * 100),
        color: '#ef4444',
      },
      {
        name: t('pages.dashboard.charts.orderStatuses.cancelled'),
        value: Math.round((totals.cancelled / totalOrders) * 100),
        color: '#6b7280',
      },
    ];
  }, [orders, t]);

  if (!mounted || loading) {
    return (
      <div className="h-80">
        <div className="flex items-center justify-center h-full bg-gray-50 rounded">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-80"
    >
      
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={orderData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {orderData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => (
              <span>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
