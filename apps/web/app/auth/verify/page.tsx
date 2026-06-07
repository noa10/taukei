import { Card, SectionHeader } from "../../../components/primitives";

export const metadata = { title: "Verify your email" };

export default function VerifyPage() {
  return (
    <div className="shell customer-shell">
      <SectionHeader eyebrow="Account" title="Check your email" body="We sent a confirmation link to your email address. Click the link to verify your account, then you can sign in." />
      <Card>
        <p className="safe-copy">
          If you don&apos;t see the email, check your spam folder. You can request a new link from the sign-up page.
        </p>
        <div style={{ marginTop: 16 }}>
          <a className="button secondary" href="/login">Back to sign in</a>
        </div>
      </Card>
    </div>
  );
}
