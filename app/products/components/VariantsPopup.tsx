'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import VariantsSection from './VariantsSection';
import { useRouter } from 'next/navigation';
import { useProductsContext } from '@/lib/context/ProductsContext';
import { useLanguage } from '@/app/hooks/useLanguage';

interface VariantsPopupProps {
    productId: string;
    productName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function VariantsPopup({
    productId,
    productName,
    isOpen,
    onClose,
}: VariantsPopupProps) {
    const router = useRouter();
    const { refetch } = useProductsContext();
    const { t } = useLanguage();

    const handleFinish = async () => {
        try {
            if (refetch) {
                await refetch();
            }
        } catch (e) {
            console.error('Failed to refetch products', e);
        }
        onClose();
        router.push('/products');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Manage Variants
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {productName ? `Adding variants for: ${productName}` : 'Product variants'}
                            </p>
                        </div>
                        <button
                            onClick={handleFinish}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                        <VariantsSection productId={productId} />
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                        <button
                            onClick={handleFinish}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-all flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Finish
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
