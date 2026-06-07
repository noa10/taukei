import type { Metadata } from "next";
import { CartProvider } from "../../components/storefront/cart-context";

export const metadata: Metadata = {
  title: {
    default: "Menu",
    template: "%s | Taukei"
  }
};

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
