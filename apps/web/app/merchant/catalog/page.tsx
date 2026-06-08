import { createServerSupabaseClient } from "../../../lib/supabase/server";
import { getServerSupabaseUser } from "../../../lib/supabase/server";
import { getMerchantSession } from "../../../lib/supabase/session";
import CatalogEditor from "./catalog-editor";

export default async function MerchantCatalogPage() {
  const { user } = await getServerSupabaseUser();

  if (!user) {
    return <p className="field-error">Please sign in.</p>;
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return <p className="field-error">Supabase is not configured.</p>;
  }

  const session = await getMerchantSession(client);
  if (!session) {
    return <p>No merchant membership. <a href="/merchant/onboarding">Set up your merchant →</a></p>;
  }

  const merchantId = session.merchantId;

  // Fetch real catalog from Supabase
  const { data: items } = await client
    .from("menu_items")
    .select("id, name, price_cents, is_available, description, image_url, category_id")
    .eq("merchant_id", merchantId)
    .order("sort_order");

  const { data: categories } = await client
    .from("menu_categories")
    .select("id, name")
    .eq("merchant_id", merchantId)
    .eq("is_active", true)
    .order("sort_order");

  // Build a category lookup map
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  // Map items to the shape CatalogEditor expects
  const mappedItems = (items ?? []).map((item) => ({
    id: item.id as string,
    merchantId,
    name: item.name as string,
    priceCents: item.price_cents as number,
    isAvailable: item.is_available as boolean,
    categoryName: categoryMap.get(item.category_id as string) ?? "Uncategorized",
    description: (item.description as string) ?? undefined,
    imageUrl: (item.image_url as string) ?? undefined,
  }));

  const mappedCategories = [...new Set(mappedItems.map((i) => i.categoryName))];

  return (
    <>
      <h1 className="merchant-page-title">Menu Catalog</h1>
      <p className="merchant-page-subtitle">
        Manage your menu items, categories, and availability
      </p>
      <CatalogEditor initialItems={mappedItems} initialCategories={mappedCategories} />
    </>
  );
}
