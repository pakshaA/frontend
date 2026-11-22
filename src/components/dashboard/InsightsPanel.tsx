"use client";

import Link from "next/link";
import type { AnalyticsInsights } from "@/lib/analytics-api";
import { formatRub } from "@/lib/money";
import styles from "./dashboard.module.css";

type InsightsPanelProps = {
  insights: AnalyticsInsights | null;
  loading?: boolean;
};

export function InsightsPanel({ insights, loading }: InsightsPanelProps) {
  if (loading) {
    return <p className={styles.muted}>Загрузка инсайтов…</p>;
  }

  if (!insights) {
    return null;
  }

  return (
    <section className={styles.chartCard}>
      <h3>Инсайты</h3>

      <div className={styles.insightsGrid}>
        <div>
          <p className={styles.insightLabel}>Цели</p>
          <p>
            Активных: {insights.goals.activeCount}
            {insights.goals.atRiskCount > 0
              ? ` · под риском: ${insights.goals.atRiskCount}`
              : ""}
          </p>
          {insights.goals.items.length > 0 ? (
            <ul className={styles.insightList}>
              {insights.goals.items.map((goal) => (
                <li key={goal.id}>
                  {goal.name} — {goal.progress}%
                  {goal.atRisk ? " ⚠" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>
              <Link href="/goals">Создать цель</Link>
            </p>
          )}
        </div>

        <div>
          <p className={styles.insightLabel}>Подписки</p>
          <p>
            ~{formatRub(insights.subscriptions.estimatedMonthlySpend)} / мес
          </p>
          {insights.subscriptions.upcoming.length > 0 ? (
            <ul className={styles.insightList}>
              {insights.subscriptions.upcoming.map((sub) => (
                <li key={sub.id}>
                  {sub.name} — {formatRub(sub.amount)} ·{" "}
                  {new Date(sub.nextPaymentDate).toLocaleDateString("ru-RU")}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Ближайших списаний нет</p>
          )}
        </div>

        <div>
          <p className={styles.insightLabel}>Платежи (7 дней)</p>
          <p>
            {insights.scheduledPayments.upcomingCount} шт ·{" "}
            {formatRub(insights.scheduledPayments.upcomingTotal)}
          </p>
          {insights.scheduledPayments.upcoming.length > 0 ? (
            <ul className={styles.insightList}>
              {insights.scheduledPayments.upcoming.map((pay) => (
                <li key={pay.id}>
                  {pay.description} — {formatRub(pay.amount)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
