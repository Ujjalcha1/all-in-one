"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, LogOut, User, Menu } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");

  const checkAuth = () => {
    const token = localStorage.getItem("authToken");
    const storedEmail = localStorage.getItem("userEmail");
    if (token && storedEmail) {
      setIsLoggedIn(true);
      setEmail(storedEmail);
    } else {
      setIsLoggedIn(false);
      setEmail("");
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Listen for storage events (e.g. login/logout from other tabs/callbacks)
    window.addEventListener("storage", checkAuth);
    // Periodically poll local storage in case navigation transitions don't emit storage events
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener("storage", checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    setEmail("");
    window.dispatchEvent(new Event("storage"));
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-zinc-900 dark:text-white hover:opacity-90 transition-opacity">
          <Layers className="h-6 w-6 text-red-500" />
          <span>OmniPDF</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Link href="/merge-pdf" className="transition-colors hover:text-red-500">Merge</Link>
          <Link href="/split-pdf" className="transition-colors hover:text-red-500">Split</Link>
          <Link href="/compress-pdf" className="transition-colors hover:text-red-500">Compress</Link>
          <Link href="/pdf-forms" className="transition-colors hover:text-red-500 text-red-500 font-extrabold">PDF Forms</Link>
        </nav>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 animate-in fade-in duration-300">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Account</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate" title={email}>
                  {email.split("@")[0]}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-500/10 dark:bg-red-500/5 text-red-500 border border-red-500/20 flex items-center justify-center font-black text-xs">
                {email.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-100 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-900 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors cursor-pointer text-zinc-500"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-in fade-in duration-300">
              <Link 
                href="/login" 
                className="text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-red-500 transition-colors px-2 py-1"
              >
                Log in
              </Link>
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-xs font-black uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white transition-colors h-10 px-5 shadow-lg shadow-red-500/10"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
