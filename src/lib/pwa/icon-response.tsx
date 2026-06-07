import { ImageResponse } from "next/og";

import { AppIconMarkup } from "@/lib/pwa/app-icon-markup";

export function createAppIconResponse(size: number, rounded = false) {
  return new ImageResponse(<AppIconMarkup size={size} rounded={rounded} />, {
    width: size,
    height: size,
  });
}

export function createAppIconPngResponse(size: number, rounded = false) {
  const image = createAppIconResponse(size, rounded);

  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
