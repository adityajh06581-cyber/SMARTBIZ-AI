export type ModuleId =
  | "dashboard"
  | "inventory"
  | "sales"
  | "customers"
  | "suppliers"
  | "reports"
  | "profit-loss"
  | "low-stock"
  | "ai-assistant";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierId?: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  customerId?: string;
  customerName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  productsSupplied: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface ShopDataState {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
}
