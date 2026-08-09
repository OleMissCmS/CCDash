import { NextResponse } from "next/server";
import { requirePosUser } from "@/lib/pos/auth";
import { completeCheckout, listOrders } from "@/lib/pos/store";

type CheckoutBody = {
  patient_id?: string | null;
  items: { product_id: string; quantity: number }[];
  payment_method: "cash" | "card" | "saved_card";
  payment_intent_id?: string;
};

export async function POST(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = (await request.json()) as CheckoutBody;

  if (!body.items?.length) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  if (!["cash", "card", "saved_card"].includes(body.payment_method)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  try {
    const result = await completeCheckout({
      patient_id: body.patient_id,
      items: body.items,
      payment_method: body.payment_method,
      payment_intent_id: body.payment_intent_id,
      staff_id: user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed.";
    const status = message.includes("Stripe") || message.includes("Card") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const orders = await listOrders(limit);
  return NextResponse.json({ orders });
}
