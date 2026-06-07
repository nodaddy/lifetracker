"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const COUNTRY_CODES = [
  { label: "India (+91)", value: "+91" },
  { label: "United States (+1)", value: "+1" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "UAE (+971)", value: "+971" },
  { label: "Singapore (+65)", value: "+65" },
];

export function PhoneLoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buildE164Phone() {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return null;
    }
    return `${countryCode}${digits}`;
  }

  async function sendOtp() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const normalizedPhone = buildE164Phone();
    if (!normalizedPhone) {
      setLoading(false);
      setError("Please enter a valid phone number.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setOtpSent(true);
    setMessage("OTP sent. Enter it below to sign in.");
  }

  async function verifyOtpAndSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: buildE164Phone() ?? "",
      token: otp.trim(),
      type: "sms",
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="select-shell">
          <select
            className="select-premium text-sm"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={otpSent || loading}
          >
            {COUNTRY_CODES.map((code) => (
              <option key={code.value} value={code.value}>
                {code.label}
              </option>
            ))}
          </select>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="col-span-2 rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
          placeholder="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={otpSent || loading}
        />
      </div>

      {!otpSent ? (
        <Button onClick={sendOtp} disabled={loading} className="w-full">
          {loading ? "Sending OTP..." : "Send OTP"}
        </Button>
      ) : (
        <>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={loading}
          />
          <Button
            onClick={verifyOtpAndSignIn}
            disabled={loading || otp.trim().length < 4}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify OTP and Sign in"}
          </Button>
        </>
      )}

      {message ? (
        <p className="text-sm text-green-700" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
