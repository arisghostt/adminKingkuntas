'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useOrderWorkflow, WorkflowStep } from '../../../app/hooks/useOrderWorkflow';
import {
    User, ShoppingBag, PackageSearch, CheckCircle,
    Truck, FileText, CreditCard, AlertTriangle, ArrowRight, Check
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { getCustomers, Customer } from '@/services/partiesService';
import { createSalesOrder } from '@/services/salesService';

const STEPS_CONFIG: { id: WorkflowStep; label: string; icon: React.ElementType }[] = [
    { id: 'customer', label: 'Client', icon: User },
    { id: 'order', label: 'Commande', icon: ShoppingBag },
    { id: 'stock_check', label: 'Stock', icon: PackageSearch },
    { id: 'confirm', label: 'Confirmation', icon: CheckCircle },
    { id: 'ship', label: 'Expédition', icon: Truck },
    { id: 'invoice', label: 'Facturation', icon: FileText },
    { id: 'payment', label: 'Paiement', icon: CreditCard },
];

export default function OrderWorkflowPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const {
        currentStep, orderData, stockStatus, stockIssues,
        error, loading, goToNextStep, setOrderData, setCurrentStep
    } = useOrderWorkflow();

    const currentStepIndex = STEPS_CONFIG.findIndex(s => s.id === currentStep);

    // States for Customer Step
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    useEffect(() => {
        getCustomers().then(setCustomers).catch(console.error);
    }, []);

    const handleCreateOrder = async () => {
        if (!selectedCustomerId) return;
        try {
            // Create an empty order for the customer
            const order = await createSalesOrder({
                customer_id: selectedCustomerId,
                order_date: new Date().toISOString().split('T')[0],
                lines: []
            });
            setOrderData(order);
            // Let goToNextStep push it to next state
            await goToNextStep();
        } catch (err: any) {
            console.error(err);
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau Workflow de Commande</h1>
                <p className="text-sm text-gray-600">Suivez les étapes pour traiter et valider une nouvelle commande.</p>
            </div>

            {/* STEPPER */}
            <div className="mb-8 overflow-x-auto pb-4">
                <div className="flex items-center min-w-max px-4">
                    {STEPS_CONFIG.map((step, index) => {
                        const isActive = index === currentStepIndex;
                        const isCompleted = index < currentStepIndex;
                        const isPending = index > currentStepIndex;
                        const Icon = step.icon;

                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center group cursor-default">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2 transition-colors ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' :
                                            isCompleted ? 'border-green-500 bg-green-500 text-white' :
                                                'border-gray-200 bg-gray-50 text-gray-400'
                                        }`}>
                                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-blue-600' :
                                            isCompleted ? 'text-green-600' :
                                                'text-gray-400'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < STEPS_CONFIG.length - 1 && (
                                    <div className={`w-12 h-[2px] mx-2 mb-6 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                        }`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                {error && (
                    <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <div className="h-full flex flex-col justify-between">
                    <div className="flex-1 mb-8">
                        {/* STEP: CUSTOMER */}
                        {currentStep === 'customer' && (
                            <div className="max-w-lg mx-auto mt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Sélectionner un client</h3>
                                <p className="text-sm text-gray-600 mb-6">Pour démarrer une nouvelle commande, vous devez l'associer à un client enregistré.</p>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 bg-white"
                                >
                                    <option value="">Sélectionnez un client...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* STEP: ORDER */}
                        {currentStep === 'order' && (
                            <div className="max-w-2xl mx-auto mt-6 text-center">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Composer la commande</h3>
                                <p className="text-sm text-gray-600 mb-6">Ajoutez des articles à la commande #{orderData?.id}. Vous pouvez naviguer vers la page d'édition de la commande pour ajouter les lignes de produits.</p>

                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-gray-500">Commande ID:</span>
                                        <span className="font-medium text-gray-900">{orderData?.id}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-gray-500">Articles:</span>
                                        <span className="font-medium text-gray-900">{orderData?.items_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Total provisoire:</span>
                                        <span className="font-medium text-gray-900">${orderData?.total || '0.00'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => window.open(`/orders/${orderData?.id}/edit`, '_blank')}
                                    className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-200 mb-4 inline-flex items-center gap-2"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    Gérer les articles de la commande (Nouvel onglet)
                                </button>
                            </div>
                        )}

                        {/* STEP: STOCK CHECK */}
                        {currentStep === 'stock_check' && (
                            <div className="mx-auto mt-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Vérification de la disponibilité</h3>
                                {stockStatus === 'ok' ? (
                                    <div className="p-6 bg-green-50 text-green-800 rounded-xl border border-green-200 flex flex-col items-center justify-center text-center">
                                        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                                        <h4 className="text-lg font-bold mb-1">Stock suffisant</h4>
                                        <p className="text-sm">Tous les produits de cette commande sont disponibles en stock.</p>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3 text-orange-800">
                                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-sm">Problème de disponibilité</h4>
                                                <p className="text-sm mt-1">Certains produits de cette commande n'ont pas ou pas assez de stock pour être honorés. Veuillez vous réapprovisionner ou retirer ces articles.</p>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock dispo</th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commandé</th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Manque</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {stockIssues.map((issue, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{issue.product_name || issue.name || 'Produit inconnu'}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">{issue.sku || '-'}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{issue.available_stock || 0}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{issue.requested_quantity || 0}</td>
                                                            <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">
                                                                {Math.max(0, (issue.requested_quantity || 0) - (issue.available_stock || 0))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OTHER STEPS CAN BE ADDED HERE */}
                        {['confirm', 'ship', 'invoice', 'payment'].includes(currentStep) && (
                            <div className="max-w-2xl mx-auto mt-12 text-center">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    {currentStep === 'confirm' && <CheckCircle className="w-8 h-8" />}
                                    {currentStep === 'ship' && <Truck className="w-8 h-8" />}
                                    {currentStep === 'invoice' && <FileText className="w-8 h-8" />}
                                    {currentStep === 'payment' && <CreditCard className="w-8 h-8" />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {currentStep === 'confirm' && "Confirmation de la commande"}
                                    {currentStep === 'ship' && "Expédition"}
                                    {currentStep === 'invoice' && "Génération de la facture"}
                                    {currentStep === 'payment' && "Paiement en attente"}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    {currentStep === 'confirm' && "La commande est prête à être validée officiellement. Ceci mettra à jour le statut et réservera le stock."}
                                    {currentStep === 'ship' && "Passez la commande au statut 'Expédiée' après l'avoir confiée au transporteur."}
                                    {currentStep === 'invoice' && "Créez automatiquement la facture correspondante pour le client."}
                                    {currentStep === 'payment' && "Enregistrez le paiement reçu pour finaliser la transaction globale !"}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <button
                            onClick={() => router.push('/orders')}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium"
                        >
                            Quitter le workflow
                        </button>
                        <button
                            onClick={() => {
                                if (currentStep === 'customer') {
                                    handleCreateOrder();
                                } else {
                                    goToNextStep();
                                }
                            }}
                            disabled={loading || (currentStep === 'customer' && !selectedCustomerId) || (currentStep === 'order' && (!orderData || orderData.items_count === 0)) || (currentStep === 'stock_check' && stockStatus !== 'ok')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                            {currentStep === 'payment' ? 'Terminer' : 'Étape suivante'}
                            {currentStep !== 'payment' && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
