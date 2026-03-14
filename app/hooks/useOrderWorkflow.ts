import { useState, useCallback } from 'react';
import { SalesOrder, updateSalesOrderStatus, checkStockAvailability, createInvoiceFromOrder, getSalesOrderById } from '@/services/salesService';

export type WorkflowStep = 'customer' | 'order' | 'stock_check' | 'confirm' | 'ship' | 'invoice' | 'payment';

const STEPS: WorkflowStep[] = ['customer', 'order', 'stock_check', 'confirm', 'ship', 'invoice', 'payment'];

interface UseOrderWorkflowReturn {
    currentStep: WorkflowStep;
    orderData: SalesOrder | null;
    stockStatus: 'ok' | 'partial' | 'insufficient' | null;
    stockIssues: any[];
    error: string | null;
    loading: boolean;
    goToNextStep: () => Promise<void>;
    setOrderData: (order: SalesOrder) => void;
    setCurrentStep: (step: WorkflowStep) => void;
    resetWorkflow: () => void;
}

export const useOrderWorkflow = (): UseOrderWorkflowReturn => {
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('customer');
    const [orderData, setOrderDataState] = useState<SalesOrder | null>(null);
    const [stockStatus, setStockStatus] = useState<'ok' | 'partial' | 'insufficient' | null>(null);
    const [stockIssues, setStockIssues] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const setOrderData = useCallback((order: SalesOrder) => {
        setOrderDataState(order);
    }, []);

    const resetWorkflow = useCallback(() => {
        setCurrentStep('customer');
        setOrderDataState(null);
        setStockStatus(null);
        setStockIssues([]);
        setError(null);
    }, []);

    const goToNextStep = useCallback(async () => {
        setError(null);
        setLoading(true);

        try {
            if (currentStep === 'customer') {
                // Validation for order step transition currently happens in the UI when the user selects a customer
                // We assume orderData won't be created until 'order' step or is somehow linked. 
                // But functionally, skipping to 'order'
                setCurrentStep('order');
            } else if (currentStep === 'order') {
                if (!orderData || !orderData.id) {
                    throw new Error('Veuillez créer une commande avant de continuer.');
                }
                if (orderData.items_count === 0) {
                    throw new Error('La commande doit contenir au moins un article.');
                }
                // Advance to stock_check, and actually check the stock
                const stockResult = await checkStockAvailability(orderData.id);
                setStockStatus(stockResult.status);
                setStockIssues(stockResult.issues || []);
                setCurrentStep('stock_check');
            } else if (currentStep === 'stock_check') {
                if (stockStatus !== 'ok') {
                    throw new Error('Stock insuffisant. La commande ne peut pas être confirmée.');
                }
                setCurrentStep('confirm');
            } else if (currentStep === 'confirm') {
                if (!orderData) throw new Error('Commande introuvable.');
                const updatedOrder = await updateSalesOrderStatus(orderData.id, 'CONFIRMED');
                setOrderDataState(updatedOrder);
                setCurrentStep('ship');
            } else if (currentStep === 'ship') {
                if (!orderData) throw new Error('Commande introuvable.');
                const updatedOrder = await updateSalesOrderStatus(orderData.id, 'SHIPPED');
                setOrderDataState(updatedOrder);
                setCurrentStep('invoice');
            } else if (currentStep === 'invoice') {
                if (!orderData) throw new Error('Commande introuvable.');
                await createInvoiceFromOrder(orderData);
                setCurrentStep('payment');
            } else if (currentStep === 'payment') {
                // Last step
            }
        } catch (err: any) {
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError(err.message || 'Une erreur est survenue lors de la validation.');
            }
        } finally {
            setLoading(false);
        }
    }, [currentStep, orderData, stockStatus]);

    return {
        currentStep,
        orderData,
        stockStatus,
        stockIssues,
        error,
        loading,
        goToNextStep,
        setOrderData,
        setCurrentStep,
        resetWorkflow,
    };
};
