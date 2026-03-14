export interface Category {
    id: string;
    name: string;
    description: string;
    productCount: number;
    product_count?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CategoryFormData {
    name: string;
    description: string;
}
