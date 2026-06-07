import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";

const MODULES = [
  {
    title: "Financial Life",
    accent: "text-cyan-200",
    description:
      "Track net worth, investments, and savings goals. Link assets to goals and watch progress update automatically.",
    href: "/dashboard/financial-life",
  },
  {
    title: "Daily Routine",
    accent: "text-fuchsia-200",
    description:
      "Build consistency with habits and routines that compound. See what you do every day, not just what you plan.",
    href: "/dashboard/daily-routine",
  },
  {
    title: "Professional Life",
    accent: "text-purple-200",
    description:
      "Track career milestones, skills, and long-term work goals. Keep professional growth visible alongside the rest of your life.",
    href: "/dashboard/professional-life",
  },
] as const;

const FEATURES = [
  {
    title: "One dashboard",
    body: "Financial, routine, and career tracking in a single calm home — no switching between apps.",
  },
  {
    title: "Progress over time",
    body: "Snapshots and history so you can see trends, not just today's number.",
  },
  {
    title: "Private by default",
    body: "Your data is tied to your account with secure phone sign-in. Built for personal use.",
  },
  {
    title: "Mobile-first PWA",
    body: "Install on your phone and use it like a native app, optimized for quick daily check-ins.",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#080513]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-100">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/90">
            Personal life tracker
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.08]">
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent">
              Track the life you&apos;re building.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            {APP_NAME} helps you stay on top of money, habits, and career in one place — minimal
            friction, clear progress, built for daily use.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start tracking free</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mb-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              Three pillars
            </h2>
            <p className="mt-2 text-xl font-semibold text-zinc-100 sm:text-2xl">
              Everything that matters, separated but connected
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {MODULES.map((module) => (
              <div key={module.title} className="retro-panel flex flex-col p-5 sm:p-6">
                <h3 className={`text-lg font-semibold ${module.accent}`}>{module.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-300">
                  {module.description}
                </p>
                <div className="mt-5">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={module.href}>Explore</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mb-10 max-w-xl">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
                Why {APP_NAME}
              </h2>
              <p className="mt-2 text-xl font-semibold text-zinc-100 sm:text-2xl">
                Designed for clarity, not clutter
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="retro-tile p-4 sm:p-5">
                  <h3 className="font-medium text-zinc-100">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="retro-panel overflow-hidden p-6 sm:p-10">
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-fuchsia-300/90">
                Ready when you are
              </p>
              <h2 className="mt-3 max-w-lg text-2xl font-semibold text-zinc-100 sm:text-3xl">
                Sign in once. Check in daily. See your life move forward.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Create an account with your phone number, add your first assets or goals, and build
                the habit of tracking what actually matters.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/signup">Create account</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} {APP_NAME}. Personal life tracking.
          </p>
          <div className="flex gap-4 text-sm text-zinc-400">
            <Link href="/login" className="hover:text-zinc-200">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-zinc-200">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
