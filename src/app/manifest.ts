import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/config/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "LTrack",
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#080513",
    theme_color: "#080513",
    orientation: "portrait",
    icons: [
      {
        src: "/pwa/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
