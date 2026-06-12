import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalNavbar } from "../components/conditional-navbar";

export const metadata: Metadata = {
  applicationName: "Taukei",
  title: {
    default: "Taukei | Merchant-owned food ordering",
    template: "%s | Taukei"
  },
  description: "Taukei helps Malaysian independent food merchants run direct storefronts with safe sandbox checkout and delivery foundations.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Taukei"
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#b52330",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-MY">
      <body>
        <ConditionalNavbar />
        {children}
      </body>
    </html>
  );
}
