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
      <div className="h-full w-full relative flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Verifying usage status...</p>
        </div>
      </div>
    );
  }

  if (isAllowed === false) {
    const isDeviceRestricted = errorMsg && errorMsg.includes("bound to another device");

    return (
      <div className="h-full w-full relative flex flex-col items-center justify-center p-6 bg-background">
        {/* Premium Background Elements */}
        <div className="absolute inset-0 bg-background overflow-hidden -z-10">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="w-full max-w-md bg-white/60 dark:bg-zinc-950/60 border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-3xl p-8 text-center backdrop-blur-2xl animate-in zoom-in-95 duration-300 relative">
          <div className="w-14 h-14 rounded-full bg-red-500/10 dark:bg-red-500/5 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Lock className="w-6.5 h-6.5 animate-pulse" />
          </div>
          
          <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
            {isDeviceRestricted ? "Device Restricted" : "Limit Reached"}
          </h3>
          
          <p className="text-xs text-muted-foreground leading-relaxed mb-6 font-semibold">
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
                  localStorage.removeItem("userEmail");
                  window.dispatchEvent(new Event("storage"));
                  window.location.reload();
                }}
                className="w-full h-11 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer text-xs uppercase tracking-wider"
              >
                Sign Out / Switch Account
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <a
                  href="/login"
                  className="w-full h-11 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/signup"
                  className="w-full h-11 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl flex items-center justify-center font-bold transition-all transform hover:-translate-y-0.5 text-xs uppercase tracking-wider"
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
    <div className="h-full w-full flex flex-col bg-background overflow-hidden relative">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-background overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] rounded-full bg-violet-500/5 blur-[80px]" />
      </div>

      {/* Compact Workspace Header */}
      <div className="w-full py-4 px-6 md:px-8 border-b border-border/50 bg-white/20 dark:bg-black/10 backdrop-blur-md flex items-center gap-4 flex-shrink-0">
        {icon && (
          <div className="p-2 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 flex-shrink-0">
            {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5.5 h-5.5" })}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white truncate">
            {title}
          </h1>
          <p className="text-xs text-muted-foreground truncate max-w-2xl font-medium hidden md:block">
            {description}
          </p>
        </div>
      </div>
      
      {/* Workspace Area - Inner Scroll Only */}
      <div className="flex-1 overflow-y-auto w-full px-6 py-6 md:px-8 md:py-8 flex flex-col items-center">
        <div className="w-full max-w-5xl flex-1 flex flex-col items-stretch justify-start">
          {children}
        </div>
      </div>
    </div>
  );
}
