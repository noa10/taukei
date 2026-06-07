import { notFound } from "next/navigation";
import { getPublicStorefrontBySlug } from "../../../../lib/data-access";
import { CheckoutView } from "./checkout-view";

interface PageProps {
  params: Promise<{ "merchant-slug": string }>;
}

export default async function CheckoutPage({ params }: PageProps) {
  const { "merchant-slug": slug } = await params;
  const { merchant, catalog } = await getPublicStorefrontBySlug(slug);

  if (!merchant) {
    notFound();
  }

  return <CheckoutView merchant={merchant} catalog={catalog} />;
}
