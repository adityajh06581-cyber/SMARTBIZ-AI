import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Product, Sale } from "../types/shop";
import {
  downloadCsv,
  formatCurrency,
  formatDisplayDate,
  formatMonthLabel,
  formatNumber,
  formatPercent,
  getLocalDateString,
  getLocalMonthString,
  roundMoney,
} from "../utils/format";

interface ReportsViewProps {
  sales: Sale[];
  products: Product[];
}

export function ReportsView({ sales, products }: ReportsViewProps) {
  const [reportTab, setReportTab] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getLocalMonthString());

  const dailySales = useMemo(
    () =>
      sales
        .filter((s) => s.date === selectedDate)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales, selectedDate]
  );

  const monthlySales = useMemo(
    () =>
      sales
        .filter((s) => s.date.startsWith(selectedMonth))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sales, selectedMonth]
  );

  const activeSales = reportTab === "daily" ? dailySales : monthlySales;

  const summary = useMemo(() => {
    const revenue = roundMoney(activeSales.reduce((sum, s) => sum + s.totalAmount, 0));
    const cost = roundMoney(activeSales.reduce((sum, s) => sum + s.totalCost, 0));
    const profit = roundMoney(revenue - cost);
    const units = activeSales.reduce((sum, s) => sum + s.quantity, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      orders: activeSales.length,
      units,
      revenue,
      cost,
      profit,
      margin,
    };
  }, [activeSales]);

  // Daily aggregation within the selected month for Monthly view
  const monthlyDailyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { date: string; orders: number; units: number; revenue: number; cost: number; profit: number }
    >();
    for (const sale of monthlySales) {
      const entry = map.get(sale.date) ?? {
        date: sale.date,
        orders: 0,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      entry.orders += 1;
      entry.units += sale.quantity;
      entry.revenue = roundMoney(entry.revenue + sale.totalAmount);
      entry.cost = roundMoney(entry.cost + sale.totalCost);
      entry.profit = roundMoney(entry.profit + sale.profit);
      map.set(sale.date, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlySales]);

  const maxMonthlyBar = useMemo(
    () => Math.max(...monthlyDailyBreakdown.map((d) => d.revenue), 100),
    [monthlyDailyBreakdown]
  );

  const handleExportPeriodCsv = () => {
    if (reportTab === "daily") {
      downloadCsv(
        `smartbiz-daily-sales-${selectedDate}.csv`,
        [
          "Sale ID",
          "Date",
          "Product",
          "SKU",
          "Customer",
          "Quantity",
          "Unit Price",
          "Unit Cost",
          "Total Revenue",
          "Total Cost",
          "Profit",
        ],
        dailySales.map((s) => [
          s.id,
          s.date,
          s.productName,
          s.productSku,
          s.customerName,
          s.quantity,
          s.unitPrice.toFixed(2),
          s.unitCost.toFixed(2),
          s.totalAmount.toFixed(2),
          s.totalCost.toFixed(2),
          s.profit.toFixed(2),
        ])
      );
    } else {
      downloadCsv(
        `smartbiz-monthly-sales-${selectedMonth}.csv`,
        [
          "Date",
          "Orders",
          "Units Sold",
          "Total Revenue",
          "Purchase Cost",
          "Gross Profit",
        ],
        monthlyDailyBreakdown.map((d) => [
          d.date,
          d.orders,
          d.units,
          d.revenue.toFixed(2),
          d.cost.toFixed(2),
          d.profit.toFixed(2),
        ])
      );
    }
  };

  const handleExportFullTransactionsCsv = () => {
    downloadCsv(
      `smartbiz-sales-transactions-${selectedMonth}.csv`,
      [
        "Sale ID",
        "Date",
        "Product",
        "SKU",
        "Customer",
        "Quantity",
        "Unit Price",
        "Total Revenue",
        "Total Cost",
        "Profit",
      ],
      monthlySales.map((s) => [
        s.id,
        s.date,
        s.productName,
        s.productSku,
        s.customerName,
        s.quantity,
        s.unitPrice.toFixed(2),
        s.totalAmount.toFixed(2),
        s.totalCost.toFixed(2),
        s.profit.toFixed(2),
      ])
    );
  };

  const handleExportInventoryCsv = () => {
    downloadCsv(
      `smartbiz-inventory-snapshot-${getLocalDateString()}.csv`,
      [
        "SKU",
        "Product Name",
        "Category",
        "Quantity In Stock",
        "Purchase Price",
        "Selling Price",
        "Stock Cost Value",
        "Stock Retail Value",
      ],
      products.map((p) => [
        p.sku,
        p.name,
        p.category,
        p.quantity,
        p.purchasePrice.toFixed(2),
        p.sellingPrice.toFixed(2),
        (p.purchasePrice * p.quantity).toFixed(2),
        (p.sellingPrice * p.quantity).toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls & CSV Export Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setReportTab("daily")}
              className={`h-8 rounded-md px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                reportTab === "daily"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daily Report
            </button>
            <button
              type="button"
              onClick={() => setReportTab("monthly")}
              className={`h-8 rounded-md px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                reportTab === "monthly"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Monthly Report
            </button>
          </div>

          {reportTab === "daily" ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Select daily report date"
              className="h-10 rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select monthly report month"
              className="h-10 rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPeriodCsv}
            disabled={activeSales.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            {reportTab === "daily" ? "Export Daily CSV" : "Export Monthly Summary CSV"}
          </button>

          {reportTab === "monthly" && (
            <button
              type="button"
              onClick={handleExportFullTransactionsCsv}
              disabled={monthlySales.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              Export Transactions CSV
            </button>
          )}

          <button
            type="button"
            onClick={handleExportInventoryCsv}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            Inventory CSV
          </button>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Period</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {reportTab === "daily"
              ? formatDisplayDate(selectedDate)
              : formatMonthLabel(selectedMonth)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Orders · Units</p>
          <p className="mt-2 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {formatNumber(summary.orders)} · {formatNumber(summary.units)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Revenue</p>
          <p className="mt-2 font-mono text-xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(summary.revenue)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Purchase Cost</p>
          <p className="mt-2 font-mono text-xl font-semibold text-slate-700 tabular-nums">
            {formatCurrency(summary.cost)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Gross Profit</p>
          <p className="mt-2 font-mono text-xl font-semibold text-emerald-700 tabular-nums">
            {formatCurrency(summary.profit)}{" "}
            <span className="text-xs font-normal text-slate-500">
              ({formatPercent(summary.margin)})
            </span>
          </p>
        </div>
      </div>

      {/* Monthly Chart (when Monthly Tab active) */}
      {reportTab === "monthly" && monthlyDailyBreakdown.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Daily Revenue Trend — {formatMonthLabel(selectedMonth)}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Active sales days during the selected month
          </p>
          <div className="mt-5 flex h-44 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-3">
            {monthlyDailyBreakdown.map((day) => {
              const heightPct = Math.max((day.revenue / maxMonthlyBar) * 100, 8);
              return (
                <div
                  key={day.date}
                  className="flex min-w-[44px] flex-1 flex-col items-center justify-end gap-1.5 h-full"
                  title={`${formatDisplayDate(day.date)}: ${formatCurrency(day.revenue)}`}
                >
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    ${Math.round(day.revenue)}
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-sm bg-blue-600"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto text-center">
            {monthlyDailyBreakdown.map((day) => (
              <div
                key={day.date}
                className="min-w-[44px] flex-1 font-mono text-[11px] text-slate-500"
              >
                {day.date.slice(8)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Report Data Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {reportTab === "daily"
              ? `Daily Transactions — ${formatDisplayDate(selectedDate)}`
              : `Daily Breakdown — ${formatMonthLabel(selectedMonth)}`}
          </h2>
        </div>

        {activeSales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-slate-900">
              No sales recorded for this period
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Choose another date or month above, or record new transactions in the Sales module.
            </p>
          </div>
        ) : reportTab === "daily" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5 text-right">Qty</th>
                  <th className="px-4 py-3.5 text-right">Unit Price</th>
                  <th className="px-4 py-3.5 text-right">Revenue</th>
                  <th className="px-4 py-3.5 text-right">Cost</th>
                  <th className="px-6 py-3.5 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailySales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-900">{s.productName}</p>
                      <p className="font-mono text-xs text-slate-500">{s.productSku}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{s.customerName}</td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      {s.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                      {formatCurrency(s.unitPrice)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(s.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                      {formatCurrency(s.totalCost)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-medium text-emerald-700 tabular-nums">
                      +{formatCurrency(s.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Orders</th>
                  <th className="px-4 py-3.5 text-right">Units Sold</th>
                  <th className="px-4 py-3.5 text-right">Revenue</th>
                  <th className="px-4 py-3.5 text-right">Purchase Cost</th>
                  <th className="px-6 py-3.5 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyDailyBreakdown.map((day) => (
                  <tr key={day.date} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {formatDisplayDate(day.date)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      {day.orders}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                      {day.units}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {formatCurrency(day.revenue)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                      {formatCurrency(day.cost)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-medium text-emerald-700 tabular-nums">
                      +{formatCurrency(day.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
