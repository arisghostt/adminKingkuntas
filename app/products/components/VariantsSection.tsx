'use client';

import { useState, useEffect } from 'react';
import { productsApi } from '@/lib/api/products';
import { ProductVariant } from '@/lib/types/product';
import { Loader2, Edit, Trash2, Plus, X, Save } from 'lucide-react';
import { usePermissions } from '@/app/hooks/usePermissions';

interface Props {
    productId: string;
    readOnly?: boolean;
}

export default function VariantsSection({ productId, readOnly = false }: Props) {
    const { canEditProducts } = usePermissions();
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Inline Add / Edit state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '', sku: '', price: 0, stock: 0,
        attributes: {} as Record<string, string>,
        attrKey: '', attrValue: '' // Temp for UI
    });

    const loadVariants = async () => {
        try {
            setIsLoading(true);
            const data = await productsApi.getVariants(productId);
            setVariants(data);
        } catch (err) {
            setErrorMsg("Erreur lors du chargement des variantes.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (productId) loadVariants();
    }, [productId]);

    const resetForm = () => {
        setFormData({ name: '', sku: '', price: 0, stock: 0, attributes: {}, attrKey: '', attrValue: '' });
        setEditingVariantId(null);
        setIsFormOpen(false);
    };

    const handleEditClick = (variant: ProductVariant) => {
        setFormData({
            name: variant.name, sku: variant.sku, price: variant.price, stock: variant.stock,
            attributes: variant.attributes || {}, attrKey: '', attrValue: ''
        });
        setEditingVariantId(variant.id);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer cette variante ?')) return;
        try {
            await productsApi.deleteVariant(productId, id);
            setVariants(prev => prev.filter(v => v.id !== id));
        } catch {
            alert("Erreur lors de la suppression");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name, sku: formData.sku, price: formData.price, stock: formData.stock,
                attributes: formData.attributes
            };

            if (editingVariantId) {
                await productsApi.updateVariant(productId, editingVariantId, payload);
            } else {
                await productsApi.createVariant(productId, payload);
            }
            await loadVariants();
            resetForm();
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la sauvegarde');
        }
    };

    const addAttribute = () => {
        if (formData.attrKey.trim() && formData.attrValue.trim()) {
            setFormData(prev => ({
                ...prev,
                attributes: { ...prev.attributes, [prev.attrKey.trim()]: prev.attrValue.trim() },
                attrKey: '', attrValue: ''
            }));
        }
    };

    const removeAttribute = (key: string) => {
        const newAttrs = { ...formData.attributes };
        delete newAttrs[key];
        setFormData(prev => ({ ...prev, attributes: newAttrs }));
    };

    if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-gray-500 w-6 h-6" /></div>;

    return (
        <div className="w-full">
            {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}

            {!readOnly && canEditProducts && !isFormOpen && (
                <button onClick={() => setIsFormOpen(true)} className="mb-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded flex items-center gap-2">
                    <Plus size={16} /> Ajouter variante
                </button>
            )}

            {isFormOpen && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <input required placeholder="Nom (ex: XL Rouge)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="px-3 py-1.5 border rounded text-sm" />
                        <input required placeholder="SKU" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="px-3 py-1.5 border rounded text-sm" />
                        <input type="number" required placeholder="Prix" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="px-3 py-1.5 border rounded text-sm" />
                        <input type="number" required placeholder="Stock" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="px-3 py-1.5 border rounded text-sm" />
                    </div>
                    <div className="mb-3 p-3 bg-white border rounded">
                        <span className="text-xs font-semibold text-gray-600 block mb-2">Attributs</span>
                        <div className="flex gap-2 mb-2">
                            <input placeholder="Clé (ex: Size)" value={formData.attrKey} onChange={e => setFormData({ ...formData, attrKey: e.target.value })} className="px-2 py-1 border rounded text-sm w-32" />
                            <input placeholder="Valeur (ex: XL)" value={formData.attrValue} onChange={e => setFormData({ ...formData, attrValue: e.target.value })} className="px-2 py-1 border rounded text-sm w-32" />
                            <button type="button" onClick={addAttribute} className="px-2 py-1 bg-gray-200 rounded text-sm"><Plus size={14} /></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(formData.attributes).map(([k, v]) => (
                                <span key={k} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    {k}: {v} <X size={12} className="cursor-pointer" onClick={() => removeAttribute(k)} />
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={resetForm} className="px-3 py-1.5 text-sm border rounded bg-white">Annuler</button>
                        <button type="button" onClick={handleSubmit} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded flex items-center gap-1"><Save size={14} /> {editingVariantId ? 'Modifier' : 'Créer'}</button>
                    </div>
                </div>
            )}

            {variants.length > 0 ? (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Nom</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">SKU</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Prix</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Stock</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500">Attributs</th>
                                {!readOnly && canEditProducts && <th className="px-4 py-2 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {variants.map(v => (
                                <tr key={v.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium text-gray-900">{v.name}</td>
                                    <td className="px-4 py-2 text-gray-600 shadow-sm">{v.sku}</td>
                                    <td className="px-4 py-2 text-gray-600">${v.price}</td>
                                    <td className="px-4 py-2">
                                        <span className={v.stock > 0 ? 'text-green-600' : 'text-red-600'}>{v.stock}</span>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-500">
                                        {Object.entries(v.attributes || {}).map(([k, val]) => `${k}:${val}`).join(', ')}
                                    </td>
                                    {!readOnly && canEditProducts && (
                                        <td className="px-4 py-2 text-right">
                                            <button type="button" onClick={() => handleEditClick(v)} className="text-blue-600 hover:text-blue-800 p-1 mr-2"><Edit size={16} /></button>
                                            <button type="button" onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={16} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-500 text-sm text-center py-4 bg-gray-50 rounded">Aucune variante trouvée.</p>
            )}
        </div>
    );
}
