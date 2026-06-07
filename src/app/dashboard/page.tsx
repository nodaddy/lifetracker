import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { signOutAction } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    [user.user_metadata.first_name, user.user_metadata.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "User";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="neon-title text-3xl font-semibold">{displayName}</h1>
        </div>
        <form action={signOutAction}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      <section className="mt-8">
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="retro-tile rounded-lg p-4">
            <h2 className="text-lg font-semibold text-fuchsia-100">Financial Life</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Track money habits, savings, investments, and financial goals.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/financial-life">Open</Link>
              </Button>
            </div>
          </div>

          <div className="retro-tile rounded-lg p-4">
            <h2 className="text-lg font-semibold text-fuchsia-100">Daily Routine</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Track daily habits, consistency, and routine quality.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/daily-routine">Open</Link>
              </Button>
            </div>
          </div>

          <div className="retro-tile rounded-lg p-4">
            <h2 className="text-lg font-semibold text-fuchsia-100">Professional Life</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Track career goals, work progress, and skill development.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/professional-life">Open</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
