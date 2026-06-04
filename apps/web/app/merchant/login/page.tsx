import { Badge, ButtonLink, Card, SectionHeader } from "../../../components/primitives";
import { getDemoMerchantSession } from "../../../lib/supabase/session";

export const metadata = { title: "Merchant stub login" };

export default function MerchantLoginPage() {
  const stubMerchantSession = getDemoMerchantSession();
  return (
    <main className="shell customer-shell">
      <SectionHeader eyebrow="Stub auth" title="Merchant login" body="Local-only auth stub for G005. Supabase Auth wiring is deferred; tenant scope is explicit and visible." />
      <Card>
        <Badge tone="salmon">{stubMerchantSession.authMode}</Badge>
        <h2>Continue as {stubMerchantSession.email}</h2>
        <p>Role: {stubMerchantSession.role}. Tenant: {stubMerchantSession.tenantScope}.</p>
        <p className="safe-copy">This login does not create a production session or bypass RLS; it is a local surface for testing merchant flows.</p>
        <div className="actions"><ButtonLink href="/merchant">Enter dashboard</ButtonLink></div>
      </Card>
    </main>
  );
}
