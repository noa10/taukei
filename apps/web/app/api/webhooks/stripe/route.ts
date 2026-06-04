import { getServiceRoleSupabaseBoundary, assertWebhookServiceRoleCaller } from "../../../../lib/supabase/service";
import { processDeterministicStripeWebhook } from "../../../../lib/webhooks/stripe";

export async function POST(request: Request) {
  const serviceBoundary = getServiceRoleSupabaseBoundary("stripe-webhook");
  assertWebhookServiceRoleCaller(serviceBoundary, "stripe-webhook");

  const payload = await request.text();
  const result = await processDeterministicStripeWebhook(payload, request.headers.get("stripe-signature"));

  return Response.json(
    {
      ...result,
      serviceRoleBoundary: serviceBoundary.kind
    },
    { status: result.accepted ? 200 : 400 }
  );
}
