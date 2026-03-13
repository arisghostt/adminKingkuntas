'use client';

import { Package, ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';

interface InventoryStatsCardProps {
  title: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  iconType: 'total' | 'in' | 'out';
  iconColor: string;
}

const iconMap: Record<string, LucideIcon> = {
  total: Package,
  in: ArrowUp,
  out: ArrowDown,
};

export default function InventoryStatsCard({
  title,
  value,
  change,
  changeType,
  iconType,
  iconColor,
}: InventoryStatsCardProps) {
  const Icon = iconMap[iconType];

  const getChangeText = () => {
    const prefix = changeType === 'increase' ? '+' : changeType === 'decrease' ? '-' : '';
    return `${prefix}${change}%`;
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <div className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm mt-0.5 sm:mt-1 ${getChangeColor()}`}>
            {changeType === 'increase' && <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />}
            {changeType === 'decrease' && <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            {changeType === 'neutral' && <Minus className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span>{getChangeText()}</span>
            <span className="text-gray-400 hidden sm:inline">{/*this month*/}</span>
          </div>
        </div>
        <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

