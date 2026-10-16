"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { expirationBadge, stockBadge } from "@/lib/pos/inventory";
import { isLocalPos } from "@/lib/pos/config";
import {
  calcTaxCents,
  formatCents,
} from "@/lib/pos/money";
import type {
  CartLine,
  CheckoutResult,
  PosClinicSettings,
  PosPatient,
  PosProduct,
} from "@/lib/pos/types";
import { ReceiptPrint } from "./ReceiptPrint";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type PaymentMethod = "cash" | "card" | "saved_card";

function CardCheckoutForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    setBusy(false);

    if (submitError) {
      setError(submitError.message ?? "Payment failed.");
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment was not completed.");
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!stripe || busy}>
          {busy ? "Processing…" : "Pay now"}
        </button>
      </div>
    </form>
  );
}

export function CheckoutScreen({
  initialProducts,
  settings,
}: {
  initialProducts: PosProduct[];
  settings: PosClinicSettings | null;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [productQuery, setProductQuery] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<PosPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PosPatient | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  const [cardPaymentIntentId, setCardPaymentIntentId] = useState<string | null>(null);

  const taxRateBps = settings?.tax_rate_bps ?? 0;

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false)
    );
  }, [products, productQuery]);

  const subtotalCents = cart.reduce(
    (sum, line) => sum + line.product.price_cents * line.quantity,
    0
  );
  const taxCents = calcTaxCents(subtotalCents, taxRateBps);
  const totalCents = subtotalCents + taxCents;

  const searchPatients = useCallback(async (q: string) => {
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await fetch(`/api/pos/patients${params}`);
    const data = await res.json();
    if (res.ok) setPatients(data.patients ?? []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(patientQuery), 250);
    return () => clearTimeout(timer);
  }, [patientQuery, searchPatients]);

  useEffect(() => {
    searchPatients("");
  }, [searchPatients]);

  function addToCart(product: PosProduct) {
    if (product.stock_quantity < 1) {
      setError(`${product.name} is out of stock.`);
      return;
    }

    setError(null);
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          setError(`Only ${product.stock_quantity} in stock.`);
          return prev;
        }
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.product.id !== productId) return line;
          const nextQty = line.quantity + delta;
          if (nextQty < 1) return null;
          if (nextQty > line.product.stock_quantity) {
            setError(`Only ${line.product.stock_quantity} in stock.`);
            return line;
          }
          return { ...line, quantity: nextQty };
        })
        .filter(Boolean) as CartLine[]
    );
  }

  async function refreshProducts() {
    const res = await fetch("/api/pos/products");
    const data = await res.json();
    if (res.ok) setProducts(data.products ?? []);
  }

  async function finalizeCheckout(paymentIntentId?: string) {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selectedPatient?.id ?? null,
        items: cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
        payment_method: paymentMethod,
        payment_intent_id: paymentIntentId ?? cardPaymentIntentId ?? undefined,
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Checkout failed.");
      return;
    }

    setCheckoutResult(data as CheckoutResult);
    setCart([]);
    setCardClientSecret(null);
    setCardPaymentIntentId(null);
    await refreshProducts();

    if (selectedPatient && data.patient) {
      setSelectedPatient(data.patient);
    }
  }

  async function startCardPayment() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: selectedPatient?.id ?? null,
        items: cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not start card payment.");
      return;
    }

    setPaymentMethod("card");
    setCardClientSecret(data.client_secret);
    setCardPaymentIntentId(data.payment_intent_id);
  }

  async function handleCheckoutClick() {
    if (cart.length === 0) {
      setError("Add products to the cart first.");
      return;
    }

    if (paymentMethod === "card") {
      if (!stripePromise) {
        setError("Card payments require Stripe keys in environment.");
        return;
      }
      await startCardPayment();
      return;
    }

    if (paymentMethod === "saved_card") {
      if (!selectedPatient?.stripe_default_payment_method_id) {
        setError("This patient has no card on file.");
        return;
      }
    }

    await finalizeCheckout();
  }

  const hasSavedCard = Boolean(selectedPatient?.stripe_default_payment_method_id);
  const stripeEnabled = Boolean(stripePromise) && !isLocalPos();
  const savedCardEnabled = isLocalPos() || Boolean(stripePromise);

  return (
    <>
      {checkoutResult && (
        <ReceiptPrint
          result={checkoutResult}
          onClose={() => {
            setCheckoutResult(null);
            setPaymentMethod("cash");
          }}
        />
      )}

      <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-12 lg:p-6">
        {/* Patient panel */}
        <section className="card bg-base-100 shadow-sm border border-base-300 lg:col-span-3">
          <div className="card-body gap-3">
            <h2 className="card-title text-base">Patient</h2>
            <input
              type="search"
              className="input input-bordered w-full"
              placeholder="Search by name…"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
            />

            {selectedPatient ? (
              <div className="rounded-box border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    {selectedPatient.phone && (
                      <p className="text-sm text-base-content/70">
                        {selectedPatient.phone}
                      </p>
                    )}
                    <p className="text-sm mt-1">
                      <span className="badge badge-accent badge-sm">
                        {selectedPatient.loyalty_points} pts
                      </span>
                    </p>
                    {hasSavedCard && (
                      <p className="text-xs text-success mt-1">Card on file</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientQuery("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <ul className="menu menu-sm rounded-box border border-base-300 max-h-64 overflow-y-auto p-1">
                {patients.length === 0 && (
                  <li className="disabled">
                    <span className="text-base-content/50">No patients found</span>
                  </li>
                )}
                {patients.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setPatientQuery("");
                      }}
                    >
                      {patient.first_name} {patient.last_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-base-content/60">
              Optional — link a patient to earn $1 = 1 point.
            </p>
          </div>
        </section>

        {/* Products */}
        <section className="card bg-base-100 shadow-sm border border-base-300 lg:col-span-5">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="card-title text-base">Products</h2>
              <input
                type="search"
                className="input input-bordered input-sm w-full max-w-xs"
                placeholder="Filter products…"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-[520px] overflow-y-auto">
              {filteredProducts.map((product) => {
                const stock = stockBadge(
                  product.stock_quantity,
                  product.low_stock_threshold
                );
                const exp = expirationBadge(product.expires_on);

                return (
                  <button
                    key={product.id}
                    type="button"
                    className="btn btn-outline h-auto min-h-24 flex-col items-start p-3 text-left normal-case"
                    disabled={product.stock_quantity < 1}
                    onClick={() => addToCart(product)}
                  >
                    <span className="font-semibold text-sm leading-tight">
                      {product.name}
                    </span>
                    <span className="text-lg font-bold mt-1">
                      {formatCents(product.price_cents)}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-2">
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
                      {exp && (
                        <span
                          className={`badge badge-xs ${
                            exp.tone === "error" ? "badge-error" : "badge-warning"
                          }`}
                        >
                          {exp.label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cart */}
        <section className="card bg-base-100 shadow-sm border border-base-300 lg:col-span-4">
          <div className="card-body gap-3">
            <h2 className="card-title text-base">Cart</h2>

            {cart.length === 0 ? (
              <p className="text-sm text-base-content/60 py-8 text-center">
                Tap products to add them here.
              </p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map((line) => (
                  <li
                    key={line.product.id}
                    className="flex items-center justify-between gap-2 rounded-box border border-base-300 p-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {line.product.name}
                      </p>
                      <p className="text-xs text-base-content/60">
                        {formatCents(line.product.price_cents)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="btn btn-xs btn-square"
                        onClick={() => updateQty(line.product.id, -1)}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        type="button"
                        className="btn btn-xs btn-square"
                        onClick={() => updateQty(line.product.id, 1)}
                      >
                        +
                      </button>
                      <span className="w-16 text-right text-sm font-semibold">
                        {formatCents(line.product.price_cents * line.quantity)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="divider my-0" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCents(subtotalCents)}</span>
              </div>
              {taxCents > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCents(taxCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCents(totalCents)}</span>
              </div>
            </div>

            <div className="join w-full">
              <button
                type="button"
                className={`btn join-item flex-1 ${paymentMethod === "cash" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setPaymentMethod("cash")}
              >
                Cash
              </button>
              {savedCardEnabled && (
                <button
                  type="button"
                  className={`btn join-item flex-1 ${paymentMethod === "saved_card" ? "btn-primary" : "btn-outline"}`}
                  disabled={!hasSavedCard}
                  onClick={() => setPaymentMethod("saved_card")}
                >
                  Card on file
                </button>
              )}
              {stripeEnabled && (
                <button
                  type="button"
                  className={`btn join-item flex-1 ${paymentMethod === "card" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setPaymentMethod("card")}
                >
                  Card
                </button>
              )}
            </div>

            {error && (
              <div className="alert alert-error text-sm py-2">{error}</div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-lg w-full"
              disabled={busy || cart.length === 0}
              onClick={handleCheckoutClick}
            >
              {busy ? "Processing…" : "Complete sale"}
            </button>
          </div>
        </section>
      </div>

      {cardClientSecret && stripePromise && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Pay with card</h3>
            <Elements stripe={stripePromise} options={{ clientSecret: cardClientSecret }}>
              <CardCheckoutForm
                clientSecret={cardClientSecret}
                onCancel={() => {
                  setCardClientSecret(null);
                  setCardPaymentIntentId(null);
                  setPaymentMethod("cash");
                }}
                onSuccess={(paymentIntentId) => finalizeCheckout(paymentIntentId)}
              />
            </Elements>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              onClick={() => {
                setCardClientSecret(null);
                setPaymentMethod("cash");
              }}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
