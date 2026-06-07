import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublicStorefrontBySlug } from "../../../lib/data-access";
import { StorefrontView } from "./storefront-view";

interface PageProps {
  params: Promise<{ "merchant-slug": string }>;
}

export default async function StorefrontPage({ params }: PageProps) {
  const { "merchant-slug": slug } = await params;
  const { merchant, catalog, categories } = await getPublicStorefrontBySlug(slug);

  if (!merchant) {
    notFound();
  }

  return (
    <Suspense>
      <StorefrontView
        merchant={merchant}
        catalog={catalog}
        categories={categories}
        />
    </Suspense>
  );
}
