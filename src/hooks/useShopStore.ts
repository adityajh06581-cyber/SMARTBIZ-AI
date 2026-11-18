import { useCallback, useEffect, useMemo, useState } from "react";
import { createDemoData, LOW_STOCK_THRESHOLD } from "../data/demoData";
import type { Customer, Product, Sale, ShopDataState, Supplier } from "../types/shop";
import { generateId, roundMoney } from "../utils/format";

const STORAGE_KEY = "smartbiz_shop_state_v1";

function loadInitialState(): ShopDataState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ShopDataState>;
      if (
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.sales) &&
        Array.isArray(parsed.customers) &&
        Array.isArray(parsed.suppliers)
      ) {
        return {
          products: parsed.products,
          sales: parsed.sales,
          customers: parsed.customers,
          suppliers: parsed.suppliers,
        };
      }
    }
  } catch {
    // Corrupted localStorage falls back cleanly to demo data
  }
  const demo = createDemoData();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
  } catch {
    // Ignore storage quota errors
  }
  return demo;
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierId?: string;
}

export interface SaleInput {
  productId: string;
  customerId?: string;
  quantity: number;
  date: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface SupplierInput {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  productsSupplied: string[];
}

export function useShopStore() {
  const [state, setState] = useState<ShopDataState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  // Inventory actions
  const addProduct = useCallback((input: ProductInput): { ok: boolean; error?: string } => {
    const cleanName = input.name.trim();
    const cleanSku = input.sku.trim().toUpperCase();
    const cleanCategory = input.category.trim();

    if (cleanName.length < 2) return { ok: false, error: "Product name must be at least 2 characters." };
    if (cleanSku.length < 2) return { ok: false, error: "SKU is required." };
    if (!cleanCategory) return { ok: false, error: "Category is required." };
    if (!Number.isInteger(input.quantity) || input.quantity < 0) {
      return { ok: false, error: "Quantity must be a whole number of 0 or greater." };
    }
    if (!Number.isFinite(input.purchasePrice) || input.purchasePrice <= 0) {
      return { ok: false, error: "Purchase price must be greater than $0.00." };
    }
    if (!Number.isFinite(input.sellingPrice) || input.sellingPrice <= 0) {
      return { ok: false, error: "Selling price must be greater than $0.00." };
    }

    const newProduct: Product = {
      id: generateId("prod"),
      name: cleanName,
      sku: cleanSku,
      category: cleanCategory,
      quantity: input.quantity,
      purchasePrice: roundMoney(input.purchasePrice),
      sellingPrice: roundMoney(input.sellingPrice),
      supplierId: input.supplierId || undefined,
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      products: [newProduct, ...prev.products],
    }));
    return { ok: true };
  }, []);

  const updateProduct = useCallback(
    (id: string, input: ProductInput): { ok: boolean; error?: string } => {
      const cleanName = input.name.trim();
      const cleanSku = input.sku.trim().toUpperCase();
      const cleanCategory = input.category.trim();

      if (cleanName.length < 2) return { ok: false, error: "Product name must be at least 2 characters." };
      if (cleanSku.length < 2) return { ok: false, error: "SKU is required." };
      if (!cleanCategory) return { ok: false, error: "Category is required." };
      if (!Number.isInteger(input.quantity) || input.quantity < 0) {
        return { ok: false, error: "Quantity must be a whole number of 0 or greater." };
      }
      if (!Number.isFinite(input.purchasePrice) || input.purchasePrice <= 0) {
        return { ok: false, error: "Purchase price must be greater than $0.00." };
      }
      if (!Number.isFinite(input.sellingPrice) || input.sellingPrice <= 0) {
        return { ok: false, error: "Selling price must be greater than $0.00." };
      }

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === id
            ? {
                ...p,
                name: cleanName,
                sku: cleanSku,
                category: cleanCategory,
                quantity: input.quantity,
                purchasePrice: roundMoney(input.purchasePrice),
                sellingPrice: roundMoney(input.sellingPrice),
                supplierId: input.supplierId || undefined,
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      return { ok: true };
    },
    []
  );

  const deleteProduct = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  }, []);

  const restockProduct = useCallback(
    (id: string, addedQuantity: number): { ok: boolean; error?: string } => {
      if (!Number.isInteger(addedQuantity) || addedQuantity < 1) {
        return { ok: false, error: "Restock quantity must be a whole number of at least 1." };
      }
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === id
            ? {
                ...p,
                quantity: p.quantity + addedQuantity,
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      return { ok: true };
    },
    []
  );

  // Sales actions
  const recordSale = useCallback(
    (input: SaleInput): { ok: boolean; error?: string; sale?: Sale } => {
      const product = state.products.find((p) => p.id === input.productId);
      if (!product) {
        return { ok: false, error: "Please select a valid product." };
      }
      if (!Number.isInteger(input.quantity) || input.quantity < 1) {
        return { ok: false, error: "Sale quantity must be at least 1." };
      }
      if (input.quantity > product.quantity) {
        return {
          ok: false,
          error: `Insufficient stock. Only ${product.quantity} unit(s) of ${product.name} available.`,
        };
      }
      if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        return { ok: false, error: "Please select a valid sale date." };
      }

      const customer = input.customerId
        ? state.customers.find((c) => c.id === input.customerId)
        : undefined;

      const totalAmount = roundMoney(product.sellingPrice * input.quantity);
      const totalCost = roundMoney(product.purchasePrice * input.quantity);
      const profit = roundMoney(totalAmount - totalCost);

      const newSale: Sale = {
        id: generateId("sale"),
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        customerId: customer?.id,
        customerName: customer ? customer.name : "Walk-in Customer",
        quantity: input.quantity,
        unitPrice: product.sellingPrice,
        unitCost: product.purchasePrice,
        totalAmount,
        totalCost,
        profit,
        date: input.date,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === product.id
            ? {
                ...p,
                quantity: Math.max(0, p.quantity - input.quantity),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
        sales: [newSale, ...prev.sales],
      }));

      return { ok: true, sale: newSale };
    },
    [state.products, state.customers]
  );

  const deleteSale = useCallback((saleId: string, restoreStock = true) => {
    setState((prev) => {
      const target = prev.sales.find((s) => s.id === saleId);
      if (!target) return prev;
      return {
        ...prev,
        sales: prev.sales.filter((s) => s.id !== saleId),
        products: restoreStock
          ? prev.products.map((p) =>
              p.id === target.productId
                ? {
                    ...p,
                    quantity: p.quantity + target.quantity,
                    updatedAt: new Date().toISOString(),
                  }
                : p
            )
          : prev.products,
      };
    });
  }, []);

  // Customer actions
  const addCustomer = useCallback((input: CustomerInput): { ok: boolean; error?: string } => {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const email = input.email?.trim() || "";
    const notes = input.notes?.trim() || "";

    if (name.length < 2) return { ok: false, error: "Customer name must be at least 2 characters." };
    if (phone.replace(/\D/g, "").length < 7) {
      return { ok: false, error: "Enter a valid phone number (at least 7 digits)." };
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }

    const customer: Customer = {
      id: generateId("cust"),
      name,
      phone,
      email: email || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      customers: [customer, ...prev.customers],
    }));
    return { ok: true };
  }, []);

  const updateCustomer = useCallback(
    (id: string, input: CustomerInput): { ok: boolean; error?: string } => {
      const name = input.name.trim();
      const phone = input.phone.trim();
      const email = input.email?.trim() || "";
      const notes = input.notes?.trim() || "";

      if (name.length < 2) return { ok: false, error: "Customer name must be at least 2 characters." };
      if (phone.replace(/\D/g, "").length < 7) {
        return { ok: false, error: "Enter a valid phone number (at least 7 digits)." };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "Enter a valid email address." };
      }

      setState((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id
            ? {
                ...c,
                name,
                phone,
                email: email || undefined,
                notes: notes || undefined,
              }
            : c
        ),
        sales: prev.sales.map((s) =>
          s.customerId === id ? { ...s, customerName: name } : s
        ),
      }));
      return { ok: true };
    },
    []
  );

  const deleteCustomer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  }, []);

  // Supplier actions
  const addSupplier = useCallback((input: SupplierInput): { ok: boolean; error?: string } => {
    const name = input.name.trim();
    const contactPerson = input.contactPerson.trim();
    const phone = input.phone.trim();
    const email = input.email?.trim() || "";
    const address = input.address?.trim() || "";
    const productsSupplied = input.productsSupplied
      .map((item) => item.trim())
      .filter(Boolean);

    if (name.length < 2) return { ok: false, error: "Supplier name must be at least 2 characters." };
    if (contactPerson.length < 2) return { ok: false, error: "Contact person name is required." };
    if (phone.replace(/\D/g, "").length < 7) {
      return { ok: false, error: "Enter a valid phone number (at least 7 digits)." };
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    if (productsSupplied.length === 0) {
      return { ok: false, error: "List at least one product supplied." };
    }

    const supplier: Supplier = {
      id: generateId("sup"),
      name,
      contactPerson,
      phone,
      email: email || undefined,
      address: address || undefined,
      productsSupplied,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      suppliers: [supplier, ...prev.suppliers],
    }));
    return { ok: true };
  }, []);

  const updateSupplier = useCallback(
    (id: string, input: SupplierInput): { ok: boolean; error?: string } => {
      const name = input.name.trim();
      const contactPerson = input.contactPerson.trim();
      const phone = input.phone.trim();
      const email = input.email?.trim() || "";
      const address = input.address?.trim() || "";
      const productsSupplied = input.productsSupplied
        .map((item) => item.trim())
        .filter(Boolean);

      if (name.length < 2) return { ok: false, error: "Supplier name must be at least 2 characters." };
      if (contactPerson.length < 2) return { ok: false, error: "Contact person name is required." };
      if (phone.replace(/\D/g, "").length < 7) {
        return { ok: false, error: "Enter a valid phone number (at least 7 digits)." };
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: "Enter a valid email address." };
      }
      if (productsSupplied.length === 0) {
        return { ok: false, error: "List at least one product supplied." };
      }

      setState((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((sup) =>
          sup.id === id
            ? {
                ...sup,
                name,
                contactPerson,
                phone,
                email: email || undefined,
                address: address || undefined,
                productsSupplied,
              }
            : sup
        ),
      }));
      return { ok: true };
    },
    []
  );

  const deleteSupplier = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
      products: prev.products.map((p) =>
        p.supplierId === id ? { ...p, supplierId: undefined } : p
      ),
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createDemoData();
    setState(fresh);
  }, []);

  // Derived metrics
  const metrics = useMemo(() => {
    const totalRevenue = roundMoney(
      state.sales.reduce((sum, s) => sum + s.totalAmount, 0)
    );
    const totalPurchaseCost = roundMoney(
      state.sales.reduce((sum, s) => sum + s.totalCost, 0)
    );
    const totalProfit = roundMoney(totalRevenue - totalPurchaseCost);
    const profitMarginPct =
      totalRevenue > 0 ? roundMoney((totalProfit / totalRevenue) * 100) : 0;
    const totalSalesCount = state.sales.length;
    const totalUnitsSold = state.sales.reduce((sum, s) => sum + s.quantity, 0);

    const lowStockProducts = state.products
      .filter((p) => p.quantity <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.quantity - b.quantity);
    const outOfStockProducts = state.products.filter((p) => p.quantity === 0);

    const totalInventoryUnits = state.products.reduce(
      (sum, p) => sum + p.quantity,
      0
    );
    const inventoryCostValue = roundMoney(
      state.products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0)
    );
    const inventoryRetailValue = roundMoney(
      state.products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0)
    );

    return {
      totalRevenue,
      totalPurchaseCost,
      totalProfit,
      profitMarginPct,
      totalSalesCount,
      totalUnitsSold,
      totalProducts: state.products.length,
      totalInventoryUnits,
      inventoryCostValue,
      inventoryRetailValue,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      totalCustomers: state.customers.length,
      totalSuppliers: state.suppliers.length,
    };
  }, [state]);

  return {
    products: state.products,
    sales: state.sales,
    customers: state.customers,
    suppliers: state.suppliers,
    metrics,
    addProduct,
    updateProduct,
    deleteProduct,
    restockProduct,
    recordSale,
    deleteSale,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    resetDemoData,
  };
}
