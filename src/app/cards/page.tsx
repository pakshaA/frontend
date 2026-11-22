"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/auth-api";
import {
  createCard,
  deleteCard,
  fetchCards,
  updateCard,
  type Card,
} from "@/lib/cards-api";
import { formatRub } from "@/lib/money";
import styles from "./page.module.css";

export default function CardsPage() {
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const authenticated = Boolean(getAccessToken());

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Войдите, чтобы управлять картами");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchCards());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setName("");
    setBank("");
    setComment("");
    setEditingId(null);
  }

  function startEdit(card: Card) {
    setEditingId(card.id);
    setName(card.name);
    setBank(card.bank);
    setComment(card.comment ?? "");
    setMessage(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        const updated = await updateCard(editingId, {
          name: name.trim(),
          bank: bank.trim(),
          comment: comment.trim() || null,
        });
        setItems((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        setMessage("Карта обновлена");
      } else {
        const created = await createCard({
          name: name.trim(),
          bank: bank.trim(),
          comment: comment.trim() || undefined,
        });
        setItems((prev) => [created, ...prev]);
        setMessage("Карта добавлена");
      }
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(card: Card) {
    if (!window.confirm(`Удалить карту «${card.name}»?`)) return;
    try {
      await deleteCard(card.id);
      setItems((prev) => prev.filter((c) => c.id !== card.id));
      if (editingId === card.id) resetForm();
      setMessage("Карта удалена");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Карты</h1>
      <p className={styles.lead}>
        Раздел помогает разделить деньги по счетам: зарплатная карта, запасная,
        семейная и т.п. Баланс каждой карты считается из привязанных к ней
        транзакций. Указывайте только короткое название — никогда не вводите
        полный номер карты, CVV и срок действия.
      </p>

      {!authenticated ? (
        <p className={styles.muted}>
          <Link href="/login">Войти</Link>, чтобы продолжить.
        </p>
      ) : null}

      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.muted}>Загрузка…</p> : null}

      {authenticated ? (
        <form className={styles.form} onSubmit={onSubmit}>
          <h2>{editingId ? "Редактирование" : "Новая карта"}</h2>
          <div className={styles.row2}>
            <label>
              Название
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название. Никогда не указывайте полные данные карты!"
                maxLength={80}
                required
              />
              <span className={styles.hint}>
                Например: «Зарплатная» или «Тинькофф чёрная»
              </span>
            </label>
            <label>
              Банк
              <input
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Сбер, Тинькофф…"
                maxLength={120}
                required
              />
            </label>
          </div>
          <label>
            Комментарий
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательно"
              maxLength={300}
            />
          </label>
          <div className={styles.formActions}>
            <button type="submit" disabled={saving}>
              {saving
                ? "Сохраняем…"
                : editingId
                  ? "Сохранить"
                  : "Добавить карту"}
            </button>
            {editingId ? (
              <button
                type="button"
                className={styles.ghost}
                onClick={resetForm}
              >
                Отмена
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {authenticated && !loading ? (
        <section className={styles.listCard}>
          <h2>Мои карты ({items.length})</h2>
          {items.length === 0 ? (
            <p className={styles.muted}>Пока нет карт</p>
          ) : (
            <ul className={styles.list}>
              {items.map((card) => (
                <li key={card.id} className={styles.item}>
                  <div>
                    <strong>{card.name}</strong>
                    <p className={styles.meta}>
                      {card.bank}
                      {card.comment ? ` · ${card.comment}` : ""}
                    </p>
                    <p className={styles.balance}>
                      {formatRub(card.balance)}
                    </p>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => startEdit(card)}
                    >
                      Изменить
                    </button>
                    {card.isDefault ? (
                      <span className={styles.muted}>Системная</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.danger}
                        onClick={() => void onDelete(card)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
