import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taukei",
    short_name: "Taukei",
    description: "Direct food ordering foundation for Malaysian merchants.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f9ff",
    theme_color: "#b52330",
    icons: [
      {
        src: "/taukelogo.png",
        sizes: "1024x1024",
        type: "image/png"
      }
    ]
  };
}
