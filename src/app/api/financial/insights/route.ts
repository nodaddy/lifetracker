import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [snapshotResult, eventResult] = await Promise.all([
    supabase
      .from("financial_portfolio_snapshots")
      .select("snapshot_date,total_current_value")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true })
      .limit(180),
    supabase
      .from("financial_asset_events")
      .select("action,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (snapshotResult.error || eventResult.error) {
    const rawMessage = snapshotResult.error?.message ?? eventResult.error?.message ?? "Failed to load insights.";
    return NextResponse.json(
      {
        ok: false,
        error: process.env.NODE_ENV === "development" ? rawMessage : "Failed to load insights.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    snapshots: snapshotResult.data ?? [],
    events: eventResult.data ?? [],
  });
}
