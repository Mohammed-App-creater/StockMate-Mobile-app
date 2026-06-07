import axios from 'axios';
import { useAuthStore } from './auth';

// Base URL comes from EXPO_PUBLIC_API_URL (set in .env) so real devices can
// reach your dev machine over the LAN. Falls back to localhost for web/simulator.
// NOTE: on a physical device "localhost" points at the phone, not your machine —
// set EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:8000 in .env.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
export const API_BASE_URL = BASE_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach the JWT from the auth store to every request.
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, the token is invalid/expired — log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Types (mirrors the FastAPI schemas; prices come back as strings/Decimals)
// ---------------------------------------------------------------------------
export type ProductUnit = 'kg' | 'piece' | 'box' | 'liter';
export const PRODUCT_UNITS: ProductUnit[] = ['kg', 'piece', 'box', 'liter'];

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: ProductUnit;
  buying_price: string;
  selling_price: string;
  barcode: string | null;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  category: string;
  unit: ProductUnit;
  buying_price: number | string;
  selling_price: number | string;
  barcode?: string | null;
  current_stock?: number;
}

export type TransactionType = 'purchase' | 'sale';

// Matches the API ReceiptSplit (response carries an id; create omits it).
export interface ReceiptSplit {
  id?: string;
  quantity: number;
  has_receipt: boolean;
}

// Matches TransactionResponse: transaction_type, receipt_splits, and a nested
// full `product` object (read product.name, not a flat product_name).
export interface Transaction {
  id: string;
  product_id: string;
  product?: Product;
  transaction_type: TransactionType;
  total_quantity: number;
  unit_price: number | string;
  discount_amount: number | string;
  notes?: string | null;
  receipt_splits?: ReceiptSplit[];
  created_at: string;
}

export interface TransactionInput {
  product_id: string;
  transaction_type: TransactionType;
  total_quantity: number;
  unit_price: number;
  discount_amount: number;
  notes?: string;
  receipt_splits: { quantity: number; has_receipt: boolean }[];
}

// ---------------------------------------------------------------------------
// Analytics (/analytics/summary/{period}) — see PeriodSummary contract
// ---------------------------------------------------------------------------
export type SummaryPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ProductSummary {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_purchased: number;
  revenue: number | string;
  cost: number | string;
  profit: number | string;
  profit_margin_percent: number;
}

export interface ReceiptComplianceReport {
  total_transactions: number;
  purchased_with_receipt: number;
  purchased_without_receipt: number;
  sold_with_receipt: number;
  sold_without_receipt: number;
  compliance_rate_percent: number;
  risky_items: string[];
}

export interface PeriodSummary {
  total_revenue: number | string;
  total_cost: number | string;
  net_profit: number | string;
  total_discount: number | string;
  total_transactions: number;
  total_sales: number;
  total_purchases: number;
  top_products: ProductSummary[];
  low_stock_products: Product[];
  receipt_compliance: ReceiptComplianceReport;
}

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------
export const productsApi = {
  list: () => api.get<Product[]>('/products/'),
  search: (q: string) => api.get<Product[]>(`/products/search?q=${encodeURIComponent(q)}`),
  getById: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: ProductInput) => api.post<Product>('/products/', data),
  update: (id: string, data: Partial<ProductInput>) => api.put<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get<Product>(`/products/barcode/${encodeURIComponent(barcode)}`),
};

// NOTE: the running backend does not expose /transactions or /analytics yet
// (both 404). These helpers match the documented contract and will work once
// those routes ship; the screens degrade gracefully until then.
export const transactionsApi = {
  list: (opts?: { type?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.type) qs.set('type', opts.type);
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const s = qs.toString();
    return api.get<Transaction[]>(`/transactions/${s ? `?${s}` : ''}`);
  },
  create: (data: TransactionInput) => api.post<Transaction>('/transactions/', data),
  byProduct: (id: string) => api.get<Transaction[]>(`/transactions/product/${id}`),
};

export const analyticsApi = {
  summary: (period: SummaryPeriod) => api.get<PeriodSummary>(`/analytics/summary/${period}`),
};

export default api;
