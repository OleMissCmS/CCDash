"use client";

import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { PatientInput, PosPatient } from "@/lib/pos/types";
import { isLocalPos } from "@/lib/pos/config";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function SaveCardForm({
  patientId,
  clientSecret,
  onSaved,
  onCancel,
}: {
  patientId: string;
  clientSecret: string;
  onSaved: (patient: PosPatient) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setError(null);

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (setupError) {
      setBusy(false);
      setError(setupError.message ?? "Could not save card.");
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id;

    if (!paymentMethodId) {
      setBusy(false);
      setError("No payment method returned.");
      return;
    }

    const res = await fetch("/api/stripe/setup-intent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        payment_method_id: paymentMethodId,
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not attach card.");
      return;
    }

    onSaved(data.patient);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!stripe || busy}
        >
          {busy ? "Saving…" : "Save card"}
        </button>
      </div>
    </form>
  );
}

export function PatientManager({
  initialPatients,
}: {
  initialPatients: PosPatient[];
}) {
  const [patients, setPatients] = useState(initialPatients);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientInput>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardPatientId, setCardPatientId] = useState<string | null>(null);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const res = await fetch(`/api/pos/patients${params}`);
      const data = await res.json();
      if (res.ok) setPatients(data.patients ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function resetForm() {
    setEditingId(null);
    setForm({ first_name: "", last_name: "", phone: "", email: "", notes: "" });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/pos/patients", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }

    if (editingId) {
      setPatients((prev) =>
        prev.map((p) => (p.id === editingId ? data.patient : p))
      );
    } else {
      setPatients((prev) =>
        [...prev, data.patient].sort((a, b) =>
          a.last_name.localeCompare(b.last_name)
        )
      );
    }
    resetForm();
  }

  function startEdit(patient: PosPatient) {
    setEditingId(patient.id);
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      notes: patient.notes ?? "",
    });
  }

  async function startSaveCard(patientId: string) {
    if (isLocalPos()) {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/pos/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_card", patient_id: patientId }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(data.error ?? "Could not save card.");
        return;
      }
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? data.patient : p))
      );
      return;
    }

    if (!stripePromise) {
      setError("Stripe is not configured.");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/stripe/setup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not start card setup.");
      return;
    }

    setCardPatientId(patientId);
    setCardClientSecret(data.client_secret);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="card bg-base-100 border border-base-300 shadow-sm"
        >
          <div className="card-body gap-3">
            <h2 className="card-title text-base">
              {editingId ? "Edit patient" : "Add patient"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label-text">First name</span>
                <input
                  className="input input-bordered"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text">Last name</span>
                <input
                  className="input input-bordered"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </label>
            </div>

            <label className="form-control">
              <span className="label-text">Phone</span>
              <input
                className="input input-bordered"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>

            <label className="form-control">
              <span className="label-text">Email</span>
              <input
                type="email"
                className="input input-bordered"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label className="form-control">
              <span className="label-text">Notes</span>
              <textarea
                className="textarea textarea-bordered"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>

            {error && !cardClientSecret && (
              <div className="alert alert-error text-sm py-2">{error}</div>
            )}

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : editingId ? "Update" : "Add patient"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="card-title text-base">Patients</h2>
              <input
                type="search"
                className="input input-bordered input-sm w-full max-w-xs"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <ul className="divide-y divide-base-300 max-h-[480px] overflow-y-auto">
              {patients.map((patient) => (
                <li
                  key={patient.id}
                  className="py-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-sm text-base-content/70">
                      {[patient.phone, patient.email].filter(Boolean).join(" · ") ||
                        "No contact info"}
                    </p>
                    <p className="text-sm mt-1">
                      <span className="badge badge-accent badge-sm">
                        {patient.loyalty_points} pts
                      </span>
                      {patient.stripe_default_payment_method_id && (
                        <span className="badge badge-success badge-sm ml-1">
                          Card on file
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => startEdit(patient)}
                    >
                      Edit
                    </button>
                    {(isLocalPos() || stripePromise) && (
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => startSaveCard(patient.id)}
                      >
                        {patient.stripe_default_payment_method_id
                          ? "Update card"
                          : "Save card"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {cardClientSecret && cardPatientId && stripePromise && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Save card on file</h3>
            <Elements stripe={stripePromise} options={{ clientSecret: cardClientSecret }}>
              <SaveCardForm
                patientId={cardPatientId}
                clientSecret={cardClientSecret}
                onCancel={() => {
                  setCardClientSecret(null);
                  setCardPatientId(null);
                }}
                onSaved={(patient) => {
                  setPatients((prev) =>
                    prev.map((p) => (p.id === patient.id ? patient : p))
                  );
                  setCardClientSecret(null);
                  setCardPatientId(null);
                }}
              />
            </Elements>
          </div>
        </dialog>
      )}
    </div>
  );
}
