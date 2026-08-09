import { NextResponse } from "next/server";
import { requirePosUser } from "@/lib/pos/auth";
import { isLocalPos } from "@/lib/pos/config";
import { calcTaxCents } from "@/lib/pos/money";
import type { PosProduct } from "@/lib/pos/types";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

type PaymentIntentBody = {
  patient_id?: string | null;
  items: { product_id: string; quantity: number }[];
};

export async function POST(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (isLocalPos()) {
    return NextResponse.json(
      { error: "Use cash or card-on-file in local mode." },
      { status: 503 }
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as PaymentIntentBody;
  if (!body.items?.length) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const supabase = await createClient();
  const productIds = body.items.map((item) => item.product_id);
  const { data: products, error: productsError } = await supabase
    .from("pos_products")
    .select("*")
    .in("id", productIds)
    .eq("is_active", true);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productMap = new Map(
    (products as PosProduct[]).map((product) => [product.id, product])
  );

  let subtotalCents = 0;
  for (const item of body.items) {
    const product = productMap.get(item.product_id);
    if (!product || item.quantity < 1) {
      return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
    }
    subtotalCents += product.price_cents * item.quantity;
  }

  const { data: settings } = await supabase
    .from("pos_clinic_settings")
    .select("tax_rate_bps")
    .limit(1)
    .maybeSingle();

  const totalCents =
    subtotalCents + calcTaxCents(subtotalCents, settings?.tax_rate_bps ?? 0);

  const stripe = getStripe();
  const intentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
    amount: totalCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      pos_checkout: "true",
      patient_id: body.patient_id ?? "",
    },
  };

  if (body.patient_id) {
    const { data: patient } = await supabase
      .from("pos_patients")
      .select("stripe_customer_id, email, first_name, last_name")
      .eq("id", body.patient_id)
      .maybeSingle();

    if (patient?.stripe_customer_id) {
      intentParams.customer = patient.stripe_customer_id;
    } else if (patient) {
      const customer = await stripe.customers.create({
        name: `${patient.first_name} ${patient.last_name}`,
        email: patient.email ?? undefined,
        metadata: { pos_patient_id: body.patient_id },
      });

      await supabase
        .from("pos_patients")
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.patient_id);

      intentParams.customer = customer.id;
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams);

  return NextResponse.json({
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
    total_cents: totalCents,
  });
}
