import { Card, SectionHeader } from "../../../components/primitives";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="shell customer-shell">
      <SectionHeader eyebrow="Account" title="Forgot password" body="Enter your email to receive a password reset link." />
      <Card>
        <ForgotPasswordForm />
      </Card>
    </div>
  );
}
