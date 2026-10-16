"use client";

import { useEffect, useRef } from "react";
import { formatCents } from "@/lib/pos/money";
import type { CheckoutResult } from "@/lib/pos/types";

type ReceiptPrintProps = {
  result: CheckoutResult;
  onClose: () => void;
};

export function ReceiptPrint({ result, onClose }: ReceiptPrintProps) {
  const printed = useRef(false);

  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);

  const patientName = result.patient
    ? `${result.patient.first_name} ${result.patient.last_name}`
    : "Walk-in";

  return (
    <>
      <dialog className="modal modal-open print:hidden">
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-lg">Sale complete</h3>
          <p className="py-2 text-sm">
            Order #{result.order.order_number} — receipt sent to printer.
          </p>
          {result.patient && result.order.points_earned > 0 && (
            <p className="text-sm text-success">
              +{result.order.points_earned} points earned (
              {result.patient.loyalty_points} total)
            </p>
          )}
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => window.print()}>
              Print again
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              New sale
            </button>
          </div>
        </div>
      </dialog>

      <div className="receipt-print hidden print:block p-6 text-sm text-black">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">{result.clinic_name}</h1>
          <p>Product receipt</p>
          <p>Order #{result.order.order_number}</p>
          <p>{new Date(result.order.created_at).toLocaleString()}</p>
        </div>
        <p className="mb-3">Patient: {patientName}</p>
        <table className="w-full mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-1">Item</th>
              <th className="text-right py-1">Qty</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1">{item.product_name}</td>
                <td className="text-right py-1">{item.quantity}</td>
                <td className="text-right py-1">
                  {formatCents(item.line_total_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-black pt-2 space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCents(result.order.subtotal_cents)}</span>
          </div>
          {result.order.tax_cents > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatCents(result.order.tax_cents)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{formatCents(result.order.total_cents)}</span>
          </div>
          <div className="flex justify-between capitalize">
            <span>Payment</span>
            <span>{result.order.payment_method.replace("_", " ")}</span>
          </div>
          {result.order.points_earned > 0 && (
            <div className="flex justify-between">
              <span>Points earned</span>
              <span>{result.order.points_earned}</span>
            </div>
          )}
        </div>
        <p className="text-center mt-6 text-xs">Thank you for your purchase.</p>
      </div>
    </>
  );
}
