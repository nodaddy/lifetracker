import Link from "next/link";
import { redirect } from "next/navigation";

import { PhoneLoginForm } from "@/components/auth/phone-login-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/daily-routine");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <div className="retro-panel rounded-xl p-5 sm:p-6">
        <h1 className="neon-title text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Enter your phone number and verify with OTP to sign in.
        </p>
        <div className="mt-6">
          <PhoneLoginForm />
        </div>
        <p className="mt-4 text-sm text-zinc-300">
          New user?{" "}
          <Link href="/signup" className="font-medium text-cyan-200 underline">
            Create account
          </Link>
        </p>
        <div className="mt-6">
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
