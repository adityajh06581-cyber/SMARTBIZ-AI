import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, PackagePlus, Phone } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "../data/demoData";
import type { Product, Supplier } from "../types/shop";
import { formatCurrency } from "../utils/format";
import { Modal } from "./Modal";

interface LowStockViewProps {
  products: Product[];
  suppliers: Supplier[];
  onRestockProduct: (id: string, qty: number) => { ok: boolean; error?: string };
}

export function LowStockView({
  products,
  suppliers,
  onRestockProduct,
}: LowStockViewProps) {
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState("15");
  const [restockError, setRestockError] = useState<string | null>(null);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers]
  );

  const lowStockItems = useMemo(
    () =>
      products
        .filter((p) => p.quantity <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.quantity - b.quantity),
    [products]
  );

  const outOfStockCount = useMemo(
    () => lowStockItems.filter((p) => p.quantity === 0).length,
    [lowStockItems]
  );

  const estimatedRestockBudget = useMemo(
    () =>
      lowStockItems.reduce((sum, p) => {
        const target = Math.max(15 - p.quantity, 10);
        return sum + target * p.purchasePrice;
      }, 0),
    [lowStockItems]
  );

  const handleConfirmRestock = (e: FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    setRestockError(null);
    const qty = Number(restockQty);
    if (!Number.isInteger(qty) || qty < 1) {
      setRestockError("Please enter a whole number of at least 1 unit.");
      return;
    }
    const res = onRestockProduct(restockTarget.id, qty);
    if (!res.ok) {
      setRestockError(res.error ?? "Unable to restock product.");
      return;
    }
    setRestockTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Items at or Below {LOW_STOCK_THRESHOLD} Units
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {lowStockItems.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Out of Stock (0 Units)</p>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              outOfStockCount > 0 ? "text-red-600" : "text-slate-900"
            }`}
          >
            {outOfStockCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Est. Restock Budget (to 15 units)
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(estimatedRestockBudget)}
          </p>
        </div>
      </div>

      {/* Low Stock Action Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Reorder Queue (Stock ≤ {LOW_STOCK_THRESHOLD} Units)
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Products automatically appear here whenever available inventory drops to 5 units or fewer.
          </p>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              Zero Low Stock Alerts
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Every product in your catalog currently has more than {LOW_STOCK_THRESHOLD} units in stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Severity</th>
                  <th className="px-4 py-3.5 text-right">Current Stock</th>
                  <th className="px-4 py-3.5 text-right">Unit Cost</th>
                  <th className="px-4 py-3.5">Supplier Contact</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => {
                  const isOut = item.quantity === 0;
                  const supplier = item.supplierId
                    ? supplierMap.get(item.supplierId)
                    : undefined;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono">{item.sku}</span> · {item.category}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            Out of Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-4 w-4" />
                            Critical Low
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-mono text-base font-semibold tabular-nums ${
                          isOut ? "text-red-600" : "text-amber-700"
                        }`}
                      >
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-700 tabular-nums">
                        {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="px-4 py-4">
                        {supplier ? (
                          <div>
                            <p className="font-medium text-slate-800">{supplier.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No supplier assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setRestockTarget(item);
                            setRestockQty("15");
                            setRestockError(null);
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-medium text-white transition-colors hover:bg-blue-800"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          Restock Now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={Boolean(restockTarget)}
        onClose={() => setRestockTarget(null)}
        title="Restock Low Inventory"
        subtitle={restockTarget ? `${restockTarget.name} (${restockTarget.sku})` : ""}
        maxWidthClass="max-w-md"
      >
        {restockTarget && (
          <form onSubmit={handleConfirmRestock} className="space-y-4" noValidate>
            {restockError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {restockError}
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm tabular-nums">
              <span className="text-slate-600">Current Quantity</span>
              <span className="font-mono font-semibold text-red-600">
                {restockTarget.quantity} unit(s)
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Units Received / Adding *
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
                {[10, 15, 25, 50].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setRestockQty(String(qty))}
                    className="h-8 rounded-md border border-slate-200 px-2.5 font-mono text-xs text-slate-700 hover:bg-slate-50"
                  >
                    +{qty}
                  </button>
                ))}
              </div>
            </div>
            {Number.isInteger(Number(restockQty)) && Number(restockQty) >= 1 && (
              <p className="text-xs text-slate-500 tabular-nums">
                Updated Stock:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {restockTarget.quantity + Number(restockQty)} units
                </span>{" "}
                · Purchase Order Cost:{" "}
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
                Add to Inventory
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
