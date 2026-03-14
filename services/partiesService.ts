import { apiClient } from './apiClient';

export interface Customer {
    id: string;
    customer_code: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
}

const normalizeCustomer = (data: any): Customer => ({
    id: String(data.id ?? ''),
    customer_code: data.customer_code ?? '',
    first_name: data.first_name ?? '',
    last_name: data.last_name ?? '',
    email: data.email ?? '',
    status: data.status ?? 'ACTIVE',
});

export const getCustomers = async (): Promise<Customer[]> => {
    const response = await apiClient.get<any>('/api/parties/customers/');
    const results = Array.isArray(response.data) ? response.data : (response.data.results || []);
    return results.map(normalizeCustomer);
};

export const createCustomer = async (data: Record<string, any>): Promise<Customer> => {
    const response = await apiClient.post<any>('/api/parties/customers/', data);
    return normalizeCustomer(response.data);
};

export const getCustomerById = async (id: string): Promise<Customer> => {
    const response = await apiClient.get<any>(`/api/parties/customers/${id}/`);
    return normalizeCustomer(response.data);
};
