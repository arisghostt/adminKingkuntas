'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Save, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import CategoryModal from '../components/modals/CategoryModal';
import { useLanguage } from '../../hooks/useLanguage';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import { ProductFormData } from '@/lib/types/product';
import { Category } from '@/lib/types/category';
import ProductImageManager from '../components/ProductImageManager';
import VariantsPopup from '../components/VariantsPopup';
import { useProductsContext } from '@/lib/context/ProductsContext';

export default function AddProductPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { refetch } = useProductsContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // New Image Manager State
  const [mainNewFile, setMainNewFile] = useState<File | null>(null);
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);

  // Variants Popup State
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [createdProductName, setCreatedProductName] = useState('');
  const [isVariantsPopupOpen, setIsVariantsPopupOpen] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    description: '',
    price: 0,
    stock: 0,
    min_stock: 0,
    status: 'active',
    category_id: '',
    features: [''],
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoriesApi.getAll();
        setCategories(data);
      } catch (error: any) {
        if (error.message?.includes('token not valid') || error.message?.includes('401')) {
          router.push('/login');
        }
      }
    };
    fetchCategories();

    const handleCategoriesUpdated = () => fetchCategories();
    if (typeof window !== 'undefined') {
      window.addEventListener('categories-updated', handleCategoriesUpdated);
      return () => window.removeEventListener('categories-updated', handleCategoriesUpdated);
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleCategoryCreated = (category: Category) => {
    setCategories((prev) => [...prev, category]);
    setFormData((prev) => ({ ...prev, category_id: category.id }));
    setIsCategoryModalOpen(false);
  };

  const addFeature = () => setFormData((prev) => ({ ...prev, features: [...prev.features, ''] }));

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? value : f)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name || !formData.sku || !formData.category_id || formData.price <= 0) {
      setErrorMsg('Veuillez remplir le nom, SKU, prix (> 0) et sélectionner une catégorie !');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('sku', formData.sku);
      submitData.append('description', formData.description || '');
      submitData.append('price', String(formData.price));
      submitData.append('stock', String(formData.stock));
      submitData.append('min_stock', String(formData.min_stock));
      submitData.append('status', formData.status);
      submitData.append('category_id', formData.category_id);

      const activeFeatures = formData.features.filter(f => f.trim() !== '');
      activeFeatures.forEach(f => submitData.append('features', f));

      if (mainNewFile) {
        submitData.append('image', mainNewFile);
      }

      newGalleryFiles.forEach((file) => {
        submitData.append('gallery_images', file);
      });

      const newProduct = await productsApi.create(submitData);

      setCreatedProductId(newProduct.id);
      setCreatedProductName(newProduct.name);

      // Notify parent lists to update
      try {
        await refetch();
      } catch (err) {
        console.warn('Failed to refetch after creation', err);
      }

      setSuccessToast(true);

      // Instead of redirecting immediately, we open variants popup
      setIsVariantsPopupOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création du produit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {successToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          Produit créé avec succès !
        </div>
      )}

      {createdProductId && (
        <VariantsPopup
          productId={createdProductId}
          productName={createdProductName}
          isOpen={isVariantsPopupOpen}
          onClose={() => setIsVariantsPopupOpen(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/products" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('pages.products.add.backToProducts')}
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.products.add.title')}</h1>
            <p className="text-gray-600">{t('pages.products.add.subtitle')}</p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => router.push('/products')}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              {t('pages.products.add.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!createdProductId}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('pages.products.add.saveProduct')}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        {createdProductId && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 flex items-center gap-3">
            Produit sauvegardé. Vous pouvez maintenant gérer ses variantes via le popup ouvert (ou s'il a été fermé, retourner à la liste).
            <button
              type="button"
              onClick={() => setIsVariantsPopupOpen(true)}
              className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-sm font-medium hover:bg-blue-100"
            >
              Gérer les variantes
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.products.add.basicInfo')}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.productName')} *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.sku')} *</label>
                    <input
                      type="text"
                      name="sku"
                      required
                      value={formData.sku}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      {t('pages.products.add.category')} *
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        {t('pages.products.add.addCategory')}
                      </button>
                    </label>
                    <div className="relative">
                      <select
                        name="category_id"
                        required
                        value={formData.category_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      >
                        <option value="">Sélectionnez une catégorie</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.description')}</label>
                  <textarea
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.products.add.pricing')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.price')} *</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.products.add.inventory')}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.stockQuantity')}</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.minStock')}</label>
                  <input
                    type="number"
                    name="min_stock"
                    value={formData.min_stock}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.status')}</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">{t('pages.products.add.active')}</option>
                    <option value="inactive">{t('pages.products.add.inactive')}</option>
                    <option value="draft">{t('pages.products.add.draft')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('pages.products.add.features')}</h3>
                <button type="button" onClick={addFeature} className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
              <div className="space-y-3">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder={t('pages.products.add.enterFeature')}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => removeFeature(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-1 border-l pl-4 hidden lg:block border-gray-100"></div>

          <div className="lg:col-span-3 space-y-6 pt-6 border-t border-gray-200 lg:border-t-0 lg:pt-0 pb-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.products.add.productImages')}</h3>
              <ProductImageManager
                existingImages={[]}
                mainImage={null}
                onMainImageChange={(file) => setMainNewFile(file)}
                onImagesChange={(newFiles) => setNewGalleryFiles(newFiles)}
              />
            </div>
          </div>
        </div>
      </form>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </DashboardLayout>
  );
}
