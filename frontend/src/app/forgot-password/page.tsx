"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, KeyRound, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }

      setStatus("sent");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  }

  const backToLogin = (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to login
    </Link>
  );

  const brand = (
    <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
        AI
      </div>
      <span className="font-semibold text-gray-900 text-lg">Career Mentor</span>
    </Link>
  );

  /* Sent confirmation */
  if (status === "sent") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {brand}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
            <div className="mx-auto mb-5 w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              If <span className="font-medium text-gray-900">{email}</span> is registered, we've sent a
              reset link. It expires in <span className="font-medium text-gray-900">15 minutes</span>.
            </p>

            <p className="text-xs text-gray-500 mb-6">
              Didn't get it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline underline-offset-2"
              >
                try again
              </button>
              .
            </p>

            {backToLogin}
          </div>
        </div>
      </div>
    );
  }

  /* Form */
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {brand}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-600 text-sm mt-1.5">
            Enter your email and we'll send you a link to reset it.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {status === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">{backToLogin}</div>
        </div>
      </div>
    </div>
  );
}