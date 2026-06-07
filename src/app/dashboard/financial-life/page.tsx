import Link from "next/link";
import { redirect } from "next/navigation";

import { AssetsManager } from "@/components/financial/assets-manager";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function FinancialLifePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assets } = await supabase
    .from("financial_assets")
    .select("id,name,category,current_value,goal_id,notes,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const [snapshotResult, eventResult, goalResult] = await Promise.all([
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
    supabase
      .from("financial_goals")
      .select("id,title,target_amount,current_amount,target_date,notes,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <section>
        <AssetsManager
          initialAssets={assets ?? []}
          initialSnapshots={snapshotResult.data ?? []}
          initialEvents={eventResult.data ?? []}
          initialGoals={goalResult.data ?? []}
        />
      </section>
    </main>
  );
}
