import { Suspense } from "react";
import { MerchantLoginForm } from "./merchant-login-form";

export const metadata = { title: "Merchant Login" };

export default function MerchantLoginPage() {
  return (
    <Suspense>
      <MerchantLoginForm />
    </Suspense>
  );
}
