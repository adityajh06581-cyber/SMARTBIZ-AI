import { LOW_STOCK_THRESHOLD } from "../data/demoData";
import type { Product, Sale, Supplier, Customer } from "../types/shop";
import { formatCurrency, formatPercent, getLocalDateString, getLocalMonthString, roundMoney } from "./format";

interface BuildContextParams {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
}

export function buildShopContextPayload({
  products,
  sales,
  customers,
  suppliers,
}: BuildContextParams) {
  const totalRevenue = roundMoney(sales.reduce((sum, s) => sum + s.totalAmount, 0));
  const totalPurchaseCost = roundMoney(sales.reduce((sum, s) => sum + s.totalCost, 0));
  const totalProfit = roundMoney(totalRevenue - totalPurchaseCost);
  const profitMarginPct = totalRevenue > 0 ? roundMoney((totalProfit / totalRevenue) * 100) : 0;

  const lowStockProducts = products
    .filter((p) => p.quantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.quantity - b.quantity);

  const productSalesMap = new Map<
    string,
    { productName: string; unitsSold: number; revenue: number; profit: number }
  >();
  for (const sale of sales) {
    const existing = productSalesMap.get(sale.productId) ?? {
      productName: sale.productName,
      unitsSold: 0,
      revenue: 0,
      profit: 0,
    };
    existing.unitsSold += sale.quantity;
    existing.revenue = roundMoney(existing.revenue + sale.totalAmount);
    existing.profit = roundMoney(existing.profit + sale.profit);
    productSalesMap.set(sale.productId, existing);
  }

  const topSellingProducts = Array.from(productSalesMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

  return {
    summary: {
      totalRevenue,
      totalPurchaseCost,
      totalProfit,
      profitMarginPct,
      totalSalesCount: sales.length,
      totalUnitsSold: sales.reduce((sum, s) => sum + s.quantity, 0),
      totalProducts: products.length,
      totalInventoryUnits: products.reduce((sum, p) => sum + p.quantity, 0),
      inventoryCostValue: roundMoney(
        products.reduce((sum, p) => sum + p.purchasePrice * p.quantity, 0)
      ),
      inventoryRetailValue: roundMoney(
        products.reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0)
      ),
      lowStockCount: lowStockProducts.length,
      outOfStockCount: lowStockProducts.filter((p) => p.quantity === 0).length,
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
    },
    lowStockProducts: lowStockProducts.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
    })),
    products: products.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      quantity: p.quantity,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      supplierName: p.supplierId ? supplierMap.get(p.supplierId) : undefined,
    })),
    topSellingProducts: topSellingProducts.slice(0, 8),
    recentSales: [...sales]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15)
      .map((s) => ({
        date: s.date,
        productName: s.productName,
        customerName: s.customerName,
        quantity: s.quantity,
        totalAmount: s.totalAmount,
        totalCost: s.totalCost,
        profit: s.profit,
      })),
    suppliers: suppliers.map((s) => ({
      name: s.name,
      phone: s.phone,
      productsSupplied: s.productsSupplied,
    })),
  };
}

