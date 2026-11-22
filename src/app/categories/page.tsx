"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/auth-api";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
  type CategoryType,
} from "@/lib/categories-api";
import styles from "./page.module.css";

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [editingId, setEditingId] = useState<string | null>(null);

  const authenticated = Boolean(getAccessToken());

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Войдите, чтобы управлять категориями");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchCategories());
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
    setType("expense");
    setEditingId(null);
    setFormError(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Введите название");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        const updated = await updateCategory(editingId, { name: trimmed });
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const created = await createCategory({ name: trimmed, type });
        setItems((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(category: Category) {
    const ok = window.confirm(`Удалить категорию «${category.name}»?`);
    if (!ok) return;

    setFormError(null);
    try {
      await deleteCategory(category.id);
      setItems((prev) => prev.filter((item) => item.id !== category.id));
      if (editingId === category.id) resetForm();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const expenses = items.filter((c) => c.type === "expense");
  const incomes = items.filter((c) => c.type === "income");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Категории</h1>
      <p className={styles.lead}>Создавайте и редактируйте свои категории.</p>

      {!authenticated ? (
        <p className={styles.muted}>
          <Link href="/login">Войти</Link>, чтобы продолжить.
        </p>
      ) : null}

      {authenticated ? (
        <form className={styles.form} onSubmit={onSubmit}>
          <h2 className={styles.formTitle}>
            {editingId ? "Редактирование" : "Новая категория"}
          </h2>

          <div className={styles.field}>
            <label htmlFor="cat-name">Название</label>
            <input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              placeholder="Например, Кофе"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="cat-type">Тип</label>
            <select
              id="cat-type"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
              disabled={Boolean(editingId)}
            >
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
            {editingId ? (
              <span className={styles.hint}>Тип нельзя сменить при правке</span>
            ) : null}
          </div>

          {formError ? <p className={styles.error}>{formError}</p> : null}

          <div className={styles.formActions}>
            <button className={styles.primaryBtn} type="submit" disabled={saving}>
              {saving
                ? "Сохраняем…"
                : editingId
                  ? "Сохранить"
                  : "Добавить"}
            </button>
            {editingId ? (
              <button
                className={styles.ghostBtn}
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Отмена
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {loading ? <p className={styles.muted}>Загрузка…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && authenticated && !error ? (
        <div className={styles.grid}>
          <CategoryList
            title={`Расходы (${expenses.length})`}
            items={expenses}
            onEdit={startEdit}
            onDelete={onDelete}
          />
          <CategoryList
            title={`Доходы (${incomes.length})`}
            items={incomes}
            onEdit={startEdit}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </div>
  );
}

function CategoryList({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <section className={styles.listCard}>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className={styles.muted}>Пока пусто</p>
      ) : (
        <ul>
          {items.map((category) => (
            <li key={category.id}>
              <span className={styles.itemName}>{category.name}</span>
              <div className={styles.itemActions}>
                <button type="button" onClick={() => onEdit(category)}>
                  Изменить
                </button>
                <button
                  type="button"
                  className={styles.dangerBtn}
                  onClick={() => onDelete(category)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
