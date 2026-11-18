import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "../data/demoData";
import type { ProductInput } from "../hooks/useShopStore";
import type { Product, Supplier } from "../types/shop";
import { formatCurrency, formatPercent } from "../utils/format";
import { Modal } from "./Modal";

interface InventoryViewProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: (input: ProductInput) => { ok: boolean; error?: string };
  onUpdateProduct: (id: string, input: ProductInput) => { ok: boolean; error?: string };
  onDeleteProduct: (id: string) => void;
  onRestockProduct: (id: string, qty: number) => { ok: boolean; error?: string };
}

interface ProductFormState {
  name: string;
  sku: string;
  category: string;
  quantity: string;
  purchasePrice: string;
  sellingPrice: string;
  supplierId: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  sku: "",
  category: "",
  quantity: "0",
  purchasePrice: "",
  sellingPrice: "",
  supplierId: "",
};

export function InventoryView({
  products,
  suppliers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRestockProduct,
}: InventoryViewProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "healthy" | "low" | "out">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const [restockError, setRestockError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort();
  }, [products]);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      const matchesCat = categoryFilter === "all" || p.category === categoryFilter;

      const matchesStock =
        stockFilter === "all"
          ? true
          : stockFilter === "out"
            ? p.quantity === 0
            : stockFilter === "low"
              ? p.quantity <= LOW_STOCK_THRESHOLD
              : p.quantity > LOW_STOCK_THRESHOLD;

      return matchesQuery && matchesCat && matchesStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: String(product.quantity),
      purchasePrice: String(product.purchasePrice),
      sellingPrice: String(product.sellingPrice),
      supplierId: product.supplierId ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitProduct = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedQty = Number(form.quantity);
    const parsedPurchase = Number(form.purchasePrice);
    const parsedSelling = Number(form.sellingPrice);

    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError("Product name must be at least 2 characters.");
      return;
    }
    if (!form.sku.trim() || form.sku.trim().length < 2) {
      setFormError("SKU code is required.");
      return;
    }
    if (!form.category.trim()) {
      setFormError("Category is required.");
      return;
    }
    if (form.quantity.trim() === "" || !Number.isInteger(parsedQty) || parsedQty < 0) {
      setFormError("Quantity must be a non-negative whole number (0 or greater).");
      return;
    }
    if (!Number.isFinite(parsedPurchase) || parsedPurchase <= 0) {
      setFormError("Purchase price must be a valid number greater than $0.00.");
      return;
    }
    if (!Number.isFinite(parsedSelling) || parsedSelling <= 0) {
      setFormError("Selling price must be a valid number greater than $0.00.");
      return;
    }

    const payload: ProductInput = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      quantity: parsedQty,
      purchasePrice: parsedPurchase,
      sellingPrice: parsedSelling,
      supplierId: form.supplierId || undefined,
    };

    const result = editingProduct
      ? onUpdateProduct(editingProduct.id, payload)
      : onAddProduct(payload);

    if (!result.ok) {
      setFormError(result.error ?? "Unable to save product.");
      return;
    }
    setModalOpen(false);
  };

  const handleSubmitRestock = (e: FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    setRestockError(null);
    const qty = Number(restockQty);
    if (!Number.isInteger(qty) || qty < 1) {
      setRestockError("Enter a whole number of at least 1 unit to add.");
      return;
    }
    const res = onRestockProduct(restockTarget.id, qty);
    if (!res.ok) {
      setRestockError(res.error ?? "Failed to update stock.");
      return;
    }
    setRestockTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU, or category..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "healthy", label: "Healthy" },
                { id: "low", label: "Low (≤5)" },
                { id: "out", label: "Out (0)" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStockFilter(tab.id)}
                className={`h-8 rounded-md px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  stockFilter === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-slate-900">
              No matching products found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Adjust your search or filters, or add a new product to your inventory.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Category · Supplier</th>
                  <th className="px-4 py-3.5 text-right">Stock</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Purchase Price</th>
                  <th className="px-4 py-3.5 text-right">Selling Price</th>
                  <th className="px-4 py-3.5 text-right">Margin</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isOut = product.quantity === 0;
                  const isLow = product.quantity <= LOW_STOCK_THRESHOLD;
                  const marginPct =
                    product.sellingPrice > 0
                      ? ((product.sellingPrice - product.purchasePrice) /
                          product.sellingPrice) *
                        100
                      : 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="font-mono text-xs text-slate-500">{product.sku}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <span>{product.category}</span>
                        {product.supplierId && supplierMap.get(product.supplierId) && (
                          <span className="text-slate-400">
                            {" "}
                            · {supplierMap.get(product.supplierId)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {product.quantity}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            In stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                        {formatCurrency(product.purchasePrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {formatCurrency(product.sellingPrice)}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-mono tabular-nums ${
                          marginPct < 0 ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {formatPercent(marginPct)}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockTarget(product);
                              setRestockQty("10");
                              setRestockError(null);
                            }}
                            title="Restock units"
                            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Restock
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            aria-label={`Edit ${product.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            aria-label={`Delete ${product.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? "Edit Product" : "Add New Product"}
        subtitle="Enter accurate inventory quantities and unit pricing."
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Logitech MX Master 3S Mouse"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                SKU Code *
              </label>
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g., PER-MX3S"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm uppercase text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Category *
              </label>
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g., Peripherals"
                list="smartbiz-categories"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <datalist id="smartbiz-categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Quantity *
              </label>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Purchase Price ($) *
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Selling Price ($) *
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                placeholder="0.00"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Primary Supplier
            </label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {Number(form.purchasePrice) > 0 && Number(form.sellingPrice) > 0 && (
            <div className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 tabular-nums">
              Unit Profit:{" "}
              <span className="font-mono font-semibold text-slate-900">
                {formatCurrency(Number(form.sellingPrice) - Number(form.purchasePrice))}
              </span>{" "}
              (
              {formatPercent(
                ((Number(form.sellingPrice) - Number(form.purchasePrice)) /
                  Number(form.sellingPrice)) *
                  100
              )}{" "}
              margin)
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
            >
              {editingProduct ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal
        open={Boolean(restockTarget)}
        onClose={() => setRestockTarget(null)}
        title="Restock Product"
        subtitle={restockTarget ? `${restockTarget.name} (${restockTarget.sku})` : ""}
        maxWidthClass="max-w-md"
      >
        {restockTarget && (
          <form onSubmit={handleSubmitRestock} className="space-y-4" noValidate>
            {restockError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {restockError}
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm tabular-nums">
              <span className="text-slate-600">Current Stock</span>
              <span className="font-mono font-semibold text-slate-900">
                {restockTarget.quantity} units
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Units to Add *
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                {[5, 10, 20, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRestockQty(String(preset))}
                    className="h-8 rounded-md border border-slate-200 px-2.5 font-mono text-xs text-slate-700 hover:bg-slate-50"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
            {Number.isInteger(Number(restockQty)) && Number(restockQty) >= 1 && (
              <p className="text-xs text-slate-500 tabular-nums">
                New stock level will be{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {restockTarget.quantity + Number(restockQty)} units
                </span>{" "}
                · Estimated restock cost{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(restockTarget.purchasePrice * Number(restockQty))}
                </span>
              </p>
            )}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
              >
                Confirm Restock
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Product"
        maxWidthClass="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Remove <span className="font-semibold text-slate-900">{deleteTarget.name}</span>{" "}
              (<span className="font-mono">{deleteTarget.sku}</span>) from active inventory?
              Past sales records will remain intact for financial reporting.
            </p>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete Product
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
