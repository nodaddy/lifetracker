import Link from "next/link";
import { redirect } from "next/navigation";

import { AssetsManager } from "@/components/financial/assets-manager";
import { Button } from "@/components/ui/button";
import { fetchUserGoalsForList } from "@/lib/financial/goals";
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

  const [goalsResult, snapshotResult, eventResult, goalLinksResult] = await Promise.all([
    fetchUserGoalsForList(supabase, user.id),
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
      .from("financial_goal_assets")
      .select("goal_id,asset_id,allocated_amount")
      .eq("user_id", user.id),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-6 pt-0 sm:px-6 sm:pb-10">
      <section>
        <AssetsManager
          initialAssets={assets ?? []}
          initialSnapshots={snapshotResult.data ?? []}
          initialEvents={eventResult.data ?? []}
          initialGoals={goalsResult.data ?? []}
          initialGoalAssetLinks={goalLinksResult.data ?? []}
        />
      </section>
    </main>
  );
}
