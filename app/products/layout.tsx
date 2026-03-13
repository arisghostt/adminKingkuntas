'use client';

import { ReactNode } from 'react';
import { ProductsProvider } from '@/lib/context/ProductsContext';

export default function ProductsLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <ProductsProvider>
            {children}
        </ProductsProvider>
    );
}
