"use client";

import { useOfflineSync } from "./OfflineSyncProvider";
import styles from "./OfflineSyncBanner.module.css";

export function OfflineSyncBanner() {
  const { online, pendingCount, syncing, lastMessage, syncNow } =
    useOfflineSync();

  if (online && pendingCount === 0 && !lastMessage && !syncing) {
    return null;
  }

  return (
    <div
      className={styles.banner}
      data-offline={!online}
      role="status"
      aria-live="polite"
    >
      <div className={styles.text}>
        {!online ? (
          <span>Офлайн-режим</span>
        ) : syncing ? (
          <span>Синхронизация…</span>
        ) : pendingCount > 0 ? (
          <span>
            Ожидают синхронизации: <strong>{pendingCount}</strong>
          </span>
        ) : null}
        {lastMessage ? <span className={styles.msg}>{lastMessage}</span> : null}
      </div>
      {online && pendingCount > 0 ? (
        <button
          type="button"
          className={styles.btn}
          disabled={syncing}
          onClick={() => void syncNow()}
        >
          Синхронизировать
        </button>
      ) : null}
    </div>
  );
}
