import { NextResponse } from "next/server";
import { requirePosUser } from "@/lib/pos/auth";
import { isLocalPos } from "@/lib/pos/config";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (isLocalPos()) {
    return NextResponse.json(
      { error: "Card setup uses local mode on the Patients page." },
      { status: 503 }
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { patient_id } = (await request.json()) as { patient_id: string };
  if (!patient_id) {
    return NextResponse.json({ error: "patient_id is required." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await supabase
    .from("pos_patients")
    .select("*")
    .eq("id", patient_id)
    .single();

  if (patientError || !patient) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const stripe = getStripe();
  let customerId = patient.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: `${patient.first_name} ${patient.last_name}`,
      email: patient.email ?? undefined,
      phone: patient.phone ?? undefined,
      metadata: { pos_patient_id: patient.id },
    });
    customerId = customer.id;

    await supabase
      .from("pos_patients")
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patient.id);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { pos_patient_id: patient.id },
  });

  return NextResponse.json({
    client_secret: setupIntent.client_secret,
    customer_id: customerId,
  });
}

export async function PATCH(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (isLocalPos()) {
    return NextResponse.json({ error: "Not available in local mode." }, { status: 503 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const supabase = await createClient();

  const { patient_id, payment_method_id } = (await request.json()) as {
    patient_id: string;
    payment_method_id: string;
  };

  if (!patient_id || !payment_method_id) {
    return NextResponse.json(
      { error: "patient_id and payment_method_id are required." },
      { status: 400 }
    );
  }

  const { data: patient, error: patientError } = await supabase
    .from("pos_patients")
    .select("*")
    .eq("id", patient_id)
    .single();

  if (patientError || !patient?.stripe_customer_id) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const stripe = getStripe();
  await stripe.paymentMethods.attach(payment_method_id, {
    customer: patient.stripe_customer_id,
  });

  await stripe.customers.update(patient.stripe_customer_id, {
    invoice_settings: {
      default_payment_method: payment_method_id,
    },
  });

  const { data: updated, error: updateError } = await supabase
    .from("pos_patients")
    .update({
      stripe_default_payment_method_id: payment_method_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patient_id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ patient: updated });
}
