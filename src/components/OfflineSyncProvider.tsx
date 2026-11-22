"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  flushOfflineQueue,
  getPendingCount,
  isBrowserOnline,
  subscribeQueue,
} from "@/lib/offline-queue";

type OfflineSyncContextValue = {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastMessage: string | null;
  refreshPending: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function OfflineSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (!isBrowserOnline() || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setLastMessage(null);
    try {
      const result = await flushOfflineQueue();
      await refreshPending();
      if (result.synced > 0) {
        setLastMessage(`Синхронизировано: ${result.synced}`);
        window.dispatchEvent(
          new CustomEvent("ft:offline-synced", { detail: result }),
        );
      } else if (result.failed > 0) {
        setLastMessage("Не удалось синхронизировать очередь");
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    setOnline(isBrowserOnline());
    void refreshPending();

    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const unsubscribe = subscribeQueue(() => {
      void refreshPending();
    });

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsubscribe();
    };
  }, [refreshPending, syncNow]);

  const value = useMemo(
    () => ({
      online,
      pendingCount,
      syncing,
      lastMessage,
      refreshPending,
      syncNow,
    }),
    [online, pendingCount, syncing, lastMessage, refreshPending, syncNow],
  );

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return ctx;
}
