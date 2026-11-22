"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { OfflineSyncBanner } from "./OfflineSyncBanner";
import { OfflineSyncProvider } from "./OfflineSyncProvider";
import { MobileTopBar, SideNav } from "./SideNav";
import styles from "./AppShell.module.css";

const PUBLIC_PATHS = new Set(["/register", "/login", "/~offline"]);

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    function sync() {
      setAuthed(isAuthenticated());
    }
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("ft:auth-changed", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("ft:auth-changed", sync);
    };
  }, [pathname]);

  useEffect(() => {
    if (authed === null) return;
    if (authed) return;
    if (PUBLIC_PATHS.has(pathname)) return;
    router.replace("/register");
  }, [authed, pathname, router]);

  const showMenu = authed === true;
  const isPublic = PUBLIC_PATHS.has(pathname);
  const blockingGuest =
    authed === false && !isPublic;

  return (
    <OfflineSyncProvider>
      <div
        className={styles.shell}
        data-guest={showMenu ? "false" : "true"}
      >
        {showMenu ? (
          <SideNav mobileOpen={mobileOpen} onClose={closeMobile} />
        ) : null}
        <div className={styles.content}>
          {showMenu ? (
            <MobileTopBar onOpen={() => setMobileOpen(true)} />
          ) : null}
          <main className={styles.main}>
            {showMenu ? <OfflineSyncBanner /> : null}
            {authed === null || blockingGuest ? (
              <p className={styles.boot}>Загрузка…</p>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </OfflineSyncProvider>
  );
}
