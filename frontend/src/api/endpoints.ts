import api from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number | string; // Allow both number and string
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    saleItems: number;
  };
}

export interface SaleItem {
  productId: string;
  quantity: number;
  price?: number;
  product?: Product;
}

export interface Sale {
  id: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const authAPI = {
  login: (credentials: LoginCredentials) =>
    api.post('/auth/login', credentials),
  register: (credentials: RegisterCredentials) =>
    api.post('/auth/register', credentials),
};

export const salesAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    // Ensure limit and page are numbers
    const processedParams = {
      ...params,
      page: params?.page ? Number(params.page) : undefined,
      limit: params?.limit ? Number(params.limit) : undefined,
    };
    return api.get<PaginatedResponse<Sale>>('/sales', { params: processedParams });
  },
  getOne: (id: string) => api.get<Sale>(`/sales/${id}`),
  create: (data: { items: SaleItem[] }) => api.post<Sale>('/sales', data),
  getDashboardStats: () => api.get('/sales/dashboard/stats'),
  getTodayRevenue: () => api.get('/sales/today/revenue'),
};

export const productsAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    // Ensure limit and page are numbers
    const processedParams = {
      ...params,
      page: params?.page ? Number(params.page) : undefined,
      limit: params?.limit ? Number(params.limit) : undefined,
    };
    return api.get<PaginatedResponse<Product>>('/products', { params: processedParams });
  },
  getOne: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Product>('/products', data),
  update: (id: string, data: Partial<Product>) =>
    api.patch<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getBySku: (sku: string) => api.get<Product>(`/products/sku/${sku}`),
};