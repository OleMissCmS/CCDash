import { formatCents } from "@/lib/pos/money";

type OrderRow = {
  id: string;
  order_number: number;
  total_cents: number;
  payment_method: string;
  points_earned: number;
  created_at: string;
  pos_patients:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
  pos_order_items: { product_name: string; quantity: number }[];
};

function patientName(
  patient: OrderRow["pos_patients"]
): string | null {
  if (!patient) return null;
  const row = Array.isArray(patient) ? patient[0] : patient;
  if (!row) return null;
  return `${row.first_name} ${row.last_name}`;
}

export function OrdersList({ orders }: { orders: OrderRow[] }) {
  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6">
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Recent sales</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-base-content/60">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-base-300">
              {orders.map((order) => {
                const patient = patientName(order.pos_patients) ?? "Walk-in";
                const items = order.pos_order_items
                  .map((i) => `${i.quantity}× ${i.product_name}`)
                  .join(", ");

                return (
                  <li key={order.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <div>
                      <p className="font-medium">
                        #{order.order_number} · {patient}
                      </p>
                      <p className="text-sm text-base-content/70">{items}</p>
                      <p className="text-xs text-base-content/50">
                        {new Date(order.created_at).toLocaleString()} ·{" "}
                        {order.payment_method.replace("_", " ")}
                        {order.points_earned > 0 &&
                          ` · +${order.points_earned} pts`}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCents(order.total_cents)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
