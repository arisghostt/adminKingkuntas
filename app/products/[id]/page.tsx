'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Edit, Trash2, ArrowLeft, Star, Plus, Minus, ShoppingCart, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '../../hooks/useLanguage';
import { productsApi } from '@/lib/api/products';
import type { Product } from '@/lib/types/product';
import VariantsSection from '../components/VariantsSection';
import { usePermissions } from '@/app/hooks/usePermissions';

export default function ProductDetailsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { canEditProducts } = usePermissions();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [relatedImageErrors, setRelatedImageErrors] = useState<Record<string, boolean>>({});

  // Nouveaux états pour le modal Lightbox
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await productsApi.getById(id as string);
        setProduct(data);

        // Map product.gallery_images if strictly necessary
        const rawData = data as any;
        const images = Array.from(
          new Set([data.image, ...(rawData.galleryImages ?? []), ...(data.gallery_images ?? [])].filter((img) => typeof img === 'string' && img.length > 0))
        );
        setSelectedImage(images[0] ?? '');
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch product');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Log de debug comme demandé
  useEffect(() => {
    if (product) {
      const raw = product as any;
      console.log('product.gallery_images:', product.gallery_images);
      console.log('product.galleryImages:', raw.galleryImages);
    }
  }, [product]);

  // Navigation clavier pour le Lightbox
  useEffect(() => {
    if (!zoomOpen || !product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomOpen(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const raw = product as any;
        const allImages = [
          product.image,
          ...(raw.galleryImages ?? []),
          ...(product.gallery_images ?? []),
        ].filter((img): img is string => typeof img === 'string' && img.length > 0);

        const galleryImages = Array.from(new Set(allImages));
        if (galleryImages.length <= 1) return;

        setSelectedImage((prev) => {
          const currentIndex = galleryImages.indexOf(prev || galleryImages[0] || '');
          if (e.key === 'ArrowLeft') {
            const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
            return galleryImages[prevIndex] || '';
          } else {
            const nextIndex = (currentIndex + 1) % galleryImages.length;
            return galleryImages[nextIndex] || '';
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomOpen, product]);

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    try {
      await productsApi.delete(id as string);
      router.push('/products');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product');
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

  if (!product) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Link href="/products" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('pages.products.details.backToProducts')}
          </Link>
          {error ? (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    );
  }

  const raw = product as any;
  const allImages = [
    product.image,
    ...(raw.galleryImages ?? []),
    ...(product.gallery_images ?? []),
  ].filter((img): img is string => typeof img === 'string' && img.length > 0);
  const galleryImages = Array.from(new Set(allImages));

  const activeImage = selectedImage || galleryImages[0] || '';

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-6">
          <Link href="/products" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('pages.products.details.backToProducts')}
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('pages.products.details.title')}</h1>
              <p className="text-gray-600">{t('pages.products.details.subtitle')}</p>
            </div>
            <div className="flex space-x-3">
              {canEditProducts && (
                <>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('pages.products.details.delete')}
                  </button>
                  <button
                    onClick={() => router.push(`/products/details/${id}/edit`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {t('pages.products.details.editProduct')}
                  </button>
                </>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div
                className="h-80 bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative cursor-zoom-in"
                onClick={() => setZoomOpen(true)}
              >
                {activeImage && !imageErrors[activeImage] ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [activeImage]: true }));
                    }}
                  />
                ) : (
                  <span className="text-gray-400">{t('pages.products.details.productImage')}</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {galleryImages.length > 0 ? (
                  galleryImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(imageUrl)}
                      className={`h-20 rounded-lg cursor-pointer overflow-hidden border ${activeImage === imageUrl ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
                        }`}
                    >
                      {imageErrors[imageUrl] ? (
                        <div className="h-full w-full bg-gray-200" />
                      ) : (
                        <img
                          src={imageUrl}
                          alt={`${product.name}-${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={() => {
                            setImageErrors((prev) => ({ ...prev, [imageUrl]: true }));
                          }}
                        />
                      )}
                    </button>
                  ))
                ) : (
                  [1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 bg-gray-200 rounded-lg" />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-sm font-medium text-blue-600">{product.category}</span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h2>
                  <div className="flex items-center mt-2">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          className={`w-4 h-4 ${index < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {product.rating} {t('pages.products.details.rating')} ({product.reviews} {t('pages.products.details.reviews')})
                    </span>
                  </div>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {t(`pages.products.status.${product.status}`)}
                </span>
              </div>

              <div className="text-3xl font-bold text-gray-900 mb-4">${Number(product.price).toFixed(2)}</div>
              <p className="text-gray-600 mb-6">{product.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{t('pages.products.details.sku')}</p>
                  <p className="font-semibold text-gray-900">{product.sku}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{t('pages.products.details.stock')}</p>
                  <p className={`font-semibold ${product.stock < 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {product.stock} {t('pages.products.details.units')}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('pages.products.details.features')}</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={`${feature}-${index}`} className="flex items-center text-gray-600">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-gray-200 pt-6 flex justify-end">
                <button onClick={() => router.push(`/products/details/${id as string}/edit`)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Edit className="w-4 h-4" />
                  Modifier le stock
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Variantes</h3>
              <VariantsSection productId={id as string} readOnly={true} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.products.details.relatedProducts')}</h3>
              <div className="grid grid-cols-3 gap-4">
                {(product.relatedProducts || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/products/details/${item.id}`)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="h-24 bg-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {item.image && !relatedImageErrors[item.id] ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={() => {
                            setRelatedImageErrors((previous) => ({ ...previous, [item.id]: true }));
                          }}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">Image</span>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                    <p className="text-blue-600 font-semibold">${Number(item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lightbox / Zoom Modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-[60] p-2 bg-black/50 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setZoomOpen(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="relative flex items-center justify-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {activeImage && !imageErrors[activeImage] ? (
              <img
                src={activeImage}
                alt={product.name}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            ) : null}

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 p-3 rounded-full transition-colors z-[60]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = galleryImages.indexOf(activeImage);
                    const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
                    setSelectedImage(galleryImages[prevIndex] || '');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 p-3 rounded-full transition-colors z-[60]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = galleryImages.indexOf(activeImage);
                    const nextIndex = (currentIndex + 1) % galleryImages.length;
                    setSelectedImage(galleryImages[nextIndex] || '');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium">
                  {galleryImages.indexOf(activeImage) + 1} / {galleryImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
