import { useMemo, useState } from "react";
import type { Product, Sale } from "../types/shop";
import {
  formatCurrency,
  formatMonthLabel,
  formatNumber,
  formatPercent,
  getLocalMonthString,
  roundMoney,
  shiftDaysDateString,
} from "../utils/format";

interface ProfitLossViewProps {
  sales: Sale[];
  products: Product[];
}

export function ProfitLossView({ sales, products }: ProfitLossViewProps) {
  const [period, setPeriod] = useState<"all" | "this-month" | "last-30" | string>("all");

  const availableMonths = useMemo(() => {
    const months = new Set(sales.map((s) => s.date.slice(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (period === "all") return sales;
    if (period === "this-month") {
      const ym = getLocalMonthString();
      return sales.filter((s) => s.date.startsWith(ym));
    }
    if (period === "last-30") {
      const cutoff = shiftDaysDateString(30);
      return sales.filter((s) => s.date >= cutoff);
    }
    return sales.filter((s) => s.date.startsWith(period));
  }, [sales, period]);

  const statement = useMemo(() => {
    const revenue = roundMoney(
      filteredSales.reduce((sum, s) => sum + s.totalAmount, 0)
    );
    const purchaseCost = roundMoney(
      filteredSales.reduce((sum, s) => sum + s.totalCost, 0)
    );
    const netProfit = roundMoney(revenue - purchaseCost);
    const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const markupPct = purchaseCost > 0 ? (netProfit / purchaseCost) * 100 : 0;
    const unitsSold = filteredSales.reduce((sum, s) => sum + s.quantity, 0);

    const inventoryCostValue = roundMoney(
      products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0)
    );
    const inventoryRetailValue = roundMoney(
      products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0)
    );

    return {
      revenue,
      purchaseCost,
      netProfit,
      marginPct,
      markupPct,
      unitsSold,
      orders: filteredSales.length,
      inventoryCostValue,
      inventoryRetailValue,
      unrealizedInventoryProfit: roundMoney(
        inventoryRetailValue - inventoryCostValue
      ),
    };
  }, [filteredSales, products]);

  const monthlyComparison = useMemo(() => {
    const map = new Map<
      string,
      { month: string; revenue: number; cost: number; profit: number; orders: number }
    >();
    for (const s of sales) {
      const ym = s.date.slice(0, 7);
      const entry = map.get(ym) ?? {
        month: ym,
        revenue: 0,
        cost: 0,
        profit: 0,
        orders: 0,
      };
      entry.revenue = roundMoney(entry.revenue + s.totalAmount);
      entry.cost = roundMoney(entry.cost + s.totalCost);
      entry.profit = roundMoney(entry.profit + s.profit);
      entry.orders += 1;
      map.set(ym, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [sales]);

  const productBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        units: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();
    for (const s of filteredSales) {
      const entry = map.get(s.productId) ?? {
        productId: s.productId,
        productName: s.productName,
        sku: s.productSku,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      entry.units += s.quantity;
      entry.revenue = roundMoney(entry.revenue + s.totalAmount);
      entry.cost = roundMoney(entry.cost + s.totalCost);
      entry.profit = roundMoney(entry.profit + s.profit);
      map.set(s.productId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { id: "all", label: "All Time" },
            { id: "this-month", label: "This Month" },
            { id: "last-30", label: "Last 30 Days" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`h-8 rounded-md px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                period === opt.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="pl-month-select" className="text-xs font-medium text-slate-500">
            Specific Month:
          </label>
          <select
            id="pl-month-select"
            value={availableMonths.includes(period) ? period : ""}
            onChange={(e) => setPeriod(e.target.value || "all")}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            <option value="">Select month...</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary P&L Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Total Sales Revenue</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(statement.revenue)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {formatNumber(statement.orders)} completed orders ·{" "}
            {formatNumber(statement.unitsSold)} units sold
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Total Purchase Cost (COGS)
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold text-slate-800 tabular-nums">
            {formatCurrency(statement.purchaseCost)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            Direct wholesale cost of goods sold
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Net Gross Profit / Loss
          </p>
          <p
            className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${
              statement.netProfit >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {statement.netProfit >= 0 ? "+" : ""}
            {formatCurrency(statement.netProfit)}
          </p>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            {formatPercent(statement.marginPct)} net margin ·{" "}
            {formatPercent(statement.markupPct)} markup on cost
          </p>
        </div>
      </div>

      {/* Ledger Statement + Monthly Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="text-base font-semibold text-slate-900">
            Income & Inventory Valuation
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Accounting summary for selected sales period and current stock
          </p>

          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-600">Gross Sales Revenue</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums">
                {formatCurrency(statement.revenue)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-600">Less: Purchase Cost (COGS)</dt>
              <dd className="font-mono text-slate-700 tabular-nums">
                ({formatCurrency(statement.purchaseCost)})
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 font-semibold">
              <dt className="text-slate-900">Realized Gross Profit</dt>
              <dd
                className={`font-mono tabular-nums ${
                  statement.netProfit >= 0 ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {formatCurrency(statement.netProfit)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-600">Inventory Asset Value (at Cost)</dt>
              <dd className="font-mono text-slate-800 tabular-nums">
                {formatCurrency(statement.inventoryCostValue)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-600">Inventory Retail Value (Potential)</dt>
              <dd className="font-mono text-slate-800 tabular-nums">
                {formatCurrency(statement.inventoryRetailValue)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-600">Projected Margin in Stock</dt>
              <dd className="font-mono font-medium text-blue-700 tabular-nums">
                +{formatCurrency(statement.unrealizedInventoryProfit)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white lg:col-span-7">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Monthly Profit & Loss Comparison
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Month-over-month revenue, purchase cost, and profit margin
            </p>
          </div>
          {monthlyComparison.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No monthly sales history available yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="px-6 py-3.5">Month</th>
                    <th className="px-4 py-3.5 text-right">Orders</th>
                    <th className="px-4 py-3.5 text-right">Revenue</th>
                    <th className="px-4 py-3.5 text-right">Purchase Cost</th>
                    <th className="px-4 py-3.5 text-right">Profit</th>
                    <th className="px-6 py-3.5 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyComparison.map((row) => {
                    const margin =
                      row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
                    return (
                      <tr key={row.month} className="hover:bg-slate-50/80">
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          {formatMonthLabel(row.month)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                          {row.orders}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                          {formatCurrency(row.cost)}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums ${
                            row.profit >= 0 ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                          {formatPercent(margin)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Product-Level Profitability */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Product-Level Profit & Loss Breakdown
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Ranked by net profit contribution in the selected period
          </p>
        </div>

        {productBreakdown.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No sales transactions recorded in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-4 py-3.5 text-right">Units Sold</th>
                  <th className="px-4 py-3.5 text-right">Revenue</th>
                  <th className="px-4 py-3.5 text-right">Purchase Cost</th>
                  <th className="px-4 py-3.5 text-right">Net Profit</th>
                  <th className="px-6 py-3.5 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productBreakdown.map((item) => {
                  const margin =
                    item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <p className="font-mono text-xs text-slate-500">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                        {item.units}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                        {formatCurrency(item.cost)}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right font-mono font-semibold tabular-nums ${
                          item.profit >= 0 ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {item.profit >= 0 ? "+" : ""}
                        {formatCurrency(item.profit)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                        {formatPercent(margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
