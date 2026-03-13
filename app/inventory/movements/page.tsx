'use client';

import { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import { useLanguage } from '../../hooks/useLanguage';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StockMovementsTable from '../../components/tables/StockMovementsTable';
import { Download, Filter, Loader2 } from 'lucide-react';
import { exportMovements, type StockMovementsQueryParams } from '@/services/inventoryService';

type FilterType = 'all' | 'in' | 'out';

const extractErrorDetail = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string') return record.message;
  if (typeof record.error === 'string') return record.error;
  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === 'string') {
    return record.non_field_errors[0];
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string') return value;
  }

  return null;
};

export default function InventoryMovementsPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>('all');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [activeFilters, setActiveFilters] = useState<StockMovementsQueryParams>({});

  const resolveErrorMessage = useCallback(
    (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return t('pages.login.errorInvalidTokenRole');
        const detail = extractErrorDetail(err.response?.data);
        if (detail) return detail;
      }
      if (err instanceof Error && err.message.trim().length > 0) return err.message;
      return t('common.failed');
    },
    [t]
  );

  const exportParams = useMemo<StockMovementsQueryParams>(
    () => ({
      ...activeFilters,
      type: filter === 'all' ? undefined : filter,
      page: undefined,
    }),
    [activeFilters, filter]
  );

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await exportMovements(exportParams);
    } catch (exportError) {
      setError(resolveErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('pages.inventory.movements.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm">{t('pages.dashboard.inventory.recentMovements')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterType)}
              className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 sm:pl-4 sm:pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-full sm:w-auto"
            >
              <option value="all">{t('pages.inventory.movements.all')}</option>
              <option value="in">{t('pages.inventory.movements.in')}</option>
              <option value="out">{t('pages.inventory.movements.out')}</option>
            </select>
            <Filter className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm justify-center disabled:opacity-60"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {exporting
                ? t('pages.inventory.movements.exporting', { defaultValue: 'Exporting...' })
                : t('pages.inventory.movements.export')}
            </span>
            <span className="sm:hidden">
              {exporting
                ? t('pages.inventory.movements.exportingShort', { defaultValue: '...' })
                : t('pages.inventory.movements.exportShort')}
            </span>
          </button>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <StockMovementsTable
        filter={filter}
        showFilters
        onFiltersChange={(params) => setActiveFilters(params)}
      />
    </DashboardLayout>
  );
}
