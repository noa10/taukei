import { Card, SectionHeader } from "../../../components/primitives";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="shell customer-shell">
      <SectionHeader eyebrow="Account" title="Create account" body="Sign up with email and password." />
      <Card>
        <SignUpForm />
      </Card>
    </div>
  );
}
