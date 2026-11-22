import localforage from "localforage";
import type { CategoryType } from "./categories-api";
import { createTransaction, type Transaction } from "./transactions-api";

/** Политика конфликтов: server-wins — при успешной отправке серверная версия канонична. */
export const CONFLICT_POLICY = "server-wins" as const;

export type QueuedTransactionInput = {
  type: CategoryType;
  amount: number;
  categoryId: string;
  date?: string;
  comment?: string;
  cardId?: string | null;
};

export type OfflineQueueItem = {
  id: string;
  createdAt: string;
  synced: false;
  payload: QueuedTransactionInput;
  /** Локальная «черновая» транзакция для UI до синхронизации */
  localTx: Transaction;
};

const store = localforage.createInstance({
  name: "financetracker",
  storeName: "offline_transactions",
  description: "Очередь транзакций, созданных офлайн",
});

const QUEUE_KEY = "pending";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readQueue(): Promise<OfflineQueueItem[]> {
  const items = await store.getItem<OfflineQueueItem[]>(QUEUE_KEY);
  return items ?? [];
}

async function writeQueue(items: OfflineQueueItem[]) {
  await store.setItem(QUEUE_KEY, items);
}

export async function getPendingCount(): Promise<number> {
  const items = await readQueue();
  return items.length;
}

export async function listPending(): Promise<OfflineQueueItem[]> {
  return readQueue();
}

export async function enqueueOfflineTransaction(
  input: QueuedTransactionInput,
  category: { id: string; name: string; type: string },
): Promise<OfflineQueueItem> {
  const id = uid();
  const createdAt = new Date().toISOString();
  const item: OfflineQueueItem = {
    id,
    createdAt,
    synced: false,
    payload: input,
    localTx: {
      id: `local:${id}`,
      userId: "local",
      type: input.type,
      amount: input.amount,
      date: input.date ?? createdAt,
      categoryId: input.categoryId,
      category,
      comment: input.comment,
      tags: [],
      source: "manual",
      cardId: input.cardId ?? null,
      isDeleted: false,
    },
  };

  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  notifyQueueChanged();
  return item;
}

export type SyncResult = {
  synced: number;
  failed: number;
  created: Transaction[];
};

/**
 * Отправляет очередь на сервер по порядку.
 * Политика: server-wins — локальные черновики заменяются ответом сервера.
 */
export async function flushOfflineQueue(): Promise<SyncResult> {
  const queue = await readQueue();
  if (queue.length === 0) {
    return { synced: 0, failed: 0, created: [] };
  }

  const remaining: OfflineQueueItem[] = [];
  const created: Transaction[] = [];
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const item = queue[i];
    try {
      const tx = await createTransaction(item.payload);
      created.push(tx);
      synced += 1;
    } catch {
      failed += 1;
      // сохраняем порядок: текущая + все последующие
      remaining.push(...queue.slice(i));
      break;
    }
  }

  await writeQueue(remaining);
  notifyQueueChanged();
  return { synced, failed, created };
}

type QueueListener = () => void;
const listeners = new Set<QueueListener>();

export function subscribeQueue(listener: QueueListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyQueueChanged() {
  listeners.forEach((listener) => listener());
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
