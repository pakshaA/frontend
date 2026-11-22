"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { TransactionForm } from "@/components/dashboard/TransactionForm";
import {
  TransactionList,
  type TxPageSize,
} from "@/components/dashboard/TransactionList";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./page.module.css";
import {
  fetchAnalyticsSummary,
  fetchBalanceTrend,
  fetchByCategory,
  fetchCashflowForecast,
  fetchInsights,
  fetchTimeline,
  type AnalyticsInsights,
  type AnalyticsSummary,
  type BalanceScope,
  type BalanceTrendItem,
  type CategoryBreakdownItem,
  type ForecastItem,
  type TimelineItem,
} from "@/lib/analytics-api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import { fetchMe, logout, type AuthUser } from "@/lib/auth-api";
import { resolveDashboardCharts } from "@/lib/charts-catalog";
import {
  getPresetRange,
  resolveGranularity,
  resolveTimelineLimit,
  type PeriodPreset,
} from "@/lib/period";
import {
  fetchTransactions,
  type Transaction,
} from "@/lib/transactions-api";

const initialRange = getPresetRange("current_month");

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState<TxPageSize>(25);
  const [txTotal, setTxTotal] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [incomeByCategory, setIncomeByCategory] = useState<
    CategoryBreakdownItem[]
  >([]);
  const [expenseByCategory, setExpenseByCategory] = useState<
    CategoryBreakdownItem[]
  >([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [balanceTrend, setBalanceTrend] = useState<BalanceTrendItem[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [timelineGranularity, setTimelineGranularity] = useState("day");
  const [dataLoading, setDataLoading] = useState(false);

  const [periodPreset, setPeriodPreset] =
    useState<PeriodPreset>("current_month");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [balanceScope, setBalanceScope] = useState<BalanceScope>("all");

  const range = useMemo(() => ({ from, to }), [from, to]);
  const visibleCharts = useMemo(
    () => resolveDashboardCharts(user?.preferences.dashboardLayout),
    [user?.preferences.dashboardLayout],
  );

  const loadTransactions = useCallback(
    async (page: number, pageSize: TxPageSize) => {
      const result = await fetchTransactions({
        page,
        limit: pageSize,
        from: range.from,
        to: range.to,
        balanceScope,
      });
      setTransactions(result.items);
      setTxTotal(result.total);
      setTxTotalPages(Math.max(1, result.totalPages));
      if (result.page !== page) setTxPage(result.page);
      return result;
    },
    [range, balanceScope],
  );

  const loadPeriodData = useCallback(async () => {
    const granularity = resolveGranularity(range.from, range.to);
    const limit = resolveTimelineLimit(range.from, range.to, granularity);

    const [
      summaryResult,
      incomeResult,
      expenseResult,
      timelineResult,
      balanceResult,
      forecastResult,
      insightsResult,
    ] = await Promise.allSettled([
      fetchAnalyticsSummary({ range, balanceScope }),
      fetchByCategory({ type: "income", range, balanceScope }),
      fetchByCategory({ type: "expense", range, balanceScope }),
      fetchTimeline({ granularity, limit, range, balanceScope }),
      fetchBalanceTrend(range, { balanceScope }),
      fetchCashflowForecast(3),
      fetchInsights(range),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummary(null);
    }

    setIncomeByCategory(
      incomeResult.status === "fulfilled" ? incomeResult.value : [],
    );
    setExpenseByCategory(
      expenseResult.status === "fulfilled" ? expenseResult.value : [],
    );

    if (timelineResult.status === "fulfilled") {
      setTimeline(timelineResult.value.items);
      setTimelineGranularity(timelineResult.value.granularity);
    } else {
      setTimeline([]);
    }

    setBalanceTrend(
      balanceResult.status === "fulfilled" ? balanceResult.value.items : [],
    );
    setForecast(
      forecastResult.status === "fulfilled" ? forecastResult.value.items : [],
    );
    setInsights(
      insightsResult.status === "fulfilled" ? insightsResult.value : null,
    );
  }, [range, balanceScope]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    fetchMe(token)
      .then((me) => {
        setUser(me);
        document.documentElement.setAttribute(
          "data-theme",
          me.preferences.theme === "system" ? "dark" : me.preferences.theme,
        );
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    setTxPage(1);
  }, [range.from, range.to, balanceScope]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setDataLoading(true);
    loadPeriodData()
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setIncomeByCategory([]);
          setExpenseByCategory([]);
          setTimeline([]);
          setBalanceTrend([]);
          setForecast([]);
          setInsights(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, loadPeriodData]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setTxLoading(true);
    loadTransactions(txPage, txPageSize)
      .catch(() => {
        if (!cancelled) {
          setTransactions([]);
          setTxTotal(0);
          setTxTotalPages(1);
        }
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, txPage, txPageSize, loadTransactions]);

  useEffect(() => {
    function onSynced() {
      void loadPeriodData();
      void loadTransactions(txPage, txPageSize);
    }
    window.addEventListener("ft:offline-synced", onSynced);
    return () => window.removeEventListener("ft:offline-synced", onSynced);
  }, [loadPeriodData, loadTransactions, txPage, txPageSize]);

  function onPresetChange(preset: PeriodPreset) {
    setPeriodPreset(preset);
    if (preset === "custom") return;
    const next = getPresetRange(preset);
    setFrom(next.from);
    setTo(next.to);
  }

  async function onLogout() {
    await logout(getAccessToken());
    setUser(null);
    setSummary(null);
    setTransactions([]);
    setTxTotal(0);
    setTxTotalPages(1);
    setTxPage(1);
    setIncomeByCategory([]);
    setExpenseByCategory([]);
    setTimeline([]);
    setBalanceTrend([]);
    setForecast([]);
    setInsights(null);
  }

  async function refreshAll(page = txPage) {
    try {
      await Promise.all([loadPeriodData(), loadTransactions(page, txPageSize)]);
    } catch {
      /* ignore */
    }
  }

  function onTxPageSizeChange(size: TxPageSize) {
    setTxPageSize(size);
    setTxPage(1);
  }

  if (authLoading) {
    return <p className={dash.muted}>Проверяем сессию…</p>;
  }

  if (!user) {
    return (
      <div className={dash.guest}>
        <p className={styles.eyebrow}>Личные финансы</p>
        <h1 className={styles.title}>FinanceTracker</h1>
        <p className={styles.lead}>
          Войдите, чтобы видеть баланс и транзакции.
        </p>
        <div className={dash.guestActions}>
          <Link className={styles.primaryBtn} href="/login">
            Войти
          </Link>
          <Link className={styles.secondaryBtn} href="/register">
            Регистрация
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={dash.topBar}>
        <span className={dash.topBarEmail}>{user.email}</span>
        <div className={dash.topActions}>
          <Link className={styles.secondaryBtn} href="/profile">
            Профиль
          </Link>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onLogout}
          >
            Выйти
          </button>
        </div>
      </div>

      <PeriodFilter
        preset={periodPreset}
        from={from}
        to={to}
        onPresetChange={onPresetChange}
        onFromChange={(value) => {
          setPeriodPreset("custom");
          setFrom(value);
        }}
        onToChange={(value) => {
          setPeriodPreset("custom");
          setTo(value);
        }}
        balanceScope={balanceScope}
        onBalanceScopeChange={setBalanceScope}
      />

      <div className={dash.layout}>
        <div className={dash.leftColumn}>
          <BalanceCard
            summary={summary}
            loading={dataLoading}
            periodLabel={
              balanceScope === "deposits"
                ? "Остаток на активных вкладах"
                : balanceScope === "all"
                  ? "Все источники"
                  : `${from} — ${to}`
            }
            balanceScope={balanceScope}
          />

          <InsightsPanel insights={insights} loading={dataLoading} />

          <section className={dash.panel}>
            <div className={dash.panelHeader}>
              <h2>Транзакции</h2>
            </div>

            <TransactionForm
              onCreated={async () => {
                setTxPage(1);
                await refreshAll(1);
              }}
            />

            <TransactionList
              items={transactions}
              loading={txLoading}
              page={txPage}
              pageSize={txPageSize}
              total={txTotal}
              totalPages={txTotalPages}
              onPageChange={setTxPage}
              onPageSizeChange={onTxPageSizeChange}
              onDeleted={async () => {
                const nextPage =
                  transactions.length === 1 && txPage > 1
                    ? txPage - 1
                    : txPage;
                if (nextPage !== txPage) setTxPage(nextPage);
                await refreshAll(nextPage);
              }}
            />
          </section>

        </div>

        <aside className={dash.rightColumn}>
          <AnalyticsCharts
            incomeByCategory={incomeByCategory}
            expenseByCategory={expenseByCategory}
            timeline={timeline}
            balanceTrend={balanceTrend}
            forecast={forecast}
            granularity={timelineGranularity}
            loading={dataLoading}
            visibleCharts={visibleCharts}
          />
        </aside>
      </div>
    </div>
  );
}
