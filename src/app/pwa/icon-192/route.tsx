import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          color: "#fafafa",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.04em",
        }}
      >
        LT
      </div>
    ),
    {
      width: 192,
      height: 192,
    },
  );

  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
