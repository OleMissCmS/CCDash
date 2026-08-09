import { promises as fs } from "fs";
import path from "path";
import {
  calcPointsEarned,
  calcTaxCents,
} from "@/lib/pos/money";
import type {
  CheckoutResult,
  PatientInput,
  PosClinicSettings,
  PosOrder,
  PosOrderItem,
  PosPatient,
  PosProduct,
  ProductInput,
} from "@/lib/pos/types";

const DATA_DIR = path.join(process.cwd(), "data", "pos");

type LocalMeta = { next_order_number: number };

type LocalDb = {
  settings: PosClinicSettings;
  products: PosProduct[];
  patients: PosPatient[];
  orders: PosOrder[];
  orderItems: PosOrderItem[];
  meta: LocalMeta;
};

function now(): string {
  return new Date().toISOString();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedDb(): LocalDb {
  const settings: PosClinicSettings = {
    id: crypto.randomUUID(),
    clinic_name: "Wellness Clinic",
    tax_rate_bps: 0,
    points_per_dollar: 1,
  };

  const products: PosProduct[] = [
    {
      id: crypto.randomUUID(),
      name: "Vitamin D3 5000 IU",
      sku: "VIT-D3-5K",
      price_cents: 2499,
      stock_quantity: 24,
      low_stock_threshold: 5,
      expires_on: addDays(180),
      category: "Vitamins",
      is_active: true,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Omega-3 Fish Oil",
      sku: "OMG-3-1000",
      price_cents: 3299,
      stock_quantity: 18,
      low_stock_threshold: 5,
      expires_on: addDays(120),
      category: "Vitamins",
      is_active: true,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Magnesium Glycinate",
      sku: "MAG-GLY-400",
      price_cents: 2799,
      stock_quantity: 8,
      low_stock_threshold: 5,
      expires_on: addDays(90),
      category: "Minerals",
      is_active: true,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Probiotic 50B",
      sku: "PROB-50B",
      price_cents: 4499,
      stock_quantity: 3,
      low_stock_threshold: 5,
      expires_on: addDays(60),
      category: "Digestive",
      is_active: true,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: crypto.randomUUID(),
      name: "Collagen Peptides",
      sku: "COL-PEP-20",
      price_cents: 3999,
      stock_quantity: 12,
      low_stock_threshold: 5,
      expires_on: addDays(200),
      category: "Protein",
      is_active: true,
      created_at: now(),
      updated_at: now(),
    },
  ];

  return {
    settings,
    products,
    patients: [],
    orders: [],
    orderItems: [],
    meta: { next_order_number: 1001 },
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readDb(): Promise<LocalDb> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, "db.json");

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as LocalDb;
  } catch {
    const db = seedDb();
    await writeDb(db);
    return db;
  }
}

async function writeDb(db: LocalDb) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, "db.json");
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}

