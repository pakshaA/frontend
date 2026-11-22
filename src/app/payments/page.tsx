"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/auth-api";
import {
  createCategory,
  fetchCategories,
  type Category,
} from "@/lib/categories-api";
import { fetchCards, type Card } from "@/lib/cards-api";
import {
  FREQUENCY_LABELS,
  SCHEDULED_PRIORITY_LABELS,
  SCHEDULED_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/labels";
import { formatRub, rublesToKopecks } from "@/lib/money";
import {
  createScheduledPayment,
  createSubscription,
  deleteScheduledPayment,
  deleteSubscription,
  fetchAvailableBalance,
  fetchScheduledPayments,
  fetchSubscriptions,
  payScheduledPayment,
  paySubscriptionManual,
  updateSubscription,
  type AvailableBalance,
  type ScheduledPayment,
  type ScheduledPaymentPriority,
  type Subscription,
  type SubscriptionFrequency,
} from "@/lib/payments-api";
import styles from "./page.module.css";

type Tab = "subscriptions" | "scheduled" | "calendar";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU");
}

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [balance, setBalance] = useState<AvailableBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subFrequency, setSubFrequency] =
    useState<SubscriptionFrequency>("monthly");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [subNextDate, setSubNextDate] = useState(todayInputValue);
  const [subAuto, setSubAuto] = useState(true);
  const [subNotify, setSubNotify] = useState("3");
  const [subComment, setSubComment] = useState("");
  const [subCardId, setSubCardId] = useState("");
  const [creatingSubCategory, setCreatingSubCategory] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayInputValue);
  const [payDesc, setPayDesc] = useState("");
  const [payPriority, setPayPriority] =
    useState<ScheduledPaymentPriority>("required");
  const [payCategoryId, setPayCategoryId] = useState("");
  const [payCardId, setPayCardId] = useState("");
  const [creatingPayCategory, setCreatingPayCategory] = useState(false);
  const [newPayCategoryName, setNewPayCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);

  const authenticated = Boolean(getAccessToken());

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Войдите, чтобы управлять платежами");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [subs, pays, cats, cardList, bal] = await Promise.all([
        fetchSubscriptions(),
        fetchScheduledPayments(),
        fetchCategories({ type: "expense" }),
        fetchCards(),
        fetchAvailableBalance(),
      ]);
      setSubscriptions(subs);
      setScheduled(pays);
      setCategories(cats);
      setCards(cardList);
      setBalance(bal);
      setSubCategoryId((prev) => prev || cats[0]?.id || "");
      const cash = cardList.find((c) => c.isDefault) ?? cardList[0];
      if (cash) {
        setSubCardId((prev) => prev || cash.id);
        setPayCardId((prev) => prev || cash.id);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarGroups = useMemo(() => {
    const map = new Map<
      string,
      Array<{ kind: "sub" | "pay"; title: string; amount: number }>
    >();

    for (const sub of subscriptions.filter((s) => s.status === "active")) {
      const key = dayKey(sub.nextPaymentDate);
      const list = map.get(key) ?? [];
      list.push({
        kind: "sub",
        title: `Подписка: ${sub.name}`,
        amount: sub.amount,
      });
      map.set(key, list);
    }

    for (const pay of scheduled.filter((p) => p.status === "pending")) {
      const key = dayKey(pay.dueDate);
      const list = map.get(key) ?? [];
      list.push({
        kind: "pay",
        title: pay.description,
        amount: pay.amount,
      });
      map.set(key, list);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 30);
  }, [subscriptions, scheduled]);

  async function onCreateExpenseCategory(target: "sub" | "pay") {
    const name =
      target === "sub" ? newSubCategoryName.trim() : newPayCategoryName.trim();
    if (!name) {
      setError("Введите название категории");
      return;
    }

    setCategorySaving(true);
    setError(null);
    setMessage(null);
    try {
      const created = await createCategory({ name, type: "expense" });
      setCategories((prev) => [...prev, created]);
      if (target === "sub") {
        setSubCategoryId(created.id);
        setNewSubCategoryName("");
        setCreatingSubCategory(false);
      } else {
        setPayCategoryId(created.id);
        setNewPayCategoryName("");
        setCreatingPayCategory(false);
      }
      setMessage(`Категория «${created.name}» создана`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCategorySaving(false);
    }
  }

  async function onCreateSubscription(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const rubles = Number(subAmount.replace(",", "."));
      if (!Number.isFinite(rubles) || rubles <= 0) {
        throw new Error("Введите сумму больше 0");
      }
      if (!subCategoryId) throw new Error("Выберите категорию расхода");
      const created = await createSubscription({
        name: subName.trim(),
        amount: rublesToKopecks(rubles),
        frequency: subFrequency,
        categoryId: subCategoryId,
        nextPaymentDate: new Date(subNextDate).toISOString(),
        startDate: new Date(subNextDate).toISOString(),
        autoCreateTransaction: subAuto,
        notifyBeforeDays: Number(subNotify) || 0,
        comment: subComment.trim() || undefined,
        cardId: subCardId || null,
      });
      setSubscriptions((prev) =>
        [...prev, created].sort(
          (a, b) =>
            new Date(a.nextPaymentDate).getTime() -
            new Date(b.nextPaymentDate).getTime(),
        ),
      );
      setSubName("");
      setSubCardId("");
      setSubAmount("");
      setSubComment("");
      setMessage("Подписка создана");
      setBalance(await fetchAvailableBalance());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onCreateScheduled(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const rubles = Number(payAmount.replace(",", "."));
      if (!Number.isFinite(rubles) || rubles <= 0) {
        throw new Error("Введите сумму больше 0");
      }
      const created = await createScheduledPayment({
        amount: rublesToKopecks(rubles),
        dueDate: new Date(payDate).toISOString(),
        description: payDesc.trim(),
        priority: payPriority,
        categoryId: payCategoryId || null,
        cardId: payCardId || null,
      });
      setScheduled((prev) =>
        [...prev, created].sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        ),
      );
      setPayAmount("");
      setPayDesc("");
      setPayCardId("");
      setMessage("Платёж запланирован");
      setBalance(await fetchAvailableBalance());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onPaySubscription(id: string) {
    setSaving(true);
    setError(null);
    try {
      const { subscription } = await paySubscriptionManual(id);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? subscription : s)),
      );
      setMessage("Подписка оплачена, транзакция создана");
      setBalance(await fetchAvailableBalance());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onToggleAuto(sub: Subscription) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSubscription(sub.id, {
        autoCreateTransaction: !sub.autoCreateTransaction,
      });
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? updated : s)),
      );
      setMessage(
        updated.autoCreateTransaction
          ? "Автосписание включено"
          : "Автосписание выключено",
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePause(sub: Subscription) {
    setSaving(true);
    setError(null);
    try {
      const next = sub.status === "paused" ? "active" : "paused";
      const updated = await updateSubscription(sub.id, { status: next });
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? updated : s)),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onCancelSubscription(id: string) {
    if (!window.confirm("Отменить подписку?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteSubscription(id);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "cancelled" as const } : s,
        ),
      );
      setMessage("Подписка отменена");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onPayScheduled(id: string) {
    setSaving(true);
    setError(null);
    try {
      const { payment } = await payScheduledPayment(id);
      setScheduled((prev) => prev.map((p) => (p.id === id ? payment : p)));
      setMessage("Платёж оплачен");
      setBalance(await fetchAvailableBalance());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onCancelScheduled(id: string) {
    if (!window.confirm("Отменить запланированный платёж?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteScheduledPayment(id);
      setScheduled((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "cancelled" as const } : p,
        ),
      );
      setBalance(await fetchAvailableBalance());
      setMessage("Платёж отменён");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const activeSubs = subscriptions.filter((s) => s.status !== "cancelled");
  const pendingPays = scheduled.filter((p) => p.status === "pending");

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Платежи</h1>
      <p className={styles.lead}>
        Подписки с ручной оплатой и автосписанием, запланированные платежи и
        доступный баланс с учётом резервов.
      </p>

      {!authenticated ? (
        <p className={styles.muted}>
          <Link href="/login">Войти</Link>, чтобы продолжить.
        </p>
      ) : null}

      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p className={styles.muted}>Загрузка…</p> : null}

      {authenticated && balance ? (
        <div className={styles.balanceRow}>
          <div className={styles.balanceCard}>
            <span>Баланс</span>
            <strong>{formatRub(balance.balance)}</strong>
          </div>
          <div className={styles.balanceCard}>
            <span>Резерв (обязательные)</span>
            <strong>{formatRub(balance.reservedRequired)}</strong>
          </div>
          <div className={styles.balanceCard}>
            <span>Доступно</span>
            <strong>{formatRub(balance.availableBalance)}</strong>
          </div>
          <div className={styles.balanceCard}>
            <span>Опциональный резерв</span>
            <strong>{formatRub(balance.reservedOptional)}</strong>
          </div>
        </div>
      ) : null}

      {authenticated ? (
        <div className={styles.tabs}>
          <button
            type="button"
            data-active={tab === "subscriptions"}
            onClick={() => setTab("subscriptions")}
          >
            Подписки
          </button>
          <button
            type="button"
            data-active={tab === "scheduled"}
            onClick={() => setTab("scheduled")}
          >
            Будущие платежи
          </button>
          <button
            type="button"
            data-active={tab === "calendar"}
            onClick={() => setTab("calendar")}
          >
            Календарь
          </button>
        </div>
      ) : null}

      {authenticated && tab === "subscriptions" ? (
        <>
          <form className={styles.form} onSubmit={onCreateSubscription}>
            <h2>Новая подписка</h2>
            <div className={styles.row2}>
              <label>
                Название
                <input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  required
                />
              </label>
              <label>
                Сумма, ₽
                <input
                  value={subAmount}
                  onChange={(e) => setSubAmount(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>
            </div>
            <div className={styles.row2}>
              <label>
                Периодичность
                <select
                  value={subFrequency}
                  onChange={(e) =>
                    setSubFrequency(e.target.value as SubscriptionFrequency)
                  }
                >
                  <option value="weekly">Еженедельно</option>
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarterly">Ежеквартально</option>
                  <option value="yearly">Ежегодно</option>
                </select>
              </label>
              <label>
                Следующий платёж
                <input
                  type="date"
                  value={subNextDate}
                  onChange={(e) => setSubNextDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className={styles.categoryBlock}>
              <div className={styles.categoryHeader}>
                <span>Категория расхода</span>
                {!creatingSubCategory ? (
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => {
                      setCreatingSubCategory(true);
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
                      setCreatingSubCategory(false);
                      setNewSubCategoryName("");
                    }}
                  >
                    К списку
                  </button>
                )}
              </div>
              {creatingSubCategory ? (
                <div className={styles.newCategoryRow}>
                  <input
                    value={newSubCategoryName}
                    onChange={(e) => setNewSubCategoryName(e.target.value)}
                    placeholder="Например, Netflix"
                    maxLength={80}
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={categorySaving}
                    onClick={() => void onCreateExpenseCategory("sub")}
                  >
                    {categorySaving ? "…" : "Создать"}
                  </button>
                </div>
              ) : (
                <select
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  required
                >
                  {categories.length === 0 ? (
                    <option value="">Нет категорий</option>
                  ) : null}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.row2}>
              <label>
                Напомнить за (дней)
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={subNotify}
                  onChange={(e) => setSubNotify(e.target.value)}
                />
              </label>
              <label>
                Комментарий
                <input
                  value={subComment}
                  onChange={(e) => setSubComment(e.target.value)}
                />
              </label>
            </div>
            <label>
              С какой карты списывать
              <select
                value={subCardId}
                onChange={(e) => setSubCardId(e.target.value)}
              >
                <option value="">Не привязано</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} · {card.bank}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={subAuto}
                onChange={(e) => setSubAuto(e.target.checked)}
              />
              Автоматически создавать транзакцию в день платежа
            </label>
            <button type="submit" disabled={saving || !subCategoryId}>
              {saving ? "Сохраняем…" : "Создать подписку"}
            </button>
            {!subCategoryId ? (
              <p className={styles.muted}>
                Выберите категорию или создайте новую кнопкой «+ Новая».
              </p>
            ) : null}
          </form>

          <section className={styles.listCard}>
            <h2>Подписки ({activeSubs.length})</h2>
            {activeSubs.length === 0 ? (
              <p className={styles.muted}>Пока нет подписок</p>
            ) : (
              <ul>
                {activeSubs.map((sub) => (
                  <li key={sub.id} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <strong>{sub.name}</strong>
                      <span>{formatRub(sub.amount)}</span>
                    </div>
                    <p className={styles.meta}>
                      <span className={styles.badge}>
                        {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                      </span>
                      {FREQUENCY_LABELS[sub.frequency]} · следующий{" "}
                      {formatDate(sub.nextPaymentDate)}
                      {sub.autoCreateTransaction
                        ? " · автосписание"
                        : " · только вручную"}
                      {sub.notifyBeforeDays > 0
                        ? ` · напоминание за ${sub.notifyBeforeDays} дн.`
                        : ""}
                    </p>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        disabled={saving || sub.status === "cancelled"}
                        onClick={() => void onPaySubscription(sub.id)}
                      >
                        Оплатить сейчас
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={saving}
                        onClick={() => void onToggleAuto(sub)}
                      >
                        {sub.autoCreateTransaction
                          ? "Выкл. авто"
                          : "Вкл. авто"}
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={saving}
                        onClick={() => void onTogglePause(sub)}
                      >
                        {sub.status === "paused" ? "Возобновить" : "Пауза"}
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        disabled={saving}
                        onClick={() => void onCancelSubscription(sub.id)}
                      >
                        Отменить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {authenticated && tab === "scheduled" ? (
        <>
          <form className={styles.form} onSubmit={onCreateScheduled}>
            <h2>Новый будущий платёж</h2>
            <div className={styles.row2}>
              <label>
                Описание
                <input
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  required
                />
              </label>
              <label>
                Сумма, ₽
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>
            </div>
            <div className={styles.row2}>
              <label>
                Дата
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </label>
              <label>
                Приоритет
                <select
                  value={payPriority}
                  onChange={(e) =>
                    setPayPriority(e.target.value as ScheduledPaymentPriority)
                  }
                >
                  <option value="required">Обязательный</option>
                  <option value="optional">Опциональный</option>
                </select>
              </label>
            </div>
            <div className={styles.categoryBlock}>
              <div className={styles.categoryHeader}>
                <span>Категория расхода (необязательно)</span>
                {!creatingPayCategory ? (
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => {
                      setCreatingPayCategory(true);
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
                      setCreatingPayCategory(false);
                      setNewPayCategoryName("");
                    }}
                  >
                    К списку
                  </button>
                )}
              </div>
              {creatingPayCategory ? (
                <div className={styles.newCategoryRow}>
                  <input
                    value={newPayCategoryName}
                    onChange={(e) => setNewPayCategoryName(e.target.value)}
                    placeholder="Например, Коммуналка"
                    maxLength={80}
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={categorySaving}
                    onClick={() => void onCreateExpenseCategory("pay")}
                  >
                    {categorySaving ? "…" : "Создать"}
                  </button>
                </div>
              ) : (
                <select
                  value={payCategoryId}
                  onChange={(e) => setPayCategoryId(e.target.value)}
                >
                  <option value="">Автоматически</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <label>
              С какой карты оплатить
              <select
                value={payCardId}
                onChange={(e) => setPayCardId(e.target.value)}
              >
                <option value="">Не привязано</option>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} · {card.bank}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={saving}>
              {saving ? "Сохраняем…" : "Запланировать"}
            </button>
          </form>

          <section className={styles.listCard}>
            <h2>Ожидают оплаты ({pendingPays.length})</h2>
            {pendingPays.length === 0 ? (
              <p className={styles.muted}>Нет запланированных платежей</p>
            ) : (
              <ul>
                {pendingPays.map((pay) => (
                  <li key={pay.id} className={styles.item}>
                    <div className={styles.itemHeader}>
                      <strong>{pay.description}</strong>
                      <span>{formatRub(pay.amount)}</span>
                    </div>
                    <p className={styles.meta}>
                      <span className={styles.badge}>
                        {SCHEDULED_PRIORITY_LABELS[pay.priority]}
                      </span>
                      {formatDate(pay.dueDate)} ·{" "}
                      {SCHEDULED_STATUS_LABELS[pay.status]}
                    </p>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void onPayScheduled(pay.id)}
                      >
                        Оплатить
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        disabled={saving}
                        onClick={() => void onCancelScheduled(pay.id)}
                      >
                        Отменить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {authenticated && tab === "calendar" ? (
        <section className={styles.listCard}>
          <h2>Календарь ближайших платежей</h2>
          {calendarGroups.length === 0 ? (
            <p className={styles.muted}>Нет предстоящих платежей</p>
          ) : (
            <div className={styles.calendar}>
              {calendarGroups.map(([date, items]) => (
                <div key={date} className={styles.calendarDay}>
                  <strong>{formatDate(date)}</strong>
                  <ul>
                    {items.map((item, idx) => (
                      <li key={`${date}-${idx}`}>
                        {item.title} — {formatRub(item.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
