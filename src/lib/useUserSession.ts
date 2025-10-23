"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

export function useUserSession(protectedRoute = true) {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let logoutTimer: NodeJS.Timeout | null = null;

    const isAuthPage =
      pathname?.startsWith("/login") || pathname?.startsWith("/signup");

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      setSession(currentSession);

      if (!currentSession && protectedRoute && !isAuthPage) {
        router.replace("/login");
      }

      if (currentSession?.expires_at) {
        const expiryTime = currentSession.expires_at * 1000 - Date.now() - 2000;
        if (expiryTime > 0) {
          logoutTimer = setTimeout(() => {
            supabase.auth.signOut();
            localStorage.removeItem("display_name");
            router.replace("/login");
          }, expiryTime);
        }
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        const isAuthPageNow =
          pathname?.startsWith("/login") || pathname?.startsWith("/signup");

        if (event === "TOKEN_REFRESHED") {
          if (logoutTimer) clearTimeout(logoutTimer);
          if (session?.expires_at) {
            const expiryTime = session.expires_at * 1000 - Date.now() - 2000;
            logoutTimer = setTimeout(() => {
              supabase.auth.signOut();
              localStorage.removeItem("display_name");
              router.replace("/login");
            }, expiryTime);
          }
        }

        if (event === "SIGNED_OUT") {
          localStorage.removeItem("display_name");
          if (protectedRoute) router.replace("/login");
        }

        if (!session && protectedRoute && !isAuthPageNow) {
          router.replace("/login");
        }
      }
    );

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "supabase.auth.token" && !e.newValue) {
        localStorage.removeItem("display_name");
        if (protectedRoute) router.replace("/login");
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      listener.subscription.unsubscribe();
      if (logoutTimer) clearTimeout(logoutTimer);
      window.removeEventListener("storage", handleStorage);
    };
  }, [protectedRoute, router, pathname]);

  return session;
}
