'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import { categoriesApi } from '@/lib/api/categories';
import { Category } from '@/lib/types/category';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (category: Category) => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onCategoryCreated
}: CategoryModalProps) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

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

  const handleStartCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setShowForm(true);
    setErrorMsg('');
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowForm(true);
    setErrorMsg('');
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setShowForm(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingCategory) {
        const updated = await categoriesApi.update(editingCategory.id, formData);
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await categoriesApi.create(formData);
        setCategories(prev => [...prev, created]);
        if (onCategoryCreated) {
          onCategoryCreated(created);
        }
      }
      resetForm();
    } catch (error: any) {
      setErrorMsg(error.message || t('pages.products.categories.messages.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('pages.products.categories.messages.deleteConfirm'))) return;

    try {
      await categoriesApi.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error: any) {
      setErrorMsg(error.message || t('pages.products.categories.messages.deleteError'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {showForm ? (editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie') : 'Catégories'}
            </h2>
            {!showForm && (
              <button
                onClick={fetchCategories}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{errorMsg}</span>
            </div>
          )}

          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex justify-center items-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingCategory ? 'Mettre à jour' : 'Sauvegarder')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucune catégorie trouvée.
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm mb-0">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-500">Produits</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{category.description || '-'}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{category.productCount || 0}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleEdit(category)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(category.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {!showForm && (
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={handleStartCreate}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvelle catégorie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
