import { useState, type ComponentType } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  DollarSign,
  LayoutDashboard,
  Menu,
  Plus,
  RotateCcw,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";
import { AiAssistantView } from "./components/AiAssistantView";
import { CustomersView } from "./components/CustomersView";
import { DashboardView } from "./components/DashboardView";
import { InventoryView } from "./components/InventoryView";
import { LowStockView } from "./components/LowStockView";
import { Modal } from "./components/Modal";
import { ProfitLossView } from "./components/ProfitLossView";
import { ReportsView } from "./components/ReportsView";
import { SalesView } from "./components/SalesView";
import { SuppliersView } from "./components/SuppliersView";
import { useShopStore } from "./hooks/useShopStore";
import type { ModuleId } from "./types/shop";

interface NavItem {
  id: ModuleId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Store KPIs, recent sales, and stock alerts",
    icon: LayoutDashboard,
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Manage products, stock quantities, and pricing",
    icon: Boxes,
  },
  {
    id: "sales",
    label: "Sales",
    description: "Record transactions with automatic totals",
    icon: ShoppingCart,
  },
  {
    id: "customers",
    label: "Customers",
    description: "Directory, phone contacts, and purchase history",
    icon: Users,
  },
  {
    id: "suppliers",
    label: "Suppliers",
    description: "Vendor directory and products supplied",
    icon: Truck,
  },
  {
    id: "reports",
    label: "Reports",
    description: "Daily & monthly sales reports with CSV export",
    icon: BarChart3,
  },
  {
    id: "profit-loss",
    label: "Profit & Loss",
    description: "Revenue, purchase cost, margins, and valuation",
    icon: DollarSign,
  },
  {
    id: "low-stock",
    label: "Low Stock Alerts",
    description: "Products at 5 units or below",
    icon: AlertTriangle,
  },
  {
    id: "ai-assistant",
    label: "AI Assistant",
    description: "Ask questions about stock, sales, and restocking",
    icon: Bot,
  },
];

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const {
    products,
    sales,
    customers,
    suppliers,
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
  } = useShopStore();

  const currentNav =
    NAV_ITEMS.find((item) => item.id === activeModule) ?? NAV_ITEMS[0];

  const handleNavigate = (module: ModuleId) => {
    setActiveModule(module);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <button
            type="button"
            onClick={() => handleNavigate("dashboard")}
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SmartBiz
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          aria-label="Primary modules"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            const showLowStockCount =
              item.id === "low-stock" && metrics.lowStockCount > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-blue-700" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {showLowStockCount && (
                  <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                    {metrics.lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Demo Data
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {currentNav.label}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">
                {currentNav.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {metrics.lowStockCount > 0 && activeModule !== "low-stock" && (
              <button
                type="button"
                onClick={() => handleNavigate("low-stock")}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="tabular-nums">{metrics.lowStockCount} Low Stock</span>
              </button>
            )}

            {activeModule !== "sales" && (
              <button
                type="button"
                onClick={() => handleNavigate("sales")}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Record Sale</span>
              </button>
            )}
          </div>
        </header>

        {/* Active Module Canvas */}
        <main className="mx-auto w-full max-w-[1360px] flex-1 p-4 sm:p-6 lg:p-8">
          {activeModule === "dashboard" && (
            <DashboardView
              products={products}
              sales={sales}
              metrics={metrics}
              onNavigate={handleNavigate}
              onQuickRecordSale={() => handleNavigate("sales")}
            />
          )}

          {activeModule === "inventory" && (
            <InventoryView
              products={products}
              suppliers={suppliers}
              onAddProduct={addProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onRestockProduct={restockProduct}
            />
          )}

          {activeModule === "sales" && (
            <SalesView
              products={products}
              customers={customers}
              sales={sales}
              onRecordSale={recordSale}
              onDeleteSale={deleteSale}
            />
          )}

          {activeModule === "customers" && (
            <CustomersView
              customers={customers}
              sales={sales}
              onAddCustomer={addCustomer}
              onUpdateCustomer={updateCustomer}
              onDeleteCustomer={deleteCustomer}
            />
          )}

          {activeModule === "suppliers" && (
            <SuppliersView
              suppliers={suppliers}
              products={products}
              onAddSupplier={addSupplier}
              onUpdateSupplier={updateSupplier}
              onDeleteSupplier={deleteSupplier}
            />
          )}

          {activeModule === "reports" && (
            <ReportsView sales={sales} products={products} />
          )}

          {activeModule === "profit-loss" && (
            <ProfitLossView sales={sales} products={products} />
          )}

          {activeModule === "low-stock" && (
            <LowStockView
              products={products}
              suppliers={suppliers}
              onRestockProduct={restockProduct}
            />
          )}

          {activeModule === "ai-assistant" && (
            <AiAssistantView
              products={products}
              sales={sales}
              customers={customers}
              suppliers={suppliers}
            />
          )}
        </main>
      </div>

      {/* Reset Demo Data Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Data"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Restore SmartBiz to its initial demo dataset of 12 products, 18 sales
            transactions, 5 customers, and 4 suppliers? Any custom changes saved in
            this browser will be replaced.
          </p>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                setResetModalOpen(false);
              }}
              className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
            >
              Restore Demo Data
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
