import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, AlertTriangle, ArrowUpDown, FolderOpen, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/app/hooks/useLanguage';
import { categoriesApi } from '@/lib/api/categories';
import { Category } from '@/lib/types/category';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function CategoriesTab() {
    const { t } = useLanguage();
    const { canEditProducts } = usePermissions();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'productCount'; direction: 'asc' | 'desc' }>({
        key: 'name',
        direction: 'asc'
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchCategories = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const data = await categoriesApi.getAll();
            setCategories(data);
        } catch (error: any) {
            setErrorMsg(error.message || t('pages.products.categories.messages.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const notifyCategoriesUpdated = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('categories-updated'));
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSort = (key: 'name' | 'productCount') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedCategories = useMemo(() => {
        let result = [...categories];

        if (search.trim()) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(lowerSearch) ||
                (c.description && c.description.toLowerCase().includes(lowerSearch))
            );
        }

        result.sort((a, b) => {
            if (sortConfig.key === 'name') {
                const compare = a.name.localeCompare(b.name);
                return sortConfig.direction === 'asc' ? compare : -compare;
            } else {
                const diff = (a.productCount || 0) - (b.productCount || 0);
                return sortConfig.direction === 'asc' ? diff : -diff;
            }
        });

        return result;
    }, [categories, search, sortConfig]);

    // Statistics
    const totalCategories = categories.length;
    const highestProductsCategory = categories.reduce((prev, current) => (prev.productCount || 0) > (current.productCount || 0) ? prev : current, categories[0]);
    const emptyCategoriesCount = categories.filter(c => (c.productCount || 0) === 0).length;

    const resetForm = () => {
        setFormData({ name: '', description: '' });
        setEditingId(null);
        setIsFormOpen(false);
    };

    const startCreate = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const startEdit = (category: Category) => {
        setFormData({ name: category.name, description: category.description || '' });
        setEditingId(category.id);
        setIsFormOpen(true);
    };

    const handleDelete = async (category: Category) => {
        if (category.productCount > 0) {
            alert(`Impossible : cette catégorie contient ${category.productCount} produit(s). Réassignez-les d'abord.`);
            return;
        }

        if (!window.confirm(t('pages.products.categories.messages.deleteConfirm', 'Voulez-vous vraiment supprimer cette catégorie ?'))) return;

        try {
            await categoriesApi.delete(category.id);
            setCategories(prev => prev.filter(c => c.id !== category.id));
            notifyCategoriesUpdated();
            showToast(t('pages.products.categories.messages.deleteSuccess', 'Catégorie supprimée avec succès.'), 'success');
        } catch (error: any) {
            showToast(error.message || t('pages.products.categories.messages.deleteError'), 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        // Check unique name locally
        const duplicate = categories.find(c => c.name.toLowerCase() === formData.name.toLowerCase() && c.id !== editingId);
        if (duplicate) {
            showToast(t('pages.products.categories.messages.duplicateName', 'Ce nom de catégorie existe déjà.'), 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingId) {
                const updated = await categoriesApi.update(editingId, formData);
                setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
                notifyCategoriesUpdated();
                showToast(t('pages.products.categories.messages.updateSuccess', 'Catégorie mise à jour avec succès.'), 'success');
            } else {
                const created = await categoriesApi.create(formData);
                setCategories(prev => [...prev, created]);
                notifyCategoriesUpdated();
                showToast(t('pages.products.categories.messages.createSuccess', 'Catégorie créée avec succès.'), 'success');
            }
            resetForm();
        } catch (error: any) {
            showToast(error.message || t('pages.products.categories.messages.updateError'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Catégories</h2>
                    <p className="text-gray-600 text-sm">Gérez les catégories de produits de votre catalogue.</p>
                </div>
                {!isFormOpen && canEditProducts && (
                    <button
                        onClick={startCreate}
                        className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Nouvelle catégorie
                    </button>
                )}
            </div>

            {!loading && !errorMsg && categories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total catégories</p>
                                <p className="text-2xl font-bold text-gray-900">{totalCategories}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-600 truncate">Max. produits : {highestProductsCategory?.name}</p>
                                <p className="text-2xl font-bold text-gray-900">{highestProductsCategory?.productCount || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Catégories vides</p>
                                <p className="text-2xl font-bold text-gray-900">{emptyCategoriesCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {errorMsg ? (
                <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center border border-red-200">
                    <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                    <p>{errorMsg}</p>
                    <button onClick={fetchCategories} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Réessayer</button>
                </div>
            ) : loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : isFormOpen ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 border-b pb-2">
                        {editingId ? 'Modifier la catégorie' : 'Créer une catégorie'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom (max 100 caractères) *</label>
                            <input
                                type="text"
                                required
                                maxLength={100}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex. Électronique"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={4}
                                placeholder="Description facultative..."
                            />
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={isSubmitting}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? 'Sauvegarder' : 'Créer')}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher une catégorie..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                        <div className="flex items-center gap-1">Nom {sortConfig.key === 'name' && <ArrowUpDown className="w-3 h-3" />}</div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th onClick={() => handleSort('productCount')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                        <div className="flex items-center gap-1">Nb Produits {sortConfig.key === 'productCount' && <ArrowUpDown className="w-3 h-3" />}</div>
                                    </th>
                                    {canEditProducts && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredAndSortedCategories.length > 0 ? filteredAndSortedCategories.map((category) => {
                                    const prodCount = category.productCount || 0;
                                    let badgeColor = 'bg-red-100 text-red-800'; // 0 -> rouge
                                    if (prodCount > 0 && prodCount <= 5) badgeColor = 'bg-orange-100 text-orange-800'; // 1-5 -> orange
                                    else if (prodCount >= 6) badgeColor = 'bg-green-100 text-green-800'; // 6+ -> vert
                                    return (
                                        <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{category.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{category.description || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                                                    {prodCount}
                                                </span>
                                            </td>
                                            {canEditProducts && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => startEdit(category)} className="text-blue-600 hover:text-blue-900 mr-4 p-1 rounded hover:bg-blue-50" title="Éditer">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(category)} className={`p-1 rounded ${prodCount > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900 hover:bg-red-50'}`} disabled={prodCount > 0} title={prodCount > 0 ? "Impossible de supprimer (contient des produits)" : "Supprimer"}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={canEditProducts ? 4 : 3} className="px-6 py-8 text-center text-gray-500">
                                            Aucune catégorie trouvée.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
