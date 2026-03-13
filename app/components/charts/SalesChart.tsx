'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';
import type { Order } from '@/services/orderService';

interface SalesChartProps {
  orders?: Order[];
  loading?: boolean;
}

export default function SalesChart({ orders = [], loading = false }: SalesChartProps) {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  const salesData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 7 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
      return {
        year: monthDate.getFullYear(),
        month: monthDate.getMonth(),
        monthLabel: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        sales: 0,
      };
    });

    for (const order of orders) {
      const date = new Date(order.date);
      if (Number.isNaN(date.getTime())) continue;

      const target = months.find(
        (month) => month.year === date.getFullYear() && month.month === date.getMonth()
      );
      if (!target) continue;

      target.sales += order.total;
    }

    return months.map((month) => ({
      month: month.monthLabel,
      sales: Number(month.sales.toFixed(2)),
    }));
  }, [orders]);

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
        <LineChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
