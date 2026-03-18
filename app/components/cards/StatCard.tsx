'use client';

import { DollarSign, ShoppingCart, Users, RefreshCw, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  iconType: 'dollar' | 'cart' | 'users' | 'refresh';
  iconColor: string;
  loading?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  dollar: DollarSign,
  cart: ShoppingCart,
  users: Users,
  refresh: RefreshCw,
};

export default function StatCard({ title, value, change, changeType, iconType, iconColor, loading = false }: StatCardProps) {
  const Icon = iconMap[iconType];

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="p-3 bg-gray-200 rounded-full w-12 h-12"></div>
        </div>
      </div>
    );
  }
  
  const getChangeIcon = () => {
    if (changeType === 'increase') return '↗';
    if (changeType === 'decrease') return '↘';
    return '—';
  };

  const getChangeColor = () => {
    if (changeType === 'increase') return 'text-green-600';
    if (changeType === 'decrease') return 'text-red-600';
    return 'text-gray-500';
  };
  
  const displayValue = typeof value === 'number' 
    ? (iconType === 'dollar' ? `$${value.toLocaleString()}` : value.toLocaleString())
    : value;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{displayValue}</p>
          <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${getChangeColor()}`}>
            {getChangeIcon()} {change}
          </p>
        </div>
        <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
