import { Suspense } from "react";
import { Card, SectionHeader } from "../../../components/primitives";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="shell customer-shell">
      <SectionHeader eyebrow="Account" title="Sign in" body="Sign in with your email and password, or use Google." />
      <Card>
        <Suspense>
          <LoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
