import { Card, SectionHeader } from "../../../components/primitives";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="shell customer-shell">
      <SectionHeader eyebrow="Account" title="Reset password" body="Enter your new password below." />
      <Card>
        <ResetPasswordForm />
      </Card>
    </div>
  );
}
