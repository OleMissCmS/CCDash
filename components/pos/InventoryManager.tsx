"use client";

import { useState } from "react";
import { expirationBadge, stockBadge } from "@/lib/pos/inventory";
import { formatCents, parseDollarsToCents } from "@/lib/pos/money";
import type { PosProduct, ProductInput } from "@/lib/pos/types";

type ProductFormState = {
  name: string;
  sku: string;
  price: string;
  stock_quantity: string;
  low_stock_threshold: string;
  expires_on: string;
  category: string;
  is_active: boolean;
};

const emptyForm = (): ProductFormState => ({
  name: "",
  sku: "",
  price: "",
  stock_quantity: "0",
  low_stock_threshold: "5",
  expires_on: "",
  category: "",
  is_active: true,
});

export function InventoryManager({
  initialProducts,
}: {
  initialProducts: PosProduct[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lowStockCount = products.filter(
    (p) => p.is_active && p.stock_quantity <= p.low_stock_threshold
  ).length;

  function startEdit(product: PosProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      price: (product.price_cents / 100).toFixed(2),
      stock_quantity: String(product.stock_quantity),
      low_stock_threshold: String(product.low_stock_threshold),
      expires_on: product.expires_on ?? "",
      category: product.category ?? "",
      is_active: product.is_active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function toPayload(): ProductInput {
    return {
      name: form.name,
      sku: form.sku,
      price_cents: parseDollarsToCents(form.price),
      stock_quantity: Number.parseInt(form.stock_quantity, 10) || 0,
      low_stock_threshold: Number.parseInt(form.low_stock_threshold, 10) || 5,
      expires_on: form.expires_on || null,
      category: form.category || null,
      is_active: form.is_active,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload = toPayload();
    const res = await fetch("/api/pos/products", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingId ? data.product : p))
      );
    } else {
      setProducts((prev) => [...prev, data.product].sort((a, b) => a.name.localeCompare(b.name)));
    }
    resetForm();
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6 space-y-6">
      {lowStockCount > 0 && (
        <div className="alert alert-warning">
          <span>
            {lowStockCount} product{lowStockCount === 1 ? "" : "s"} at or below
            low-stock threshold.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="card bg-base-100 border border-base-300 shadow-sm"
        >
          <div className="card-body gap-3">
            <h2 className="card-title text-base">
              {editingId ? "Edit product" : "Add product"}
            </h2>

            <label className="form-control">
              <span className="label-text">Name</span>
              <input
                className="input input-bordered"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label-text">SKU</span>
                <input
                  className="input input-bordered"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text">Price ($)</span>
                <input
                  className="input input-bordered"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label-text">Stock qty</span>
                <input
                  className="input input-bordered"
                  inputMode="numeric"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    setForm({ ...form, stock_quantity: e.target.value })
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text">Low-stock alert at</span>
                <input
                  className="input input-bordered"
                  inputMode="numeric"
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({ ...form, low_stock_threshold: e.target.value })
                  }
                  required
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label-text">Category</span>
                <input
                  className="input input-bordered"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </label>
              <label className="form-control">
                <span className="label-text">Expires on</span>
                <input
                  type="date"
                  className="input input-bordered"
                  value={form.expires_on}
                  onChange={(e) => setForm({ ...form, expires_on: e.target.value })}
                />
              </label>
            </div>

            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="label-text">Active (show at checkout)</span>
            </label>

            {error && <div className="alert alert-error text-sm py-2">{error}</div>}

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Update" : "Add product"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Expires</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = stockBadge(
                    product.stock_quantity,
                    product.low_stock_threshold
                  );
                  const exp = expirationBadge(product.expires_on);

                  return (
                    <tr key={product.id} className={!product.is_active ? "opacity-50" : ""}>
                      <td>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-base-content/60">{product.sku}</div>
                      </td>
                      <td>{formatCents(product.price_cents)}</td>
                      <td>
                        <span
                          className={`badge badge-xs ${
                            stock.tone === "error"
                              ? "badge-error"
                              : stock.tone === "warning"
                                ? "badge-warning"
                                : "badge-ghost"
                          }`}
                        >
                          {stock.label}
                        </span>
                      </td>
                      <td>
                        {exp ? (
                          <span
                            className={`badge badge-xs ${
                              exp.tone === "error" ? "badge-error" : "badge-warning"
                            }`}
                          >
                            {exp.label}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => startEdit(product)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
