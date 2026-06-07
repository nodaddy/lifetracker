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

export function PhoneSignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
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

    if (!firstName.trim()) {
      setLoading(false);
      setError("First name is required.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setLoading(false);
      setError("Please enter a valid email address.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: trimmedEmail,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setOtpSent(true);
    setMessage("OTP sent. Enter it below to complete signup.");
  }

  async function verifyOtpAndSignup() {
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

    router.push("/dashboard/daily-routine");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input
        className="w-full rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
        placeholder="First name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        disabled={otpSent || loading}
      />
      <input
        className="w-full rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
        placeholder="Last name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        disabled={otpSent || loading}
      />
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
      <input
        type="email"
        className="w-full rounded-md border border-purple-300/40 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-cyan-300"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={otpSent || loading}
      />

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
            onClick={verifyOtpAndSignup}
            disabled={loading || otp.trim().length < 4}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify OTP and Sign up"}
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
