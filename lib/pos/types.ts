export type PosPatient = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_default_payment_method_id: string | null;
  loyalty_points: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PosProduct = {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  expires_on: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PosClinicSettings = {
  id: string;
  clinic_name: string;
  tax_rate_bps: number;
  points_per_dollar: number;
};

export type PosOrder = {
  id: string;
  order_number: number;
  patient_id: string | null;
  staff_id: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_method: "cash" | "card" | "saved_card";
  stripe_payment_intent_id: string | null;
  points_earned: number;
  status: "completed" | "refunded" | "void";
  created_at: string;
};

export type PosOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type CartLine = {
  product: PosProduct;
  quantity: number;
};

export type CheckoutResult = {
  order: PosOrder;
  items: PosOrderItem[];
  patient: PosPatient | null;
  clinic_name: string;
};

export type PatientInput = {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type ProductInput = {
  name: string;
  sku: string;
  price_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  expires_on?: string | null;
  category?: string | null;
  is_active?: boolean;
};
