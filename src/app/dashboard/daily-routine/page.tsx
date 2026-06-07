import { redirect } from "next/navigation";

import { HabitsManager } from "@/components/routine/habits-manager";
import { createClient } from "@/lib/supabase/server";

export default async function DailyRoutinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: habits } = await supabase
    .from("routine_habits")
    .select("id,name,frequency,schedule_days,time_of_day,notes,sort_order,updated_at")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <HabitsManager initialHabits={habits ?? []} />
    </main>
  );
}
