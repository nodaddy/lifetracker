import { createAppIconPngResponse } from "@/lib/pwa/icon-response";

export const dynamic = "force-static";

export async function GET() {
  return createAppIconPngResponse(512);
}
