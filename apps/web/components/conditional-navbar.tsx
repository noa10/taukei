"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

export function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on merchant routes (desktop only; mobile shows it via CSS override)
  const isMerchantRoute = pathname?.startsWith("/merchant");
  
  if (isMerchantRoute) {
    return null;
  }
  
  return <Navbar />;
}
