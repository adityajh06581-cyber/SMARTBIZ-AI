import { useMemo, useState, type FormEvent } from "react";
import { History, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import type { CustomerInput } from "../hooks/useShopStore";
import type { Customer, Sale } from "../types/shop";
import {
  formatCurrency,
  formatDisplayDate,
  isValidEmail,
  isValidPhone,
  roundMoney,
} from "../utils/format";
import { Modal } from "./Modal";

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  onAddCustomer: (input: CustomerInput) => { ok: boolean; error?: string };
  onUpdateCustomer: (id: string, input: CustomerInput) => { ok: boolean; error?: string };
  onDeleteCustomer: (id: string) => void;
}

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

export function CustomersView({
  customers,
  sales,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: CustomersViewProps) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const customerStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { orders: Sale[]; totalSpent: number; totalUnits: number; lastDate: string | null }
    >();
    for (const c of customers) {
      map.set(c.id, { orders: [], totalSpent: 0, totalUnits: 0, lastDate: null });
    }
    const sortedSales = [...sales].sort((a, b) => b.date.localeCompare(a.date));
    for (const sale of sortedSales) {
      if (!sale.customerId) continue;
      const entry = map.get(sale.customerId);
      if (!entry) continue;
      entry.orders.push(sale);
      entry.totalSpent = roundMoney(entry.totalSpent + sale.totalAmount);
      entry.totalUnits += sale.quantity;
      if (!entry.lastDate || sale.date > entry.lastDate) {
        entry.lastDate = sale.date;
      }
    }
    return map;
  }, [customers, sales]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      notes: customer.notes ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (form.name.trim().length < 2) {
      setFormError("Customer name must be at least 2 characters.");
      return;
    }
    if (!isValidPhone(form.phone)) {
      setFormError("Please enter a valid phone number (7–15 digits).");
      return;
    }
    if (form.email.trim() && !isValidEmail(form.email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    const payload: CustomerInput = {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      notes: form.notes || undefined,
    };

    const res = editingCustomer
      ? onUpdateCustomer(editingCustomer.id, payload)
      : onAddCustomer(payload);

    if (!res.ok) {
      setFormError(res.error ?? "Unable to save customer.");
      return;
    }
    setModalOpen(false);
  };

  const historyData = historyCustomer
    ? customerStatsMap.get(historyCustomer.id) ?? {
        orders: [],
        totalSpent: 0,
        totalUnits: 0,
        lastDate: null,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, or email..."
            className="h-10 w-full rounded-lg border border-slate-200 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-slate-900">
              No customers found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Add a customer profile to track phone contact details and purchase history.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5 text-right">Orders</th>
                  <th className="px-4 py-3.5 text-right">Total Spent</th>
                  <th className="px-4 py-3.5">Last Purchase</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const stats = customerStatsMap.get(customer.id);
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/80">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-900">{customer.name}</p>
                        {(customer.email || customer.notes) && (
                          <p className="mt-0.5 truncate max-w-xs text-xs text-slate-500">
                            {[customer.email, customer.notes].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {customer.phone}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-700 tabular-nums">
                        {stats?.orders.length ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(stats?.totalSpent ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {stats?.lastDate ? formatDisplayDate(stats.lastDate) : "No purchases yet"}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setHistoryCustomer(customer)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            aria-label={`Edit ${customer.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(customer)}
                            aria-label={`Delete ${customer.name}`}
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

      {/* Add / Edit Customer Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        subtitle="Store contact information for receipts and purchase tracking."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Elena Rostova"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (415) 555-0192"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="customer@example.com"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional delivery preferences or billing notes..."
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

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
              {editingCustomer ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Purchase History Modal */}
      <Modal
        open={Boolean(historyCustomer)}
        onClose={() => setHistoryCustomer(null)}
        title={historyCustomer ? `${historyCustomer.name} — Purchase History` : "Purchase History"}
        subtitle={historyCustomer ? `Phone: ${historyCustomer.phone}` : ""}
        maxWidthClass="max-w-2xl"
      >
        {historyCustomer && historyData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total Orders</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {historyData.orders.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Units Purchased</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {historyData.totalUnits}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Lifetime Spend</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(historyData.totalSpent)}
                </p>
              </div>
            </div>

            {historyData.orders.length === 0 ? (
              <div className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">
                This customer has no recorded purchases yet.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyData.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatDisplayDate(order.date)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {order.productName}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                          {order.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Customer Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Customer"
        maxWidthClass="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{deleteTarget.name}</span>{" "}
              from your customer directory? Historical sales records will be preserved.
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
                  onDeleteCustomer(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete Customer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
