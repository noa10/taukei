import { Card, SectionHeader } from "../../../components/primitives";
import { AccountView } from "./account-view";
import { getCurrentProfile } from "../../../lib/supabase/auth";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const result = await getCurrentProfile();

  return (
    <div className="shell customer-shell">
      <SectionHeader eyebrow="Account" title="Your account" body="Manage your profile and settings." />
      <Card>
        {result.status === "ok" && result.profile ? (
          <AccountView profile={result.profile} />
        ) : (
          <p className="field-error">
            {result.status === "boundary-stubbed"
              ? "Supabase is not configured. Set environment variables to enable auth."
              : result.status === "auth-error"
                ? result.message
                : "Please sign in to view your account."}
          </p>
        )}
      </Card>
    </div>
  );
}
