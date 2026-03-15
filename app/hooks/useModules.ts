import { useState, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

export interface Module {
  id: number;
  name: string;
  url: string;
}

interface UseModulesResult {
  modules: Module[];
  loading: boolean;
  error: string | null;
}

// Module-level cache to avoid redundant calls between components
let modulesCache: Module[] | null = null;
let loadingCache: boolean = false;
let errorCache: string | null = null;
let listeners: Array<(result: UseModulesResult) => void> = [];

export const useModules = (): UseModulesResult => {
  const [result, setResult] = useState<UseModulesResult>({
    modules: modulesCache || [],
    loading: modulesCache ? false : loadingCache,
    error: errorCache,
  });

  useEffect(() => {
    const notify = (newResult: UseModulesResult) => {
      setResult(newResult);
    };

    listeners.push(notify);

    if (!modulesCache && !loadingCache) {
      loadingCache = true;
      errorCache = null;
      
      const updateAll = (newResult: UseModulesResult) => {
        modulesCache = newResult.modules;
        loadingCache = newResult.loading;
        errorCache = newResult.error;
        listeners.forEach(l => l(newResult));
      };

      apiClient.get('/api/modules/')
        .then(response => {
          const rawModules = Array.isArray(response.data) ? response.data : [];
          const normalizedModules = rawModules.map((m: any) => ({
            id: m.module_id || m.id,
            name: m.module_name || m.name,
            url: m.module_url || m.url || ''
          }));
          updateAll({ modules: normalizedModules, loading: false, error: null });
        })
        .catch(err => {
          console.error('[useModules] Error loading modules:', err);
          updateAll({ 
            modules: [], 
            loading: false, 
            error: err.response?.data?.message || 'Failed to load modules' 
          });
        });
    } else if (modulesCache) {
        // Already have cache, notify this listener immediately (just in case)
        notify({ modules: modulesCache, loading: false, error: errorCache });
    }

    return () => {
      listeners = listeners.filter(l => l !== notify);
    };
  }, []);

  return result;
};