function matchesQuery(patient: PosPatient, q: string): boolean {
  const hay = `${patient.first_name} ${patient.last_name} ${patient.phone ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

export async function localGetSettings(): Promise<PosClinicSettings> {
  const db = await readDb();
  return db.settings;
}

export async function localListProducts(options?: {
  activeOnly?: boolean;
  q?: string;
}): Promise<PosProduct[]> {
  const db = await readDb();
  let products = [...db.products];

  if (options?.activeOnly !== false) {
    products = products.filter((p) => p.is_active);
  }

  if (options?.q?.trim()) {
    const q = options.q.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false)
    );
  }

  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export async function localCreateProduct(input: ProductInput): Promise<PosProduct> {
  const db = await readDb();
  const product: PosProduct = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    sku: input.sku.trim().toUpperCase(),
    price_cents: input.price_cents,
    stock_quantity: input.stock_quantity ?? 0,
    low_stock_threshold: input.low_stock_threshold ?? 5,
    expires_on: input.expires_on ?? null,
    category: input.category?.trim() || null,
    is_active: input.is_active ?? true,
    created_at: now(),
    updated_at: now(),
  };

  if (db.products.some((p) => p.sku === product.sku)) {
    throw new Error("SKU already exists.");
  }

  db.products.push(product);
  await writeDb(db);
  return product;
}

export async function localUpdateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<PosProduct> {
  const db = await readDb();
  const index = db.products.findIndex((p) => p.id === id);
  if (index < 0) throw new Error("Product not found.");

  const current = db.products[index];
  const updated: PosProduct = {
    ...current,
    name: input.name?.trim() ?? current.name,
    sku: input.sku?.trim().toUpperCase() ?? current.sku,
    price_cents: input.price_cents ?? current.price_cents,
    stock_quantity: input.stock_quantity ?? current.stock_quantity,
    low_stock_threshold: input.low_stock_threshold ?? current.low_stock_threshold,
    expires_on: input.expires_on !== undefined ? input.expires_on || null : current.expires_on,
    category:
      input.category !== undefined ? input.category?.trim() || null : current.category,
    is_active: input.is_active ?? current.is_active,
    updated_at: now(),
  };

  db.products[index] = updated;
  await writeDb(db);
  return updated;
}

export async function localListPatients(q?: string): Promise<PosPatient[]> {
  const db = await readDb();
  let patients = [...db.patients];

  if (q?.trim()) {
    patients = patients.filter((p) => matchesQuery(p, q.trim()));
  }

  return patients.sort((a, b) => {
    const last = a.last_name.localeCompare(b.last_name);
    return last !== 0 ? last : a.first_name.localeCompare(b.first_name);
  });
}

export async function localCreatePatient(input: PatientInput): Promise<PosPatient> {
  const db = await readDb();
  const patient: PosPatient = {
    id: crypto.randomUUID(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    stripe_customer_id: null,
    stripe_default_payment_method_id: null,
    loyalty_points: 0,
    notes: input.notes?.trim() || null,
    created_at: now(),
    updated_at: now(),
  };

  db.patients.push(patient);
  await writeDb(db);
  return patient;
}

export async function localUpdatePatient(
  id: string,
  input: Partial<PatientInput>
): Promise<PosPatient> {
  const db = await readDb();
  const index = db.patients.findIndex((p) => p.id === id);
  if (index < 0) throw new Error("Patient not found.");

  const current = db.patients[index];
  const updated: PosPatient = {
    ...current,
    first_name: input.first_name?.trim() ?? current.first_name,
    last_name: input.last_name?.trim() ?? current.last_name,
    phone: input.phone !== undefined ? input.phone?.trim() || null : current.phone,
    email: input.email !== undefined ? input.email?.trim() || null : current.email,
    notes: input.notes !== undefined ? input.notes?.trim() || null : current.notes,
    updated_at: now(),
  };

  db.patients[index] = updated;
  await writeDb(db);
  return updated;
}

export async function localGetPatient(id: string): Promise<PosPatient | null> {
  const db = await readDb();
  return db.patients.find((p) => p.id === id) ?? null;
}

export async function localListOrders(limit = 50) {
  const db = await readDb();
  const orders = [...db.orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);

  return orders.map((order) => ({
    ...order,
    pos_order_items: db.orderItems.filter((item) => item.order_id === order.id),
    pos_patients: order.patient_id
      ? db.patients.find((p) => p.id === order.patient_id) ?? null
      : null,
  }));
}

export async function localCompleteCheckout(input: {
  patient_id?: string | null;
  items: { product_id: string; quantity: number }[];
  payment_method: "cash" | "card" | "saved_card";
  staff_id: string;
}): Promise<CheckoutResult> {
  const db = await readDb();

  if (input.payment_method === "saved_card") {
    if (!input.patient_id) throw new Error("Patient is required for card on file.");
    const p = db.patients.find((x) => x.id === input.patient_id);
    if (!p?.stripe_default_payment_method_id) {
      throw new Error("Patient has no card on file.");
    }
  } else if (input.payment_method !== "cash") {
    throw new Error("Local mode supports cash and card-on-file only.");
  }

  const productMap = new Map(db.products.map((p) => [p.id, p]));

  let subtotalCents = 0;
  const lineItems: {
    product: PosProduct;
    quantity: number;
    lineTotalCents: number;
  }[] = [];

  for (const item of input.items) {
    const product = productMap.get(item.product_id);
    if (!product || !product.is_active) {
      throw new Error("One or more products are unavailable.");
    }
    if (item.quantity < 1) throw new Error("Invalid quantity.");
    if (product.stock_quantity < item.quantity) {
      throw new Error(`Not enough stock for ${product.name}.`);
    }

    const lineTotalCents = product.price_cents * item.quantity;
    subtotalCents += lineTotalCents;
    lineItems.push({ product, quantity: item.quantity, lineTotalCents });
  }

  const taxCents = calcTaxCents(subtotalCents, db.settings.tax_rate_bps);
  const totalCents = subtotalCents + taxCents;
  const pointsEarned = calcPointsEarned(totalCents, db.settings.points_per_dollar);

  let patient: PosPatient | null = null;
  if (input.patient_id) {
    patient = db.patients.find((p) => p.id === input.patient_id) ?? null;
    if (!patient) throw new Error("Patient not found.");
  }

  const orderId = crypto.randomUUID();
  const order: PosOrder = {
    id: orderId,
    order_number: db.meta.next_order_number,
    patient_id: input.patient_id ?? null,
    staff_id: input.staff_id,
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    total_cents: totalCents,
    payment_method: input.payment_method,
    stripe_payment_intent_id: null,
    points_earned: pointsEarned,
    status: "completed",
    created_at: now(),
  };

  const items: PosOrderItem[] = lineItems.map(({ product, quantity, lineTotalCents }) => ({
    id: crypto.randomUUID(),
    order_id: orderId,
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    quantity,
    unit_price_cents: product.price_cents,
    line_total_cents: lineTotalCents,
  }));

  db.meta.next_order_number += 1;
  db.orders.push(order);
  db.orderItems.push(...items);

  for (const { product, quantity } of lineItems) {
    const index = db.products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      db.products[index] = {
        ...db.products[index],
        stock_quantity: db.products[index].stock_quantity - quantity,
        updated_at: now(),
      };
    }
  }

  if (patient && pointsEarned > 0) {
    const index = db.patients.findIndex((p) => p.id === patient!.id);
    db.patients[index] = {
      ...db.patients[index],
      loyalty_points: db.patients[index].loyalty_points + pointsEarned,
      updated_at: now(),
    };
    patient = db.patients[index];
  }

  await writeDb(db);

  return {
    order,
    items,
    patient,
    clinic_name: db.settings.clinic_name,
  };
}

export async function localMarkCardOnFile(patientId: string): Promise<PosPatient> {
  const db = await readDb();
  const index = db.patients.findIndex((p) => p.id === patientId);
  if (index < 0) throw new Error("Patient not found.");

  db.patients[index] = {
    ...db.patients[index],
    stripe_customer_id: `local_${patientId}`,
    stripe_default_payment_method_id: `local_pm_${patientId}`,
    updated_at: now(),
  };

  await writeDb(db);
  return db.patients[index];
}
