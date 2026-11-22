import { formatRub } from "@/lib/money";
import type { AnalyticsSummary, BalanceScope } from "@/lib/analytics-api";
import styles from "./dashboard.module.css";

type BalanceCardProps = {
  summary: AnalyticsSummary | null;
  loading?: boolean;
  periodLabel?: string;
  balanceScope?: BalanceScope;
};

export function BalanceCard({
  summary,
  loading,
  periodLabel,
  balanceScope = "all",
}: BalanceCardProps) {
  const balance = summary?.balance ?? 0;
  const breakdown = summary?.breakdown ?? [];
  const showBreakdown =
    balanceScope === "all" && breakdown.length > 0;

  return (
    <section className={styles.balanceCard}>
      <div className={styles.balanceHeader}>
        <p className={styles.balanceLabel}>Баланс</p>
      </div>
      {periodLabel ? (
        <p className={styles.balancePeriod}>{periodLabel}</p>
      ) : null}
      {loading && !summary ? (
        <p className={styles.balanceValue}>…</p>
      ) : (
        <div
          className={
            showBreakdown
              ? `${styles.balanceValueWrap} ${styles.balanceValueHover}`
              : styles.balanceValueWrap
          }
        >
          <p
            className={styles.balanceValue}
            data-negative={balance < 0 ? "true" : "false"}
          >
            {formatRub(balance)}
          </p>
          {showBreakdown ? (
            <div className={styles.balanceTooltip} role="tooltip">
              <p className={styles.balanceTooltipTitle}>Расшифровка</p>
              <ul className={styles.balanceTooltipList}>
                {breakdown.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <span>
                      {item.kind === "deposit" ? "Вклад" : "Карта"} «
                      {item.name}»
                      {item.bank ? ` · ${item.bank}` : ""}
                    </span>
                    <strong>{formatRub(item.amount)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {summary && balanceScope !== "deposits" ? (
        <div className={styles.balanceMeta}>
          <span className={styles.income}>
            +{formatRub(summary.totalIncome)}
          </span>
          <span className={styles.expense}>
            −{formatRub(summary.totalExpense)}
          </span>
        </div>
      ) : null}
      {summary && balanceScope === "deposits" && summary.depositsCount != null ? (
        <p className={styles.balancePeriod}>
          Активных вкладов: {summary.depositsCount}
        </p>
      ) : null}
    </section>
  );
}
