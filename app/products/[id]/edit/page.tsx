'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, AlertTriangle, X } from 'lucide-react';

import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useLanguage } from '../../../hooks/useLanguage';
import { categoriesApi, productsApi, type Category } from '@/lib/api';

type ProductFormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
  status: 'active' | 'inactive';
  rating: string;
  sku: string;
};

export default function EditProductPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [initialMainImage, setInitialMainImage] = useState('');
  const [existingMainImage, setExistingMainImage] = useState('');
  const [mainImageRemoved, setMainImageRemoved] = useState(false);

  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [removedExistingGalleryImages, setRemovedExistingGalleryImages] = useState<string[]>([]);

  const [form, setForm] = useState<ProductFormState>({
    name: '',
    category: '',
    price: '0',
    stock: '0',
    status: 'active',
    rating: '0',
    sku: '',
  });

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [product, fetchedCategories] = await Promise.all([
          productsApi.getById(id),
          categoriesApi.getAll(),
        ]);

        setCategories(fetchedCategories);
        setInitialMainImage(product.image || '');
        setExistingMainImage(product.image || '');
        setMainImageRemoved(false);
        setExistingGalleryImages(product.galleryImages ?? []);
        setRemovedExistingGalleryImages([]);
        setForm({
          name: product.name,
          category: product.category,
          price: String(product.price),
          stock: String(product.stock),
          status: product.status,
          rating: String(product.rating),
          sku: product.sku,
        });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!mainImageFile) {
      setMainImagePreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(mainImageFile);
    setMainImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [mainImageFile]);

  useEffect(() => {
    if (galleryFiles.length === 0) {
      setGalleryPreviews([]);
      return;
    }

    const previewUrls = galleryFiles.map((file) => URL.createObjectURL(file));
    setGalleryPreviews(previewUrls);

    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [galleryFiles]);

  const updateField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const addGalleryFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setGalleryFiles((previous) => [...previous, ...files]);
    event.target.value = '';
  };

  const removeGalleryFile = (indexToRemove: number) => {
    setGalleryFiles((previous) => previous.filter((_, index) => index !== indexToRemove));
  };

  const removeExistingGalleryImage = (indexToRemove: number) => {
    const imageToRemove = existingGalleryImages[indexToRemove];
    if (imageToRemove) {
      setRemovedExistingGalleryImages((previous) =>
        previous.includes(imageToRemove) ? previous : [...previous, imageToRemove]
      );
    }

    setExistingGalleryImages((previous) => previous.filter((_, index) => index !== indexToRemove));
  };

  const clearMainImage = () => {
    if (mainImagePreview) {
      // Cancel a newly selected file and keep current persisted image.
      setMainImageFile(null);
      setMainImagePreview('');
      if (!existingMainImage && initialMainImage) {
        setMainImageRemoved(true);
      }
      return;
    }

    if (existingMainImage) {
      setExistingMainImage('');
      setMainImageRemoved(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setSaving(true);
    setError('');

    const payload = new FormData();
    payload.append('name', form.name.trim());
    payload.append('category', form.category.trim());
    payload.append('price', String(Number(form.price) || 0));
    payload.append('stock', String(Math.max(0, Math.trunc(Number(form.stock) || 0))));
    payload.append('status', form.status);
    payload.append('rating', String(Number(form.rating) || 0));

    if (mainImageFile) {
      payload.append('image', mainImageFile);
    } else if (!existingMainImage) {
      payload.append('image', '');
    }

    galleryFiles.forEach((file) => {
      payload.append('gallery_images', file);
    });

    try {
      await productsApi.update(id, payload);

      const cleanupRequests: Promise<unknown>[] = [];
      if (mainImageRemoved && !mainImageFile) {
        cleanupRequests.push(productsApi.clearMainImage(id));
      }
      if (removedExistingGalleryImages.length > 0) {
        cleanupRequests.push(productsApi.deleteGalleryImages(id, removedExistingGalleryImages));
      }

      if (cleanupRequests.length > 0) {
        const cleanupResults = await Promise.allSettled(cleanupRequests);
        const failedCleanup = cleanupResults.some((result) => result.status === 'rejected');
        if (failedCleanup) {
          throw new Error('Product updated, but some images could not be deleted');
        }
      }

      router.push(`/products/details/${id}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link href={`/products/details/${id}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('pages.products.details.backToProducts')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.products.details.editProduct')}</h1>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.productName')}</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.category')}</label>
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('pages.products.filters.allCategories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.sku')}</label>
            <input
              type="text"
              value={form.sku}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.price')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.stockQuantity')}</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={form.stock}
              onChange={(event) => updateField('stock', event.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.products.add.status')}</label>
            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value === 'inactive' ? 'inactive' : 'active')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">{t('pages.products.status.active')}</option>
              <option value="inactive">{t('pages.products.status.inactive')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={form.rating}
            onChange={(event) => updateField('rating', event.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image principale</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setMainImageFile(nextFile);
              if (nextFile) {
                setMainImageRemoved(false);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {(mainImagePreview || existingMainImage) && (
            <div className="mt-3 relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200">
              <img src={mainImagePreview || existingMainImage} alt="Main preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clearMainImage}
                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                title="Supprimer l'image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Images de galerie (plusieurs)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={addGalleryFiles}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />

          {(existingGalleryImages.length > 0 || galleryPreviews.length > 0) && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {existingGalleryImages.map((imageUrl, index) => (
                <div key={`existing-${index}`} className="relative h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={imageUrl} alt={`Existing gallery ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingGalleryImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    title="Supprimer l'image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {galleryPreviews.map((previewUrl, index) => (
                <div key={`new-${previewUrl}`} className="relative h-20 rounded-lg overflow-hidden border border-blue-300">
                  <img src={previewUrl} alt={`New gallery ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryFile(index)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/products/details/${id}`)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            {t('pages.products.add.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save')}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
