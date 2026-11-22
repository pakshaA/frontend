"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/auth-api";
import { fetchDeposits, type Deposit } from "@/lib/deposits-api";
import {
  archiveGoal,
  contributeGoal,
  createGoal,
  fetchGoalDetails,
  fetchGoals,
  linkGoalDeposit,
  unlinkGoalDeposit,
  updateGoal,
  withdrawGoal,
  type Goal,
  type GoalHistoryItem,
  type GoalPriority,
} from "@/lib/goals-api";
import {
  GOAL_PRIORITY_LABELS,
  GOAL_SOURCE_LABELS,
  GOAL_STATUS_LABELS,
} from "@/lib/labels";
import { formatRub, rublesToKopecks } from "@/lib/money";
import styles from "./page.module.css";

export default function GoalsPage() {
  const [items, setItems] = useState<Goal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [initial, setInitial] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [color, setColor] = useState("#2ea08c");
  const [description, setDescription] = useState("");
  const [linkedDepositId, setLinkedDepositId] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<GoalHistoryItem[]>([]);
  const [opAmount, setOpAmount] = useState("");
  const [linkDepositId, setLinkDepositId] = useState("");

  const authenticated = Boolean(getAccessToken());

  const availableDeposits = useMemo(() => {
    const used = new Set(
      items
        .filter((g) => g.linkedDepositId && g.status !== "archived")
        .map((g) => g.linkedDepositId as string),
    );
    return deposits.filter(
      (d) => d.status === "active" && !used.has(d.id),
    );
  }, [deposits, items]);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Войдите, чтобы управлять целями");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [goals, deps] = await Promise.all([
        fetchGoals(),
        fetchDeposits("active"),
      ]);
      setItems(goals);
      setDeposits(deps);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectGoal(id: string) {
    setSelectedId(id);
    try {
      const details = await fetchGoalDetails(id);
      setHistory(details.history);
      setItems((prev) =>
        prev.map((g) => (g.id === id ? details.goal : g)),
      );
    } catch {
      setHistory([]);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const targetRub = Number(target.replace(",", "."));
      const initialRub = Number(initial.replace(",", ".") || "0");
      if (!Number.isFinite(targetRub) || targetRub <= 0) {
        throw new Error("Введите целевую сумму");
      }
      const created = await createGoal({
        name: name.trim(),
        targetAmount: rublesToKopecks(targetRub),
        currentAmount: linkedDepositId
          ? undefined
          : rublesToKopecks(Math.max(0, initialRub)),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        priority,
        color,
        description: description.trim() || undefined,
        linkedDepositId: linkedDepositId || null,
      });
      setItems((prev) => [created, ...prev]);
      setName("");
      setTarget("");
      setInitial("0");
      setDeadline("");
      setDescription("");
      setLinkedDepositId("");
      setMessage("Цель создана");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onContribute(id: string) {
    const rubles = Number(opAmount.replace(",", "."));
    if (!Number.isFinite(rubles) || rubles <= 0) {
      setError("Введите сумму");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await contributeGoal(id, rublesToKopecks(rubles));
      setItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setOpAmount("");
      await selectGoal(id);
      setMessage("Цель пополнена");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onWithdraw(id: string) {
    const rubles = Number(opAmount.replace(",", "."));
    if (!Number.isFinite(rubles) || rubles <= 0) {
      setError("Введите сумму");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await withdrawGoal(id, rublesToKopecks(rubles));
      setItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setOpAmount("");
      await selectGoal(id);
      setMessage("Списание выполнено");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onArchive(id: string) {
    if (!window.confirm("Отправить цель в архив?")) return;
    setSaving(true);
    try {
      await archiveGoal(id);
      await load();
      setSelectedId(null);
      setHistory([]);
      setMessage("Цель в архиве");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onLink(id: string) {
    if (!linkDepositId) {
      setError("Выберите вклад");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await linkGoalDeposit(id, linkDepositId);
      setItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setLinkDepositId("");
      setMessage("Вклад привязан");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onUnlink(id: string) {
    setSaving(true);
    setError(null);
    try {
      const updated = await unlinkGoalDeposit(id);
      setItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setMessage("Вклад отвязан");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onComplete(id: string) {
    setSaving(true);
    try {
      const updated = await updateGoal(id, { status: "completed" });
      setItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setMessage("Цель отмечена как завершённая");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const selected = items.find((g) => g.id === selectedId) ?? null;
  const visible = items.filter((g) => g.status !== "archived");
  const archived = items.filter((g) => g.status === "archived");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Цели</h1>
      <p className={styles.lead}>
        Копилки и финансовые цели. Привязка к вкладу необязательна.
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
        <form className={styles.form} onSubmit={onCreate}>
          <h2>Новая цель</h2>
          <div className={styles.row2}>
            <label>
              Название
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Целевая сумма, ₽
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
          </div>
          <div className={styles.row2}>
            <label>
              Стартовая сумма, ₽
              <input
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
                inputMode="decimal"
                disabled={Boolean(linkedDepositId)}
              />
            </label>
            <label>
              Дедлайн
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
          </div>
          <div className={styles.row2}>
            <label>
              Приоритет
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GoalPriority)}
              >
                <option value="high">{GOAL_PRIORITY_LABELS.high}</option>
                <option value="medium">{GOAL_PRIORITY_LABELS.medium}</option>
                <option value="low">{GOAL_PRIORITY_LABELS.low}</option>
              </select>
            </label>
            <label>
              Цвет
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </div>
          <label>
            Привязка к вкладу (необязательно)
            <select
              value={linkedDepositId}
              onChange={(e) => setLinkedDepositId(e.target.value)}
            >
              <option value="">Без привязки — виртуальный счёт</option>
              {availableDeposits.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({formatRub(d.currentAmount)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Описание
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? "Создаём…" : "Создать цель"}
          </button>
        </form>
      ) : null}

      {!loading && authenticated ? (
        <div className={styles.grid}>
          <section className={styles.listCard}>
            <h2>Активные и завершённые ({visible.length})</h2>
            {visible.length === 0 ? (
              <p className={styles.muted}>Пока нет целей</p>
            ) : (
              <ul>
                {visible.map((goal) => (
                  <li key={goal.id}>
                    <button
                      type="button"
                      className={styles.goalBtn}
                      onClick={() => void selectGoal(goal.id)}
                    >
                      <div className={styles.goalHead}>
                        <strong style={{ color: goal.color }}>{goal.name}</strong>
                        <span>{GOAL_STATUS_LABELS[goal.status]}</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${goal.progressPercent}%`,
                            background: goal.color,
                          }}
                        />
                      </div>
                      <span className={styles.meta}>
                        {formatRub(goal.currentAmount)} /{" "}
                        {formatRub(goal.targetAmount)} · {goal.progressPercent}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {archived.length > 0 ? (
              <>
                <h2 className={styles.closedTitle}>
                  Архив ({archived.length})
                </h2>
                <ul>
                  {archived.map((goal) => (
                    <li key={goal.id} className={styles.closedItem}>
                      {goal.name}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className={styles.detailCard}>
            <h2>Детали</h2>
            {!selected ? (
              <p className={styles.muted}>Выберите цель слева</p>
            ) : (
              <>
                <p>
                  <strong style={{ color: selected.color }}>
                    {selected.name}
                  </strong>
                </p>
                <p>
                  Статус: {GOAL_STATUS_LABELS[selected.status]} · Приоритет:{" "}
                  {GOAL_PRIORITY_LABELS[selected.priority]}
                </p>
                <p>
                  Источник: {GOAL_SOURCE_LABELS[selected.sourceType]}
                  {selected.linkedDepositId
                    ? ` · вклад ${
                        deposits.find((d) => d.id === selected.linkedDepositId)
                          ?.name ?? selected.linkedDepositId
                      }`
                    : ""}
                </p>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${selected.progressPercent}%`,
                      background: selected.color,
                    }}
                  />
                </div>
                <p>
                  {formatRub(selected.currentAmount)} из{" "}
                  {formatRub(selected.targetAmount)} ({selected.progressPercent}
                  %)
                </p>
                {selected.forecastMonths != null ? (
                  <p className={styles.muted}>
                    Прогноз достижения: ~{selected.forecastMonths} мес. при
                    текущем темпе
                  </p>
                ) : (
                  <p className={styles.muted}>
                    Прогноз пока недоступен (мало данных)
                  </p>
                )}

                {selected.sourceType === "virtual" &&
                selected.status !== "archived" ? (
                  <div className={styles.ops}>
                    <input
                      placeholder="Сумма, ₽"
                      value={opAmount}
                      onChange={(e) => setOpAmount(e.target.value)}
                      inputMode="decimal"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onContribute(selected.id)}
                    >
                      Пополнить
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onWithdraw(selected.id)}
                    >
                      Списать
                    </button>
                  </div>
                ) : null}

                {selected.status !== "archived" ? (
                  <div className={styles.linkBlock}>
                    {selected.linkedDepositId ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void onUnlink(selected.id)}
                      >
                        Отвязать вклад
                      </button>
                    ) : (
                      <>
                        <select
                          value={linkDepositId}
                          onChange={(e) => setLinkDepositId(e.target.value)}
                        >
                          <option value="">Выберите вклад</option>
                          {availableDeposits.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void onLink(selected.id)}
                        >
                          Привязать вклад
                        </button>
                      </>
                    )}
                  </div>
                ) : null}

                <div className={styles.ops}>
                  {selected.status === "active" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onComplete(selected.id)}
                    >
                      Отметить завершённой
                    </button>
                  ) : null}
                  {selected.status !== "archived" ? (
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={saving}
                      onClick={() => void onArchive(selected.id)}
                    >
                      В архив
                    </button>
                  ) : null}
                </div>

                <h3>История</h3>
                {history.length === 0 ? (
                  <p className={styles.muted}>Пока нет операций</p>
                ) : (
                  <ul className={styles.history}>
                    {history.map((item) => (
                      <li key={item.id}>
                        {new Date(item.date).toLocaleDateString("ru-RU")} —{" "}
                        {item.type === "deposit" ? "пополнение" : "списание"}{" "}
                        {formatRub(item.amount)}
                        {item.comment ? ` · ${item.comment}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
