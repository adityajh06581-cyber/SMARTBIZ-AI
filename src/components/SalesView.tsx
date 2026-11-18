import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Plus, Search, Trash2 } from "lucide-react";
import type { SaleInput } from "../hooks/useShopStore";
import type { Customer, Product, Sale } from "../types/shop";
import {
  formatCurrency,
  formatDisplayDate,
  getLocalDateString,
  roundMoney,
} from "../utils/format";
import { Modal } from "./Modal";

interface SalesViewProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  onRecordSale: (input: SaleInput) => { ok: boolean; error?: string; sale?: Sale };
  onDeleteSale: (saleId: string, restoreStock: boolean) => void;
}

export function SalesView({
  products,
  customers,
  sales,
  onRecordSale,
  onDeleteSale,
}: SalesViewProps) {
  const availableProducts = useMemo(
    () => products.filter((p) => p.quantity > 0),
    [products]
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    () => availableProducts[0]?.id ?? ""
  );
  const [customerId, setCustomerId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [saleDate, setSaleDate] = useState<string>(() => getLocalDateString());
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [restoreStockOnVoid, setRestoreStockOnVoid] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? availableProducts[0],
    [products, availableProducts, selectedProductId]
  );

  const parsedQty = Number(quantity);
  const isQtyValid = Number.isInteger(parsedQty) && parsedQty >= 1;

  const calculatedTotal = useMemo(() => {
    if (!selectedProduct || !isQtyValid) return 0;
    return roundMoney(selectedProduct.sellingPrice * parsedQty);
  }, [selectedProduct, isQtyValid, parsedQty]);

  const calculatedProfit = useMemo(() => {
    if (!selectedProduct || !isQtyValid) return 0;
    return roundMoney(
      (selectedProduct.sellingPrice - selectedProduct.purchasePrice) * parsedQty
    );
  }, [selectedProduct, isQtyValid, parsedQty]);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...sales]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .filter((s) => {
        const matchesQuery =
          !q ||
          s.productName.toLowerCase().includes(q) ||
          s.productSku.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q);
        const matchesDate = !dateFilter || s.date === dateFilter;
        return matchesQuery && matchesDate;
      });
  }, [sales, search, dateFilter]);

  const handleRecordSale = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessBanner(null);

    if (!selectedProduct) {
      setFormError("Please select an in-stock product to record a sale.");
      return;
    }
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      setFormError("Quantity must be a whole number of at least 1.");
      return;
    }
    if (parsedQty > selectedProduct.quantity) {
      setFormError(
        `Cannot sell ${parsedQty} units. Only ${selectedProduct.quantity} unit(s) available in stock.`
      );
      return;
    }
    if (!saleDate) {
      setFormError("Please select a valid sale date.");
      return;
    }

    const res = onRecordSale({
      productId: selectedProduct.id,
      customerId: customerId || undefined,
      quantity: parsedQty,
      date: saleDate,
    });

    if (!res.ok) {
      setFormError(res.error ?? "Failed to record sale.");
      return;
    }

    setQuantity("1");
    setSuccessBanner(
      `Recorded sale of ${parsedQty} × ${selectedProduct.name} (${formatCurrency(calculatedTotal)}). Inventory updated.`
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Record New Sale Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-4 xl:self-start">
        <h2 className="text-base font-semibold text-slate-900">Record New Sale</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Totals calculate automatically and deduct live stock.
        </p>

        <form onSubmit={handleRecordSale} className="mt-5 space-y-4" noValidate>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          {successBanner && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successBanner}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Product *
            </label>
            <select
              value={selectedProduct?.id ?? ""}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setFormError(null);
                setSuccessBanner(null);
              }}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {products.length === 0 && (
                <option value="">No products in inventory</option>
              )}
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                  {p.name} ({p.quantity} in stock · {formatCurrency(p.sellingPrice)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                max={selectedProduct ? Math.max(selectedProduct.quantity, 1) : 1}
                step={1}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setFormError(null);
                }}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
              {selectedProduct && (
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  Max available: {selectedProduct.quantity}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Sale Date *
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Automatic Calculation Box */}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Unit Selling Price</span>
              <span className="font-mono tabular-nums">
                {selectedProduct ? formatCurrency(selectedProduct.sellingPrice) : "$0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Estimated Profit</span>
              <span className="font-mono text-emerald-700 tabular-nums">
                +{formatCurrency(calculatedProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <span>Total Amount</span>
              <span className="font-mono text-lg tabular-nums">
                {formatCurrency(calculatedTotal)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedProduct || selectedProduct.quantity === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-4 w-4" />
            Complete Sale
          </button>
        </form>
      </section>

      {/* Sales Ledger */}
      <section className="rounded-xl border border-slate-200 bg-white xl:col-span-8">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Sales Ledger</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {filteredSales.length} transaction(s) shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1 sm:w-56">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product or customer..."
                className="h-10 w-full rounded-lg border border-slate-200 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter sales by date"
              className="h-10 rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-slate-900">
              No sales match your current filter
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Record a new sale using the form on the left or clear your date filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5 text-right">Qty</th>
                  <th className="px-4 py-3.5 text-right">Unit Price</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                  <th className="px-4 py-3.5 text-right">Profit</th>
                  <th className="px-5 py-3.5 text-right">Void</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDisplayDate(sale.date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{sale.productName}</p>
                      <p className="font-mono text-xs text-slate-500">{sale.productSku}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {sale.customerName}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-800 tabular-nums">
                      {sale.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                      {formatCurrency(sale.unitPrice)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-700 tabular-nums">
                      +{formatCurrency(sale.profit)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setVoidTarget(sale);
                          setRestoreStockOnVoid(true);
                        }}
                        aria-label={`Void sale ${sale.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Void Sale Confirmation */}
      <Modal
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        title="Void Sale Transaction"
        maxWidthClass="max-w-md"
      >
        {voidTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Remove sale of{" "}
              <span className="font-semibold text-slate-900">
                {voidTarget.quantity} × {voidTarget.productName}
              </span>{" "}
              ({formatCurrency(voidTarget.totalAmount)}) on{" "}
              {formatDisplayDate(voidTarget.date)}?
            </p>
            <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={restoreStockOnVoid}
                onChange={(e) => setRestoreStockOnVoid(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700"
              />
              Restore {voidTarget.quantity} unit(s) back to product inventory
            </label>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSale(voidTarget.id, restoreStockOnVoid);
                  setVoidTarget(null);
                }}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
              >
                Void Sale
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
