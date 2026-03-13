export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

const initialCategories: Category[] = [
  {
    id: '1',
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    productCount: 15,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Accessories',
    description: 'Phone and laptop accessories',
    productCount: 23,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    id: '3',
    name: 'Office',
    description: 'Office supplies and furniture',
    productCount: 8,
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __kkCategoriesStore: Category[] | undefined;
}

// Keep one process-wide store so /api/categories and /api/categories/[id]
// see the same mutations in dev/server runtime.
export const categories: Category[] =
  globalThis.__kkCategoriesStore ??
  (globalThis.__kkCategoriesStore = [...initialCategories]);
