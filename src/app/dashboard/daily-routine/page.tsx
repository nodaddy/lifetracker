import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function DailyRoutinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center gap-3">
        <h1 className="neon-title text-3xl font-semibold">Daily Routine</h1>
      </div>

      <section className="retro-panel mt-6 rounded-xl p-6">
        <p className="text-zinc-200">
          Your base page for tracking habits, streaks, and routine discipline every day.
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Base ready. We can now build this module step-by-step.
        </p>
      </section>
    </main>
  );
}
