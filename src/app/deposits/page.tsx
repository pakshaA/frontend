"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/auth-api";
import {
  closeDeposit,
  createDeposit,
  fetchDeposits,
  fetchInterestHistory,
  topupDeposit,
  withdrawDeposit,
  type Deposit,
  type InterestPayment,
  type PayoutType,
} from "@/lib/deposits-api";
import {
  DEPOSIT_STATUS_LABELS,
  INTEREST_TYPE_LABELS,
  PAYOUT_TYPE_LABELS,
  labelOrRaw,
} from "@/lib/labels";
import { formatRub, rublesToKopecks } from "@/lib/money";
import styles from "./page.module.css";

function todayInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DepositsPage() {
  const [items, setItems] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("16");
  const [openDate, setOpenDate] = useState(todayInputValue);
  const [endDate, setEndDate] = useState("");
  const [payoutType, setPayoutType] = useState<PayoutType>("monthly");
  const [payoutDay, setPayoutDay] = useState("1");
  const [capitalization, setCapitalization] = useState(true);
  const [comment, setComment] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<InterestPayment[]>([]);
  const [opAmount, setOpAmount] = useState("");

  const authenticated = Boolean(getAccessToken());

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      setError("Войдите, чтобы управлять вкладами");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchDeposits());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadHistory(id: string) {
    try {
      setHistory(await fetchInterestHistory(id));
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
      const rubles = Number(amount.replace(",", "."));
      if (!Number.isFinite(rubles) || rubles <= 0) {
        throw new Error("Введите сумму больше 0");
      }
      const created = await createDeposit({
        name: name.trim(),
        bank: bank.trim(),
        initialAmount: rublesToKopecks(rubles),
        interestRate: Number(rate),
        openDate: new Date(openDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        payoutType,
        payoutDay: payoutType === "monthly" ? Number(payoutDay) : undefined,
        capitalization,
        comment: comment.trim() || undefined,
      });
      setItems((prev) => [created, ...prev]);
      setName("");
      setBank("");
      setAmount("");
      setComment("");
      setMessage("Вклад создан");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onTopup(id: string) {
    const rubles = Number(opAmount.replace(",", "."));
    if (!Number.isFinite(rubles) || rubles <= 0) {
      setError("Введите сумму операции");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await topupDeposit(id, rublesToKopecks(rubles));
      setItems((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setOpAmount("");
      setMessage("Вклад пополнен");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onWithdraw(id: string) {
    const rubles = Number(opAmount.replace(",", "."));
    if (!Number.isFinite(rubles) || rubles <= 0) {
      setError("Введите сумму операции");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await withdrawDeposit(id, rublesToKopecks(rubles));
      setItems((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setOpAmount("");
      setMessage("Частичное снятие выполнено");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onClose(id: string) {
    const ok = window.confirm("Закрыть вклад и вывести весь остаток?");
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const { deposit, payout } = await closeDeposit(id);
      setItems((prev) => prev.map((d) => (d.id === id ? deposit : d)));
      setMessage(`Вклад закрыт, выплачено ${formatRub(payout)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const active = items.filter((d) => d.status === "active");
  const closed = items.filter((d) => d.status === "closed");
  const selected = items.find((d) => d.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Вклады</h1>
      <p className={styles.lead}>
        Учёт депозитов, пополнение/снятие, автоначисление процентов (cron
        00:00 UTC).
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
          <h2>Новый вклад</h2>
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
              Банк
              <input
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                required
              />
            </label>
          </div>
          <div className={styles.row2}>
            <label>
              Сумма, ₽
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
            <label>
              Ставка, % годовых
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                required
              />
            </label>
          </div>
          <div className={styles.row2}>
            <label>
              Дата открытия
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                required
              />
            </label>
            <label>
              Дата окончания
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required={payoutType === "end_of_term"}
              />
            </label>
          </div>
          <div className={styles.row2}>
            <label>
              Тип выплат
              <select
                value={payoutType}
                onChange={(e) => setPayoutType(e.target.value as PayoutType)}
              >
                <option value="monthly">Ежемесячно</option>
                <option value="daily">Ежедневно</option>
                <option value="end_of_term">В конце срока</option>
              </select>
            </label>
            {payoutType === "monthly" ? (
              <label>
                День выплаты (1–31)
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={payoutDay}
                  onChange={(e) => setPayoutDay(e.target.value)}
                  required
                />
              </label>
            ) : (
              <label>
                Комментарий
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
            )}
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={capitalization}
              onChange={(e) => setCapitalization(e.target.checked)}
            />
            Капитализация (проценты увеличивают тело вклада)
          </label>
          {payoutType === "monthly" ? (
            <label>
              Комментарий
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
          ) : null}
          <button type="submit" disabled={saving}>
            {saving ? "Создаём…" : "Создать вклад"}
          </button>
        </form>
      ) : null}

      {!loading && authenticated ? (
        <div className={styles.grid}>
          <section className={styles.listCard}>
            <h2>Активные ({active.length})</h2>
            {active.length === 0 ? (
              <p className={styles.muted}>Пока нет вкладов</p>
            ) : (
              <ul>
                {active.map((deposit) => (
                  <li key={deposit.id}>
                    <button
                      type="button"
                      className={styles.depositBtn}
                      onClick={() => {
                        setSelectedId(deposit.id);
                        void loadHistory(deposit.id);
                      }}
                    >
                      <strong>{deposit.name}</strong>
                      <span>
                        {deposit.bank} · {deposit.interestRate}% ·{" "}
                        {formatRub(deposit.currentAmount)}
                        {deposit.linkedGoal
                          ? ` · цель: ${deposit.linkedGoal.name}`
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {closed.length > 0 ? (
              <>
                <h2 className={styles.closedTitle}>
                  Закрытые ({closed.length})
                </h2>
                <ul>
                  {closed.map((deposit) => (
                    <li key={deposit.id} className={styles.closedItem}>
                      {deposit.name} — {formatRub(deposit.initialAmount)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <section className={styles.detailCard}>
            <h2>Детали</h2>
            {!selected ? (
              <p className={styles.muted}>Выберите вклад слева</p>
            ) : (
              <>
                <p>
                  <strong>{selected.name}</strong> ({selected.bank})
                </p>
                <p>Текущая сумма: {formatRub(selected.currentAmount)}</p>
                <p>
                  Ставка: {selected.interestRate}% ·{" "}
                  {PAYOUT_TYPE_LABELS[selected.payoutType]}
                  {selected.capitalization ? " · капитализация" : ""}
                </p>
                <p>Статус: {DEPOSIT_STATUS_LABELS[selected.status]}</p>
                <p>
                  Цель:{" "}
                  {selected.linkedGoal ? (
                    <Link href="/goals">{selected.linkedGoal.name}</Link>
                  ) : (
                    "не привязана"
                  )}
                </p>

                {selected.status === "active" ? (
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
                      onClick={() => void onTopup(selected.id)}
                    >
                      Пополнить
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onWithdraw(selected.id)}
                    >
                      Снять
                    </button>
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={saving}
                      onClick={() => void onClose(selected.id)}
                    >
                      Закрыть
                    </button>
                  </div>
                ) : null}

                <h3>История процентов</h3>
                {history.length === 0 ? (
                  <p className={styles.muted}>Пока нет начислений</p>
                ) : (
                  <ul className={styles.history}>
                    {history.map((item) => (
                      <li key={item.id}>
                        {new Date(item.date).toLocaleDateString("ru-RU")} —{" "}
                        {formatRub(item.amount)} (
                        {labelOrRaw(INTEREST_TYPE_LABELS, item.type)})
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
