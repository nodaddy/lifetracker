import Link from "next/link";
import { redirect } from "next/navigation";

import { PhoneSignupForm } from "@/components/auth/phone-signup-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
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
        <h1 className="neon-title text-2xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Enter your details, verify OTP, and complete signup.
        </p>
        <div className="mt-6">
          <PhoneSignupForm />
        </div>
        <p className="mt-4 text-sm text-zinc-300">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-cyan-200 underline">
            Sign in
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
