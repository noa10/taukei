import { getServiceRoleSupabaseBoundary, assertWebhookServiceRoleCaller } from "../../../../lib/supabase/service";
import { processDeterministicLalamoveWebhook } from "../../../../lib/webhooks/lalamove";

export async function POST(request: Request) {
  const serviceBoundary = getServiceRoleSupabaseBoundary("lalamove-webhook");
  assertWebhookServiceRoleCaller(serviceBoundary, "lalamove-webhook");

  const payload = await request.text();
  const signature = request.headers.get("lalamove-signature") ?? request.headers.get("x-lalamove-signature");
  const result = await processDeterministicLalamoveWebhook(payload, signature);

  return Response.json(
    {
      ...result,
      serviceRoleBoundary: serviceBoundary.kind
    },
    { status: result.accepted ? 200 : 400 }
  );
}
