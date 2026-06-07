import { notFound } from "next/navigation";
import { getOrderTrackingByPublicRef } from "../../../../lib/data-access";
import { TrackOrderView } from "./track-order-view";

interface PageProps {
  params: Promise<{ publicRef: string }>;
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { publicRef } = await params;
  const { order, merchant } = await getOrderTrackingByPublicRef(publicRef);

  if (!order) {
    notFound();
  }

  return <TrackOrderView order={order} merchant={merchant} />;
}
