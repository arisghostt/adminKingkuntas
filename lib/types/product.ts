export interface Category {
    id: string;
    name: string;
    description?: string;
    productCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    description: string;
    price: number;
    cost_price: number;
    discount: number;
    stock: number;
    min_stock: number;
    weight: number;
    status: 'active' | 'inactive' | 'draft';
    category: string | null;
    category_id: string | null;
    brand: string;
    tags: string;
    image: string | null;
    gallery_images: string[];
    variants: ProductVariant[];
    rating: number;
    reviews: number;
    features: string[];
    relatedProducts: { id: string; name: string; price: number; image: string }[];
}

export interface ProductFormData {
    name: string;
    sku: string;
    description: string;
    price: number;
    stock: number;
    min_stock: number;
    status: 'active' | 'inactive' | 'draft';
    category_id: string;
    features: string[];
    image?: string;
}
