"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Github, Loader2 } from "lucide-react";

import { BackgroundInfinity } from "@/components/graphics/background-infinity";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { signIn, signInWithGoogle } from "@/actions/auth.actions";

const INPUT_CLASS =
  "w-full rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 backdrop-blur-xl transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30";

export function LoginCard({ next }: { next?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("identifier", identifier);
      formData.set("password", password);
      if (next) formData.set("next", next);

      const result = await signIn(formData);

      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("Network error: unable to reach the auth backend");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle(next);

      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      setError(result?.error ?? "Unable to start Google sign in");
    } catch {
      setError("Unable to start Google sign in");
    }
    setGoogleLoading(false);
  }

  return (
    <section className="relative flex min-h-dvh items-center justify-center pb-[env(safe-area-inset-bottom)] pt-[88px] sm:pt-[104px] lg:pt-[120px]">
      <BackgroundInfinity variant="login" />

      <div className="relative mx-auto w-full max-w-[520px] px-5 sm:px-8">
        <Reveal>
          <div className="group overflow-hidden rounded-[2rem] border border-border-strong card-surface px-6 py-8 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40 hover:shadow-glow-sm sm:px-12 sm:py-9">
            <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08]">
                <svg viewBox="0 0 512 512" className="h-7 w-7" aria-hidden="true">
                  <path d="M96 256C96 170 192 170 256 256C320 342 416 342 416 256C416 170 320 170 256 256C192 342 96 342 96 256Z" fill="none" stroke="#6D6DFF" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <h1 className="mt-6 text-balance text-[1.75rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2rem]">
                Welcome Back
              </h1>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-400">
                Continue building, collaborating and shaping the future with Azenion.
              </p>
            </div>

            <form className="relative mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-ink-200">
                  Email or Username
                </label>
                <input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  placeholder="you@example.com or your username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={INPUT_CLASS}
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink-200">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={INPUT_CLASS + " pr-11"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-600 transition-colors hover:text-ink-400"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-border-strong bg-surface text-accent-400 accent-accent-400 transition-colors focus:ring-accent-400/30"
                  />
                  <span className="text-sm text-ink-400">Remember me</span>
                </label>
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative mt-6">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />
              <span className="relative mx-auto flex w-10 justify-center bg-void-950 text-xs uppercase tracking-[0.12em] text-ink-600">
                or
              </span>
            </div>

            <div className="relative mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-sm font-medium text-ink-200 backdrop-blur-xl transition-all duration-300 hover:border-accent-400/40 hover:bg-accent/[0.08] hover:text-accent-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {googleLoading ? "Redirecting to Google..." : (
                  <>
                    Continue with Google
                    <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400" aria-hidden="true">
                      v2
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="relative flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface px-4 py-3.5 text-sm font-medium text-ink-300 opacity-70 backdrop-blur-xl transition-all duration-300"
              >
                <Github size={19} />
                Continue with GitHub
                <span className="absolute right-4 text-[10px] font-medium uppercase tracking-wide text-ink-600">
                  Coming soon
                </span>
              </button>
            </div>

            <div className="relative mt-6 border-t border-border-strong pt-8 text-center">
              <p className="text-sm text-ink-400">
                New to Azenion?{" "}
                <Link
                  href="/join"
                  className="font-medium text-accent-400 transition-colors hover:text-accent-300"
                >
                  Create an Account
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
