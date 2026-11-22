"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { formatRub } from "@/lib/money";
import {
  deleteTransaction,
  type Transaction,
} from "@/lib/transactions-api";
import { getErrorMessage } from "@/lib/auth-api";
import styles from "./dashboard.module.css";

export const TX_PAGE_SIZES = [10, 25, 50] as const;
export type TxPageSize = (typeof TX_PAGE_SIZES)[number];

type TransactionListProps = {
  items: Transaction[];
  loading?: boolean;
  page: number;
  pageSize: TxPageSize;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: TxPageSize) => void;
  onDeleted: (id: string) => void;
};

export function TransactionList({
  items,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onDeleted,
}: TransactionListProps) {
  async function onDelete(tx: Transaction) {
    const ok = window.confirm("Удалить транзакцию?");
    if (!ok) return;
    try {
      await deleteTransaction(tx.id);
      onDeleted(tx.id);
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showPager = totalPages > 1;

  return (
    <div className={styles.txBlock}>
      <div className={styles.txToolbar}>
        <label className={styles.txPageSize}>
          Показывать
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as TxPageSize)
            }
            aria-label="Количество транзакций на странице"
          >
            {TX_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.txMeta}>
          {loading && items.length === 0
            ? "Загрузка…"
            : total === 0
              ? "Нет записей"
              : `${from}–${to} из ${total}`}
        </p>
      </div>

      {loading && items.length === 0 ? (
        <p className={styles.muted}>Загрузка транзакций…</p>
      ) : items.length === 0 ? (
        <p className={styles.muted}>Пока нет транзакций</p>
      ) : (
        <ul className={styles.txList} data-loading={loading ? "true" : "false"}>
          {items.map((tx) => {
            const sign = tx.type === "income" ? "+" : "−";
            const dateLabel = format(new Date(tx.date), "d MMM yyyy", {
              locale: ru,
            });

            return (
              <li key={tx.id} className={styles.txItem}>
                <div className={styles.txMain}>
                  <span className={styles.txCategory}>
                    {tx.category.name || "Без категории"}
                  </span>
                  <span className={styles.txDate}>{dateLabel}</span>
                  {tx.comment ? (
                    <span className={styles.txComment}>{tx.comment}</span>
                  ) : null}
                </div>
                <div className={styles.txRight}>
                  <span className={styles.txAmount} data-type={tx.type}>
                    {sign}
                    {formatRub(tx.amount)}
                  </span>
                  <button
                    type="button"
                    className={styles.txDelete}
                    onClick={() => onDelete(tx)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showPager ? (
        <div className={styles.txPager}>
          <button
            type="button"
            className={styles.ghostBtn}
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Назад
          </button>
          <span className={styles.txPagerInfo}>
            Страница {page} из {totalPages}
          </span>
          <button
            type="button"
            className={styles.ghostBtn}
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Вперёд
          </button>
        </div>
      ) : null}
    </div>
  );
}
