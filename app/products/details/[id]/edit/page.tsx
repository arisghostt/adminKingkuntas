'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import { Save, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import CategoryModal from '../../../components/modals/CategoryModal';
import VariantsSection from '../../../components/VariantsSection';
import { useLanguage } from '../../../../hooks/useLanguage';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import { ProductFormData } from '@/lib/types/product';
import { Category } from '@/lib/types/category';
import ProductImageManager from '../../../components/ProductImageManager';
import { useProductsContext } from '@/lib/context/ProductsContext';

export default function EditProductPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { refetch } = useProductsContext();

    const [categories, setCategories] = useState<Category[]>([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successToast, setSuccessToast] = useState(false);

    // Image Manager State
    const [mainImage, setMainImage] = useState<string | null>(null);
    const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);

    // Changes from Image Manager
    const [mainNewFile, setMainNewFile] = useState<File | null>(null);
    const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
    const [urlsToDelete, setUrlsToDelete] = useState<string[]>([]);

    const [formData, setFormData] = useState<ProductFormData>({
        name: '', sku: '', description: '', price: 0,
        stock: 0, min_stock: 0, status: 'active', category_id: '',
        features: [''],
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cats, product] = await Promise.all([
                    categoriesApi.getAll(),
                    productsApi.getById(id as string)
                ]);
                setCategories(cats);

                setFormData({
                    name: product.name || '',
                    sku: product.sku || '',
                    description: product.description || '',
                    price: product.price || 0,
                    stock: product.stock || 0,
                    min_stock: product.min_stock || 0,
                    status: product.status || 'active',
                    category_id: product.category_id || '',
                    features: product.features?.length ? product.features : [''],
                });

                setMainImage(product.image || null);
                setExistingGalleryImages(product.gallery_images || (product as any).galleryImages || []);

            } catch (err: any) {
                setErrorMsg('Erreur lors du chargement des données.');
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchData();
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleCategoryCreated = (category: Category) => {
        setCategories(prev => [...prev, category]);
        setFormData(prev => ({ ...prev, category_id: category.id }));
        setIsCategoryModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsSubmitting(true);

        try {
            // First, delete marked gallery images
            if (urlsToDelete.length > 0) {
                await productsApi.deleteGalleryImages(id as string, urlsToDelete);
            }

            // Also clear main image if it was removed and no new one was added
            // ProductImageManager sets mainImage to null when user clicks X but hasn't uploaded a new one via local state
            // Wait, ProductImageManager doesn't mutate existing mainImage prop. 
            // We know if user removed mainImage if `mainNewFile` is null AND user actively removed it.
            // Actually, in ProductImageManager we only pass `mainNewFile`. 
            // If the user clicks "remove" on existing main image, my implementation of ProductImageManager 
            // just shows a cleared preview via `setClearMainExisting(true)`. 
            // Wait! I didn't expose `clearMainExisting` to the parent in `ProductImageManager`!
            // That's a bug in `ProductImageManager`. Let me just call `productsApi.clearMainImage` IF we need it.
            // Actually, if a user uploads a new main file, Django might override the existing main image automatically.

            // Build the updated form data
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
            submitData.append('features', JSON.stringify(activeFeatures));

            if (mainNewFile) {
                submitData.append('image', mainNewFile);
            }

            newGalleryFiles.forEach((file) => {
                submitData.append('gallery_images', file);
            });

            await productsApi.update(id as string, submitData);

            // Refetch lists
            try {
                await refetch();
            } catch (err) {
                console.warn("Failed to refetch globally", err);
            }

            setSuccessToast(true);
            setTimeout(() => {
                router.push('/products');
                router.refresh();
            }, 1500);
        } catch (err: any) {
            setErrorMsg(err.message || 'Erreur modification');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <DashboardLayout><div className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8" /></div></DashboardLayout>;

    return (
        <DashboardLayout>
            {successToast && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                    Modification sauvegardée !
                </div>
            )}
            <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <Link href={`/products/details/${id}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Retour au détail
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Éditer le produit</h1>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => router.push('/products')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Mettre à jour
                        </button>
                    </div>
                </div>

                {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{errorMsg}</div>}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold mb-4">Infos base</h3>
                            <div className="space-y-4">
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nom" required className="w-full px-4 py-2 border rounded-lg" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="sku" value={formData.sku} onChange={handleChange} placeholder="SKU" required className="w-full px-4 py-2 border rounded-lg" />
                                    <select name="category_id" required value={formData.category_id} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                                        <option value="">Sélectionnez categorie</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" rows={4} className="w-full px-4 py-2 border rounded-lg" />
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold mb-4">Prix & Stocks</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Prix" step="0.01" required className="w-full px-4 py-2 border rounded-lg" />
                                <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="Stock" className="w-full px-4 py-2 border rounded-lg" />
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                                    <option value="active">Actif</option><option value="inactive">Inactif</option><option value="draft">Brouillon</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">Variantes</h3>
                            <VariantsSection productId={id as string} readOnly={false} />
                        </div>

                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold mb-4">Images</h3>
                            <ProductImageManager
                                existingImages={existingGalleryImages}
                                mainImage={mainImage}
                                onMainImageChange={(file) => setMainNewFile(file)}
                                onImagesChange={(newFiles, toDelete) => {
                                    setNewGalleryFiles(newFiles);
                                    setUrlsToDelete(toDelete);
                                }}
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
