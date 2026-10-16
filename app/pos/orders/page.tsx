import { OrdersList } from "@/components/pos/OrdersList";
import { listOrders } from "@/lib/pos/store";

export default async function OrdersPage() {
  const orders = await listOrders(50);
  return <OrdersList orders={orders ?? []} />;
}
