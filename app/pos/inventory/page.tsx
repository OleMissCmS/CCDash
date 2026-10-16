import { InventoryManager } from "@/components/pos/InventoryManager";
import { listProducts } from "@/lib/pos/store";

export default async function InventoryPage() {
  const products = await listProducts({ activeOnly: false });
  return <InventoryManager initialProducts={products} />;
}
