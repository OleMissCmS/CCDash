import { createClient } from "@/lib/supabase/server";
import { isLocalPos } from "@/lib/pos/config";
import * as local from "@/lib/pos/local-store";
import {
  calcPointsEarned,
  calcTaxCents,
} from "@/lib/pos/money";
import type {
  CheckoutResult,
  PatientInput,
  PosClinicSettings,
  PosPatient,
  PosProduct,
  ProductInput,
} from "@/lib/pos/types";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const LOCAL_STAFF_ID = "local-staff";

export async function getSettings(): Promise<PosClinicSettings | null> {
  if (isLocalPos()) return local.localGetSettings();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pos_clinic_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  return data as PosClinicSettings | null;
}

export async function listProducts(options?: {
  activeOnly?: boolean;
  q?: string;
}): Promise<PosProduct[]> {
  if (isLocalPos()) return local.localListProducts(options);
  const supabase = await createClient();
  let query = supabase.from("pos_products").select("*").order("name");
  if (options?.activeOnly !== false) query = query.eq("is_active", true);
  if (options?.q?.trim()) {
    const q = options.q.trim();
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`);
  }
  const { data } = await query;
  return (data as PosProduct[]) ?? [];
}

export async function createProduct(input: ProductInput): Promise<PosProduct> {
  if (isLocalPos()) return local.localCreateProduct(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_products")
    .insert({
      name: input.name.trim(),
      sku: input.sku.trim().toUpperCase(),
      price_cents: input.price_cents,
      stock_quantity: input.stock_quantity ?? 0,
      low_stock_threshold: input.low_stock_threshold ?? 5,
      expires_on: input.expires_on || null,
      category: input.category?.trim() || null,
      is_active: input.is_active ?? true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PosProduct;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<PosProduct> {
  if (isLocalPos()) return local.localUpdateProduct(id, input);
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.sku !== undefined) patch.sku = input.sku.trim().toUpperCase();
  if (input.price_cents !== undefined) patch.price_cents = input.price_cents;
  if (input.stock_quantity !== undefined) patch.stock_quantity = input.stock_quantity;
  if (input.low_stock_threshold !== undefined) {
    patch.low_stock_threshold = input.low_stock_threshold;
  }
  if (input.expires_on !== undefined) patch.expires_on = input.expires_on || null;
  if (input.category !== undefined) patch.category = input.category?.trim() || null;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { data, error } = await supabase
    .from("pos_products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PosProduct;
}

export async function listPatients(q?: string): Promise<PosPatient[]> {
  if (isLocalPos()) return local.localListPatients(q);
  const supabase = await createClient();
  let query = supabase
    .from("pos_patients")
    .select("*")
    .order("last_name")
    .order("first_name")
    .limit(50);
  if (q?.trim()) {
    query = query.or(
      `first_name.ilike.%${q.trim()}%,last_name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`
    );
  }
  const { data } = await query;
  return (data as PosPatient[]) ?? [];
}

export async function createPatient(input: PatientInput): Promise<PosPatient> {
  if (isLocalPos()) return local.localCreatePatient(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_patients")
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PosPatient;
}

export async function updatePatient(
  id: string,
  input: Partial<PatientInput>
): Promise<PosPatient> {
  if (isLocalPos()) return local.localUpdatePatient(id, input);
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.first_name !== undefined) patch.first_name = input.first_name.trim();
  if (input.last_name !== undefined) patch.last_name = input.last_name.trim();
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.email !== undefined) patch.email = input.email?.trim() || null;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from("pos_patients")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PosPatient;
}

export async function listOrders(limit = 50) {
  if (isLocalPos()) return local.localListOrders(limit);
  const supabase = await createClient();
  const { data } = await supabase
    .from("pos_orders")
    .select(
      "id, order_number, total_cents, payment_method, points_earned, created_at, pos_patients(first_name, last_name), pos_order_items(product_name, quantity)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function completeCheckout(input: {
  patient_id?: string | null;
  items: { product_id: string; quantity: number }[];
  payment_method: "cash" | "card" | "saved_card";
  payment_intent_id?: string;
  staff_id: string;
}): Promise<CheckoutResult> {
  if (isLocalPos()) {
    return local.localCompleteCheckout({
      patient_id: input.patient_id,
      items: input.items,
      payment_method: input.payment_method,
      staff_id: input.staff_id,
    });
  }

  const supabase = await createClient();
  const productIds = input.items.map((item) => item.product_id);
  const { data: products, error: productsError } = await supabase
    .from("pos_products")
    .select("*")
    .in("id", productIds)
    .eq("is_active", true);

  if (productsError) throw new Error(productsError.message);

  const productMap = new Map(
    (products as PosProduct[]).map((product) => [product.id, product])
  );

  let subtotalCents = 0;
  const lineItems: {
    product: PosProduct;
    quantity: number;
    lineTotalCents: number;
  }[] = [];

  for (const item of input.items) {
    const product = productMap.get(item.product_id);
    if (!product) throw new Error("One or more products are unavailable.");
    if (item.quantity < 1) throw new Error("Invalid quantity.");
    if (product.stock_quantity < item.quantity) {
      throw new Error(`Not enough stock for ${product.name}.`);
    }
    const lineTotalCents = product.price_cents * item.quantity;
    subtotalCents += lineTotalCents;
    lineItems.push({ product, quantity: item.quantity, lineTotalCents });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("pos_clinic_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (settingsError) throw new Error(settingsError.message);

  const taxCents = calcTaxCents(subtotalCents, settings?.tax_rate_bps ?? 0);
  const totalCents = subtotalCents + taxCents;
  const pointsEarned = calcPointsEarned(
    totalCents,
    Number(settings?.points_per_dollar ?? 1)
  );

  let patient: PosPatient | null = null;
  if (input.patient_id) {
    const { data: patientData, error: patientError } = await supabase
      .from("pos_patients")
      .select("*")
      .eq("id", input.patient_id)
      .maybeSingle();
    if (patientError) throw new Error(patientError.message);
    patient = patientData as PosPatient | null;
  }

  let stripePaymentIntentId: string | null = null;

  if (input.payment_method !== "cash") {
    if (!isStripeConfigured()) {
      throw new Error("Card payments require STRIPE_SECRET_KEY in environment.");
    }
    const stripe = getStripe();

    if (input.payment_method === "saved_card") {
      if (!patient?.stripe_customer_id || !patient.stripe_default_payment_method_id) {
        throw new Error("Patient has no card on file.");
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: "usd",
        customer: patient.stripe_customer_id,
        payment_method: patient.stripe_default_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { pos_checkout: "true", patient_id: patient.id },
      });
      if (paymentIntent.status !== "succeeded") {
        throw new Error("Card charge did not succeed.");
      }
      stripePaymentIntentId = paymentIntent.id;
    } else {
      if (!input.payment_intent_id) {
        throw new Error("payment_intent_id is required for card checkout.");
      }
      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.payment_intent_id
      );
      if (
        paymentIntent.status !== "succeeded" ||
        paymentIntent.amount !== totalCents
      ) {
        throw new Error("Payment not confirmed or amount mismatch.");
      }
      stripePaymentIntentId = paymentIntent.id;
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("pos_orders")
    .insert({
      patient_id: input.patient_id ?? null,
      staff_id: input.staff_id,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,
      payment_method: input.payment_method,
      stripe_payment_intent_id: stripePaymentIntentId,
      points_earned: pointsEarned,
      status: "completed",
    })
    .select("*")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Failed to create order.");
  }

  const orderItemsPayload = lineItems.map(({ product, quantity, lineTotalCents }) => ({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    quantity,
    unit_price_cents: product.price_cents,
    line_total_cents: lineTotalCents,
  }));

  const { data: orderItems, error: itemsError } = await supabase
    .from("pos_order_items")
    .insert(orderItemsPayload)
    .select("*");

  if (itemsError) throw new Error(itemsError.message);

  for (const { product, quantity } of lineItems) {
    const { error: stockError } = await supabase
      .from("pos_products")
      .update({
        stock_quantity: product.stock_quantity - quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);
    if (stockError) throw new Error(stockError.message);
  }

  if (patient && pointsEarned > 0) {
    const { error: pointsError } = await supabase
      .from("pos_patients")
      .update({
        loyalty_points: patient.loyalty_points + pointsEarned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", patient.id);
    if (pointsError) throw new Error(pointsError.message);
    patient = { ...patient, loyalty_points: patient.loyalty_points + pointsEarned };
  }

  return {
    order: order as CheckoutResult["order"],
    items: orderItems as CheckoutResult["items"],
    patient,
    clinic_name: settings?.clinic_name ?? "Wellness Clinic",
  };
}

export async function markLocalCardOnFile(patientId: string): Promise<PosPatient> {
  return local.localMarkCardOnFile(patientId);
}
