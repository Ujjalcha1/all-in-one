"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, Menu, Layers } from "lucide-react";

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export default function Header({ onToggleMobileMenu }: HeaderProps) {
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
    <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur flex-shrink-0 flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-600 dark:text-zinc-400 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dashboard Title / Breadcrumb */}
        <h2 className="hidden sm:block text-sm font-bold text-zinc-500 dark:text-zinc-400">
          Workspace Dashboard
        </h2>
      </div>

      {/* Account Info / Action Buttons */}
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
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors cursor-pointer text-zinc-500"
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
    </header>
  );
}
