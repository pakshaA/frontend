"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/auth-api";
import {
  createCategory,
  fetchCategories,
  type Category,
  type CategoryType,
} from "@/lib/categories-api";
import { fetchCards, type Card } from "@/lib/cards-api";
import { rublesToKopecks } from "@/lib/money";
import {
  enqueueOfflineTransaction,
  isBrowserOnline,
} from "@/lib/offline-queue";
import type { ParsedFiscalReceipt } from "@/lib/receipt-qr";
import {
  createTransaction,
  type Transaction,
} from "@/lib/transactions-api";
import { ReceiptQrScanner } from "./ReceiptQrScanner";
import styles from "./dashboard.module.css";

type TransactionFormProps = {
  onCreated: (tx: Transaction) => void;
};

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function TransactionForm({ onCreated }: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [type, setType] = useState<CategoryType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const [date, setDate] = useState(todayInputValue);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    fetchCards()
      .then((list) => {
        setCards(list);
        const cash = list.find((c) => c.isDefault) ?? list[0];
        if (cash) setCardId(cash.id);
      })
      .catch(() => setCards([]));
  }, []);

  const filtered = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  useEffect(() => {
    if (!filtered.some((c) => c.id === categoryId)) {
      setCategoryId(filtered[0]?.id ?? "");
    }
  }, [filtered, categoryId]);

  const onReceiptScanned = useCallback((parsed: ParsedFiscalReceipt) => {
    setType("expense");
    setAmount(parsed.amount);
    setDate(parsed.date);
    setComment((prev) => (prev.trim() ? prev : "Чек QR"));
    setScanning(false);
    setError(null);
  }, []);

  const onScanError = useCallback((message: string) => {
    setError(message);
  }, []);

  async function onCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setError("Введите название категории");
      return;
    }

    setCategorySaving(true);
    setError(null);
    try {
      const created = await createCategory({ name, type });
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCategoryName("");
      setCreatingCategory(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCategorySaving(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const rubles = Number(amount.replace(",", "."));
    if (!Number.isFinite(rubles) || rubles <= 0) {
      setError("Введите сумму больше 0");
      return;
    }
    if (!categoryId) {
      setError("Выберите или создайте категорию");
      return;
    }

    const category = filtered.find((c) => c.id === categoryId);
    if (!category) {
      setError("Выберите или создайте категорию");
      return;
    }

    const payload = {
      type,
      amount: rublesToKopecks(rubles),
      categoryId,
      date: new Date(date).toISOString(),
      comment: comment.trim() || undefined,
      cardId: cardId || null,
    };

    setSaving(true);
    try {
      if (!isBrowserOnline()) {
        const queued = await enqueueOfflineTransaction(payload, {
          id: category.id,
          name: category.name,
          type: category.type,
        });
        onCreated(queued.localTx);
      } else {
        try {
          const tx = await createTransaction(payload);
          onCreated(tx);
        } catch (err) {
          // сеть «есть», но запрос упал — кладём в очередь
          const queued = await enqueueOfflineTransaction(payload, {
            id: category.id,
            name: category.name,
            type: category.type,
          });
          onCreated(queued.localTx);
          setError(
            `${getErrorMessage(err)}. Сохранено в офлайн-очередь (server-wins).`,
          );
        }
      }
      setAmount("");
      setComment("");
      setDate(todayInputValue());
      setCreatingCategory(false);
      setNewCategoryName("");
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.addBtn}
        onClick={() => setOpen(true)}
      >
        + Добавить транзакцию
      </button>
    );
  }

  return (
    <form className={styles.txForm} onSubmit={onSubmit}>
      <div className={styles.txFormHeader}>
        <h3>Новая транзакция</h3>
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={() => {
            setOpen(false);
            setScanning(false);
            setError(null);
            setCreatingCategory(false);
            setNewCategoryName("");
          }}
        >
          Закрыть
        </button>
      </div>

      <button
        type="button"
        className={styles.scanBtn}
        onClick={() => {
          setError(null);
          setScanning(true);
        }}
      >
        Отсканировать чек
      </button>

      {scanning ? (
        <ReceiptQrScanner
          onScan={onReceiptScanned}
          onClose={() => setScanning(false)}
          onError={onScanError}
        />
      ) : null}

      <div className={styles.row2}>
        <label>
          Тип
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as CategoryType);
              setCreatingCategory(false);
              setNewCategoryName("");
            }}
          >
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
        </label>
        <label>
          Сумма, ₽
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
      </div>

      <div className={styles.categoryBlock}>
        <div className={styles.categoryHeader}>
          <span>Категория</span>
          {!creatingCategory ? (
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setCreatingCategory(true);
                setError(null);
              }}
            >
              + Новая
            </button>
          ) : (
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setCreatingCategory(false);
                setNewCategoryName("");
              }}
            >
              К списку
            </button>
          )}
        </div>

        {creatingCategory ? (
          <div className={styles.newCategoryRow}>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={
                type === "expense"
                  ? "Например, Кофе"
                  : "Например, Зарплата"
              }
              maxLength={80}
              autoFocus
            />
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => void onCreateCategory()}
              disabled={categorySaving}
            >
              {categorySaving ? "…" : "Создать"}
            </button>
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={filtered.length === 0}
          >
            {filtered.length === 0 ? (
              <option value="">Нет категорий — нажмите «+ Новая»</option>
            ) : (
              filtered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      <label>
        Дата
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      <label>
        {type === "income" ? "Куда зачислить" : "Откуда списать"}
        <select value={cardId} onChange={(e) => setCardId(e.target.value)}>
          <option value="">Не привязано</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} · {card.bank}
            </option>
          ))}
        </select>
      </label>

      <label>
        Комментарий
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          placeholder="Необязательно"
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.primaryBtn} disabled={saving}>
        {saving ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
