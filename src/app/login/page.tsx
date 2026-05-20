"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userEmail", data.user.email);
      setSuccess(true);
      
      // Dispatch a storage event so layout header updates instantly
      window.dispatchEvent(new Event("storage"));
      
      setTimeout(() => {
        router.push("/pdf-forms");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden bg-[#f3f4f6] dark:bg-zinc-900">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-red-500/5 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-amber-500/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl rounded-3xl p-8 relative z-10">
        <div className="space-y-2 text-center mb-8">
          <div className="p-3 bg-red-500/10 dark:bg-red-500/5 rounded-2xl w-fit mx-auto text-red-500 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
            Welcome Back
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Log in to enjoy unlimited PDF tool runs
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Success! Redirecting back to editor...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-red-500 dark:focus:border-red-500 text-sm font-semibold rounded-2xl focus:outline-none transition-colors"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-red-500 dark:focus:border-red-500 text-sm font-semibold rounded-2xl focus:outline-none transition-colors"
                disabled={loading || success}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-900 text-center">
          <p className="text-xs text-muted-foreground font-semibold">
            Don't have an account?{" "}
            <Link href="/signup" className="text-red-500 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
