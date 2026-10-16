import { CheckoutScreen } from "@/components/pos/CheckoutScreen";
import { getSettings, listProducts } from "@/lib/pos/store";

export default async function PosCheckoutPage() {
  const [products, settings] = await Promise.all([
    listProducts({ activeOnly: true }),
    getSettings(),
  ]);

  return (
    <CheckoutScreen initialProducts={products} settings={settings} />
  );
}