export function generateLocalFallbackAnswer(
  question: string,
  params: BuildContextParams
): string {
  const ctx = buildShopContextPayload(params);
  const q = question.toLowerCase();
  const today = getLocalDateString();
  const thisMonth = getLocalMonthString();

  const todaySales = params.sales.filter((s) => s.date === today);
  const todayRevenue = roundMoney(todaySales.reduce((sum, s) => sum + s.totalAmount, 0));
  const monthSales = params.sales.filter((s) => s.date.startsWith(thisMonth));
  const monthRevenue = roundMoney(monthSales.reduce((sum, s) => sum + s.totalAmount, 0));
  const monthProfit = roundMoney(monthSales.reduce((sum, s) => sum + s.profit, 0));

  const sections: string[] = [];

  if (
    q.includes("low") ||
    q.includes("restock") ||
    q.includes("stock") ||
    q.includes("inventory") ||
    q.includes("reorder") ||
    q.includes("out")
  ) {
    if (ctx.lowStockProducts.length === 0) {
      sections.push(
        `All ${ctx.summary.totalProducts} products are currently healthy (above ${LOW_STOCK_THRESHOLD} units). Total stock on hand: ${ctx.summary.totalInventoryUnits} units valued at ${formatCurrency(ctx.summary.inventoryCostValue)} cost.`
      );
    } else {
      sections.push(
        `Low Stock & Restock Priority (${ctx.lowStockProducts.length} items at or below ${LOW_STOCK_THRESHOLD} units):`
      );
      for (const item of ctx.lowStockProducts) {
        const recommendedQty = Math.max(10 - item.quantity, 8);
        const estCost = roundMoney(recommendedQty * item.purchasePrice);
        const matchedProduct = params.products.find((p) => p.sku === item.sku);
        const supplier = matchedProduct?.supplierId
          ? params.suppliers.find((s) => s.id === matchedProduct.supplierId)
          : undefined;
        sections.push(
          `• ${item.name} (${item.sku}): ${item.quantity} unit(s) left — Suggest ordering +${recommendedQty} units (~${formatCurrency(estCost)} purchase cost)${supplier ? ` via ${supplier.name} (${supplier.phone})` : ""}.`
        );
      }
    }
  }

  if (
    q.includes("sale") ||
    q.includes("revenue") ||
    q.includes("profit") ||
    q.includes("loss") ||
    q.includes("top") ||
    q.includes("best") ||
    q.includes("margin") ||
    q.includes("today") ||
    q.includes("month")
  ) {
    sections.push(
      `Sales & Profit Performance:\n• All-time Revenue: ${formatCurrency(ctx.summary.totalRevenue)} across ${ctx.summary.totalSalesCount} orders (${ctx.summary.totalUnitsSold} units).\n• Purchase Cost (COGS): ${formatCurrency(ctx.summary.totalPurchaseCost)}\n• Net Gross Profit: ${formatCurrency(ctx.summary.totalProfit)} (${formatPercent(ctx.summary.profitMarginPct)} margin).\n• Today (${today}): ${todaySales.length} sale(s) totaling ${formatCurrency(todayRevenue)}.\n• This Month (${thisMonth}): ${monthSales.length} sale(s) totaling ${formatCurrency(monthRevenue)} revenue and ${formatCurrency(monthProfit)} profit.`
    );
    if (ctx.topSellingProducts.length > 0) {
      const topList = ctx.topSellingProducts
        .slice(0, 3)
        .map(
          (p, i) =>
            `${i + 1}. ${p.productName} — ${p.unitsSold} units (${formatCurrency(p.revenue)} rev, ${formatCurrency(p.profit)} profit)`
        )
        .join("\n");
      sections.push(`Top Performing Products:\n${topList}`);
    }
  }

  if (q.includes("customer") || q.includes("supplier") || q.includes("vendor")) {
    sections.push(
      `Directory Summary: ${ctx.summary.totalCustomers} saved customers and ${ctx.summary.totalSuppliers} active suppliers.`
    );
  }

  if (sections.length === 0) {
    sections.push(
      `Live SmartBiz Snapshot:\n• Total Revenue: ${formatCurrency(ctx.summary.totalRevenue)} | Gross Profit: ${formatCurrency(ctx.summary.totalProfit)} (${formatPercent(ctx.summary.profitMarginPct)} margin)\n• Total Sales: ${ctx.summary.totalSalesCount} transactions (${ctx.summary.totalUnitsSold} units)\n• Inventory: ${ctx.summary.totalProducts} SKUs (${ctx.summary.totalInventoryUnits} units, ${formatCurrency(ctx.summary.inventoryCostValue)} cost basis)\n• Low Stock Alerts: ${ctx.summary.lowStockCount} product(s) at or below ${LOW_STOCK_THRESHOLD} units (${ctx.summary.outOfStockCount} out of stock)`
    );
    if (ctx.lowStockProducts.length > 0) {
      const urgent = ctx.lowStockProducts
        .slice(0, 3)
        .map((p) => `${p.name} (${p.quantity} left)`)
        .join(", ");
      sections.push(`Immediate attention needed for: ${urgent}.`);
    }
  }

  return sections.join("\n\n");
}
