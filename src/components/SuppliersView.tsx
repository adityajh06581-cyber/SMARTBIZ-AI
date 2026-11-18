import { useMemo, useState, type FormEvent } from "react";
import { Mail, MapPin, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import type { SupplierInput } from "../hooks/useShopStore";
import type { Product, Supplier } from "../types/shop";
import { isValidEmail, isValidPhone } from "../utils/format";
import { Modal } from "./Modal";

interface SuppliersViewProps {
  suppliers: Supplier[];
  products: Product[];
  onAddSupplier: (input: SupplierInput) => { ok: boolean; error?: string };
  onUpdateSupplier: (id: string, input: SupplierInput) => { ok: boolean; error?: string };
  onDeleteSupplier: (id: string) => void;
}

interface SupplierFormState {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  productsSuppliedText: string;
}

const EMPTY_FORM: SupplierFormState = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  productsSuppliedText: "",
};

export function SuppliersView({
  suppliers,
  products,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}: SuppliersViewProps) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const linkedProductsBySupplier = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      if (!p.supplierId) continue;
      const list = map.get(p.supplierId) ?? [];
      list.push(p);
      map.set(p.supplierId, list);
    }
    return map;
  }, [products]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.productsSupplied.some((p) => p.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      productsSuppliedText: supplier.productsSupplied.join(", "),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedProducts = form.productsSuppliedText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (form.name.trim().length < 2) {
      setFormError("Supplier company name must be at least 2 characters.");
      return;
    }
    if (form.contactPerson.trim().length < 2) {
      setFormError("Contact person name is required.");
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
    if (parsedProducts.length === 0) {
      setFormError("Enter at least one supplied product (comma-separated).");
      return;
    }

    const payload: SupplierInput = {
      name: form.name,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email || undefined,
      address: form.address || undefined,
      productsSupplied: parsedProducts,
    };

    const res = editingSupplier
      ? onUpdateSupplier(editingSupplier.id, payload)
      : onAddSupplier(payload);

    if (!res.ok) {
      setFormError(res.error ?? "Unable to save supplier.");
      return;
    }
    setModalOpen(false);
  };

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
            placeholder="Search supplier, contact, or supplied product..."
            className="h-10 w-full rounded-lg border border-slate-200 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-medium text-slate-900">No suppliers found</p>
          <p className="mt-1 text-sm text-slate-500">
            Add wholesale suppliers to link inventory items and streamline restocking.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredSuppliers.map((supplier) => {
            const linked = linkedProductsBySupplier.get(supplier.id) ?? [];
            return (
              <article
                key={supplier.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {supplier.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Contact: {supplier.contactPerson}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(supplier)}
                        aria-label={`Edit ${supplier.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(supplier)}
                        aria-label={`Delete ${supplier.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2 font-mono text-xs text-slate-700">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {supplier.phone}
                    </p>
                    {supplier.email && (
                      <p className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {supplier.email}
                      </p>
                    )}
                    {supplier.address && (
                      <p className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {supplier.address}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500">
                      Products Supplied ({supplier.productsSupplied.length})
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                      {supplier.productsSupplied.join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 tabular-nums">
                  {linked.length > 0
                    ? `Linked to ${linked.length} active SKU(s) in Inventory`
                    : "No active SKUs linked yet"}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
        subtitle="Manage vendor phone details and supplied product lines."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Supplier Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Apex Audio & Acoustics"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Contact Person *
              </label>
              <input
                type="text"
                required
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g., Hannah Lindqvist"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
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
                placeholder="+1 (415) 890-3342"
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
                placeholder="orders@supplier.com"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Warehouse / Business Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="420 Howard St, San Francisco, CA"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Products Supplied (comma-separated) *
            </label>
            <textarea
              rows={3}
              required
              value={form.productsSuppliedText}
              onChange={(e) => setForm({ ...form, productsSuppliedText: e.target.value })}
              placeholder="Sony WH-1000XM5 Headphones, Blue Yeti USB Studio Mic"
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
              {editingSupplier ? "Save Changes" : "Add Supplier"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Supplier Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Supplier"
        maxWidthClass="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Remove <span className="font-semibold text-slate-900">{deleteTarget.name}</span>?
              Products linked to this supplier will remain in inventory as unassigned.
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
                  onDeleteSupplier(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
