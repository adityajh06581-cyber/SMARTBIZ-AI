import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { ModuleId, Product, Sale } from "../types/shop";
import {
  formatCurrency,
  formatDisplayDate,
  formatNumber,
  formatPercent,
  roundMoney,
  shiftDaysDateString,
} from "../utils/format";

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  metrics: {
    totalRevenue: number;
    totalPurchaseCost: number;
    totalProfit: number;
    profitMarginPct: number;
    totalSalesCount: number;
    totalUnitsSold: number;
    totalProducts: number;
    totalInventoryUnits: number;
    lowStockProducts: Product[];
    lowStockCount: number;
    outOfStockCount: number;
  };
  onNavigate: (module: ModuleId) => void;
  onQuickRecordSale: () => void;
}

export function DashboardView({
  products,
  sales,
  metrics,
  onNavigate,
  onQuickRecordSale,
}: DashboardViewProps) {
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  const last7DaysSeries = useMemo(() => {
    const days: Array<{
      date: string;
      shortLabel: string;
      revenue: number;
      profit: number;
      orders: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const dateStr = shiftDaysDateString(i);
      const parts = dateStr.split("-");
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const shortLabel = dt.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      });

      const daySales = sales.filter((s) => s.date === dateStr);
      const revenue = roundMoney(daySales.reduce((sum, s) => sum + s.totalAmount, 0));
      const profit = roundMoney(daySales.reduce((sum, s) => sum + s.profit, 0));

      days.push({
        date: dateStr,
        shortLabel,
        revenue,
        profit,
        orders: daySales.length,
      });
    }
    return days;
  }, [sales]);

  const maxDayRevenue = useMemo(() => {
    const maxVal = Math.max(...last7DaysSeries.map((d) => d.revenue), 100);
    return Math.ceil(maxVal / 100) * 100;
  }, [last7DaysSeries]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);
  }, [sales]);

  const topCategories = useMemo(() => {
    const map = new Map<string, { revenue: number; units: number }>();
    const productCategory = new Map(products.map((p) => [p.id, p.category]));
    for (const sale of sales) {
      const cat = productCategory.get(sale.productId) ?? "General";
      const prev = map.get(cat) ?? { revenue: 0, units: 0 };
      prev.revenue = roundMoney(prev.revenue + sale.totalAmount);
      prev.units += sale.quantity;
      map.set(cat, prev);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
  }, [products, sales]);

  const activeDay =
    hoveredDayIndex !== null ? last7DaysSeries[hoveredDayIndex] : null;

  return (
    <div className="space-y-6">
      {/* KPI Overview Strip */}
      <section aria-label="Key performance metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
            <span>Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(metrics.totalRevenue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Profit {formatCurrency(metrics.totalProfit)} · {formatPercent(metrics.profitMarginPct)} margin
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
            <span>Total Sales</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(metrics.totalSalesCount)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {formatNumber(metrics.totalUnitsSold)} total units sold
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
            <span>Total Products</span>
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(metrics.totalProducts)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {formatNumber(metrics.totalInventoryUnits)} units currently in stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("low-stock")}
          className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
            <span>Low Stock Alerts</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                metrics.lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(metrics.lowStockCount)}
          </p>
          <p className="mt-1.5 flex items-center justify-between text-xs text-slate-500 tabular-nums">
            <span>
              {metrics.outOfStockCount > 0
                ? `${metrics.outOfStockCount} out of stock · Threshold ≤ 5`
                : "Items at 5 units or below"}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
          </p>
        </button>
      </section>

      {/* Main Analytics + Low Stock Alerts Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 7-Day Revenue & Profit Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                7-Day Revenue & Profit
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Daily sales totals compared against gross profit
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                Profit
              </span>
            </div>
          </div>

          <div className="mt-4 min-h-[36px] rounded-lg bg-slate-50 px-3.5 py-2 text-xs text-slate-600 tabular-nums">
            {activeDay ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {formatDisplayDate(activeDay.date)} · {activeDay.orders} order(s)
                </span>
                <span className="font-mono">
                  Revenue {formatCurrency(activeDay.revenue)} · Profit{" "}
                  {formatCurrency(activeDay.profit)}
                </span>
              </div>
            ) : (
              <span>Hover or focus any day bar to inspect exact daily revenue and profit.</span>
            )}
          </div>

          <div className="mt-5">
            <div className="grid h-56 grid-cols-7 items-end gap-3 border-b border-slate-200 pb-3">
              {last7DaysSeries.map((day, idx) => {
                const revPct = Math.max((day.revenue / maxDayRevenue) * 100, day.revenue > 0 ? 6 : 2);
                const profPct = Math.max((day.profit / maxDayRevenue) * 100, day.profit > 0 ? 4 : 0);
                return (
                  <button
                    key={day.date}
                    type="button"
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    onFocus={() => setHoveredDayIndex(idx)}
                    onBlur={() => setHoveredDayIndex(null)}
                    className="group flex h-full flex-col justify-end rounded-md px-1 pt-2 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                    aria-label={`${day.shortLabel}: Revenue ${formatCurrency(day.revenue)}, Profit ${formatCurrency(day.profit)}`}
                  >
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div
                        className="w-3.5 rounded-t-sm bg-blue-600 transition-all duration-150 group-hover:bg-blue-700 sm:w-4"
                        style={{ height: `${revPct}%` }}
                      />
                      <div
                        className="w-3.5 rounded-t-sm bg-emerald-600 transition-all duration-150 group-hover:bg-emerald-700 sm:w-4"
                        style={{ height: `${profPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-3 text-center text-xs text-slate-500">
              {last7DaysSeries.map((day) => (
                <div key={day.date} className="truncate font-mono">
                  {day.shortLabel}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Low Stock Alerts Panel */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Low Stock Attention
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Products with 5 units or fewer remaining
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("low-stock")}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 whitespace-nowrap shrink-0"
              >
                Manage All
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {metrics.lowStockProducts.length === 0 ? (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-medium text-slate-800">
                  All inventory levels are healthy
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  No products are at or below the 5-unit threshold.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {metrics.lowStockProducts.slice(0, 5).map((item) => {
                  const isOut = item.quantity === 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span className="font-mono">{item.sku}</span> · {item.category}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`font-mono text-sm font-semibold tabular-nums ${
                            isOut ? "text-red-600" : "text-amber-700"
                          }`}
                        >
                          {item.quantity} left
                        </p>
                        <p className="text-xs text-slate-500">
                          {isOut ? "Out of stock" : "Reorder soon"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">
              Need to log a walk-in or customer sale?
            </span>
            <button
              type="button"
              onClick={onQuickRecordSale}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Record Sale
            </button>
          </div>
        </section>
      </div>

      {/* Bottom Row: Recent Sales + Top Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Sales
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Latest completed transactions across all channels
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("sales")}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 whitespace-nowrap shrink-0"
            >
              View Ledger
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600">No sales recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDisplayDate(sale.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {sale.productName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.customerName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                        {sale.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-emerald-700 tabular-nums">
                        +{formatCurrency(sale.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Revenue by Category
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("profit-loss")}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Full P&L
            </button>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Top performing inventory categories
          </p>

          <div className="mt-5 space-y-4">
            {topCategories.length === 0 ? (
              <p className="text-sm text-slate-500">No category sales data available.</p>
            ) : (
              topCategories.map((cat) => {
                const share =
                  metrics.totalRevenue > 0
                    ? Math.round((cat.revenue / metrics.totalRevenue) * 100)
                    : 0;
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{cat.category}</span>
                      <span className="font-mono text-slate-900 tabular-nums">
                        {formatCurrency(cat.revenue)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.max(share, 4)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {cat.units} units sold · {share}% of revenue
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
