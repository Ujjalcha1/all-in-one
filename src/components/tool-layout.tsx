import * as React from "react";
import { Lock, ArrowRight } from "lucide-react";
import { getDeviceId } from "@/lib/device";

interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function ToolLayout({ title, description, children, icon }: ToolLayoutProps) {
  const [isAllowed, setIsAllowed] = React.useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function checkUsage() {
      try {
        const token = localStorage.getItem("authToken");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-device-id": getDeviceId()
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        // Extract tool name from the current pathname
        const tool = window.location.pathname.replace(/^\//, "") || "pdf-tool";
        
        const res = await fetch(`/api/usage/check?tool=${tool}`, { headers });
        const data = await res.json();
        
        if (!data.allowed) {
          setIsAllowed(false);
          setErrorMsg(data.error || null);
        } else {
          setIsAllowed(true);
        }
      } catch (err) {
        console.warn("Usage check failed inside ToolLayout:", err);
        // Fallback: allow usage if API/DB check fails to avoid blocking users due to network issues
        setIsAllowed(true);
      }
    }
    
    checkUsage();
  }, []);

  if (isAllowed === null) {
    return (
      <div className="min-h-[calc(100vh-4rem)] w-full relative flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Verifying usage status...</p>
        </div>
      </div>
    );
  }

  if (isAllowed === false) {
    const isDeviceRestricted = errorMsg && errorMsg.includes("bound to another device");

    return (
      <div className="min-h-[calc(100vh-4rem)] w-full relative flex flex-col items-center justify-center p-4">
        {/* Premium Background Elements */}
        <div className="absolute inset-0 bg-background overflow-hidden -z-10">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="w-full max-w-md bg-white/60 dark:bg-zinc-950/60 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-3xl p-8 text-center backdrop-blur-2xl animate-in zoom-in-95 duration-300 relative">
          <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/5 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-3">
            {isDeviceRestricted ? "Device Restricted" : "Limit Reached"}
          </h3>
          
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 font-semibold">
            {errorMsg || (
              <>
                You have already used a PDF tool on this device as a guest. Please sign in or sign up for free to get <span className="text-red-500 font-bold">unlimited access</span>!
              </>
            )}
          </p>

          <div className="flex flex-col gap-3">
            {isDeviceRestricted ? (
              <button
                onClick={() => {
                  localStorage.removeItem("authToken");
                  window.dispatchEvent(new Event("storage"));
                  window.location.reload();
                }}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                Sign Out / Switch Account
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            ) : (
              <>
                <a
                  href="/login"
                  className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  Sign In
                  <ArrowRight className="w-4.5 h-4.5" />
                </a>
                <a
                  href="/signup"
                  className="w-full h-12 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl flex items-center justify-center font-bold transition-all transform hover:-translate-y-0.5"
                >
                  Create Free Account
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full relative flex flex-col items-center">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-background overflow-hidden -z-10">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="w-full pt-16 pb-12 px-4 flex flex-col items-center border-b border-border/50 bg-white/40 dark:bg-black/40 backdrop-blur-xl">
        <div className="w-full max-w-4xl flex flex-col items-center text-center">
          {icon && (
            <div className="mb-6 p-4 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-inner border border-indigo-500/10">
              {icon}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium">
            {description}
          </p>
        </div>
      </div>
      
      <div className="w-full max-w-5xl px-4 py-12 flex-1 flex flex-col items-stretch">
        {children}
      </div>
    </div>
  );
}

