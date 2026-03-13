'use client';

import { DollarSign, ShoppingCart, Users, RefreshCw, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease';
  iconType: 'dollar' | 'cart' | 'users' | 'refresh';
  iconColor: string;
}

const iconMap: Record<string, LucideIcon> = {
  dollar: DollarSign,
  cart: ShoppingCart,
  users: Users,
  refresh: RefreshCw,
};

export default function StatCard({ title, value, change, changeType, iconType, iconColor }: StatCardProps) {
  const Icon = iconMap[iconType];
  
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">{value}</p>
          <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${
            changeType === 'increase' ? 'text-green-600' : 'text-red-600'
          }`}>
            {changeType === 'increase' ? '↗' : '↘'} {change}
          </p>
        </div>
        <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
