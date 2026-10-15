"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "signin" | "signup";

const inputControlClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100";
const inputClassName = `mt-2 ${inputControlClassName}`;

const getRedirectTarget = () => {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\")) {
    return null;
  }
  return redirect;
};

const getRequestError = (error: unknown, mode: AuthMode) => {
  if (!axios.isAxiosError(error)) {
    return mode === "signin"
      ? "We couldn’t sign you in. Check your details and try again."
      : "We couldn’t create your account. Please try again.";
  }

  const status = error.response?.status;
  const message = error.response?.data?.error;
  if (status === 409) return "An account with this email already exists. Sign in instead.";
  if (status === 401) return "Email or password is incorrect. Please try again.";
  if (status === 400 && typeof message === "string") return message;
  if (!error.response) return "We couldn’t reach the server. Check your connection and try again.";
  return mode === "signin"
    ? "We couldn’t sign you in. Check your details and try again."
    : "We couldn’t create your account. Please try again.";
};

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountCreatedRedirect, setAccountCreatedRedirect] = useState<string | null>(null);

  const isSignUp = mode === "signup";

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setAccountCreated(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp && password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      setLoading(false);
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setError("Your passwords don’t match.");
      setLoading(false);
      return;
    }

    try {
      const redirectTarget = getRedirectTarget();
      if (isSignUp) {
        const user = await register({
          firstName,
          lastName,
          email,
          password,
          phone,
          userType: "customer"
        });
        if (user.userType === "admin") {
          router.replace("/admin");
        } else {
          setAccountCreatedRedirect(redirectTarget);
          setAccountCreated(true);
        }
      } else {
        const user = await login(email, password);
        router.push(user.userType === "admin" ? "/admin" : redirectTarget || "/account");
      }
    } catch (requestError) {
      setError(getRequestError(requestError, mode));
    } finally {
      setLoading(false);
    }
  };

  if (accountCreated) {
    return (
      <main className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-[#f7f7f5] px-4 py-12">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700" aria-hidden="true">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Your account is ready</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            You’re signed in and ready to browse motorcycle parts and accessories.
          </p>
          <Link
            href={accountCreatedRedirect || "/account"}
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            {accountCreatedRedirect === "/wishlist" ? "View your wishlist" : accountCreatedRedirect ? "Continue shopping" : "View your account"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#151b22] p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Nancy Motorcycle Spares home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-lg font-black">W</span>
              <span className="text-sm font-extrabold tracking-wide">NANCY MOTORCYCLE SPARES</span>
            </Link>
          </div>
          <div className="relative py-12">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">Made for the ride</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight">
              The right parts.
              <span className="block text-red-400">The next ride.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
              Sign in to continue shopping, or create an account to join Kenya’s motorcycle marketplace.
            </p>
          </div>
          <p className="relative text-xs text-slate-400">Shop motorcycle essentials from across Kenya.</p>
        </aside>

        <section className="px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-red-600">
            ← Back to store
          </Link>

          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Your Nancy Motorcycle Spares account</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isSignUp
                ? "Create an account to shop motorcycle parts and accessories."
                : "Sign in to manage your account and continue shopping."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Account access">
            <button
              type="button"
              onClick={() => changeMode("signin")}
              aria-pressed={!isSignUp}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                !isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => changeMode("signup")}
              aria-pressed={isSignUp}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">First name</span>
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Last name</span>
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className={inputClassName}
                      required
                    />
                  </label>
                </div>
              </>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email address</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClassName}
                required
              />
            </label>

            {isSignUp && (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Phone number <span className="text-slate-400">(optional)</span></span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    className={inputClassName}
                  />
                </label>
              </>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <span className="relative mt-2 block">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
                  minLength={isSignUp ? 8 : undefined}
                  className={`${inputControlClassName} pr-20`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 my-auto h-fit rounded px-2 py-1 text-sm font-semibold text-slate-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            {isSignUp && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Confirm password</span>
                <span className="relative mt-2 block">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={`${inputControlClassName} pr-20`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    aria-pressed={showConfirmPassword}
                    className="absolute inset-y-0 right-3 my-auto h-fit rounded px-2 py-1 text-sm font-semibold text-slate-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-4 py-3.5 font-bold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create account" : "Sign in")}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Admin access is provisioned privately and cannot be created from this form.
          </p>
        </section>
      </div>
    </main>
  );
}
