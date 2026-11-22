"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import {
  fetchBalanceTrend,
  fetchByCategory,
  fetchCashflowForecast,
  fetchTimeline,
  type BalanceScope,
  type BalanceTrendItem,
  type CategoryBreakdownItem,
  type ForecastItem,
  type TimelineItem,
} from "@/lib/analytics-api";
import { getAccessToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/auth-api";
import {
  CHARTS,
  getChartById,
  resolveDashboardCharts,
  type ChartId,
} from "@/lib/charts-catalog";
import { kopecksToRubles } from "@/lib/money";
import {
  getPresetRange,
  resolveGranularity,
  resolveTimelineLimit,
  type PeriodPreset,
} from "@/lib/period";
import { fetchProfile, updatePreferences } from "@/lib/users-api";
import styles from "./page.module.css";

const INCOME_COLORS = [
  "#7fd99a",
  "#4caf7a",
  "#2f9e5f",
  "#1f7a4a",
  "#a8e6bf",
  "#66c28a",
];

const EXPENSE_COLORS = [
  "#e06c75",
  "#c94a55",
  "#f0a0a6",
  "#d45d67",
  "#ff8a80",
  "#b03a45",
];

const initialRange = getPresetRange("current_month");

function formatPeriod(period: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    const [, m, d] = period.split("-");
    return `${d}.${m}`;
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-");
    return `${m}.${y.slice(2)}`;
  }
  return period;
}

function moneyTooltip(value: unknown) {
  return `${Number(value).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  })} ₽`;
}

export default function ChartsPage() {
  const [selectedId, setSelectedId] = useState<ChartId>("income-vs-expense");
  const [periodPreset, setPeriodPreset] =
    useState<PeriodPreset>("current_month");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [balanceScope, setBalanceScope] = useState<BalanceScope>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardCharts, setDashboardCharts] = useState<ChartId[]>(
    resolveDashboardCharts(undefined),
  );
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutMessage, setLayoutMessage] = useState<string | null>(null);

  const [incomeByCategory, setIncomeByCategory] = useState<
    CategoryBreakdownItem[]
  >([]);
  const [expenseByCategory, setExpenseByCategory] = useState<
    CategoryBreakdownItem[]
  >([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineGranularity, setTimelineGranularity] = useState("day");
  const [balanceTrend, setBalanceTrend] = useState<BalanceTrendItem[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);

  const authenticated = Boolean(getAccessToken());
  const chart = getChartById(selectedId);
  const range = useMemo(() => ({ from, to }), [from, to]);
  const onHome = dashboardCharts.includes(selectedId);

  useEffect(() => {
    if (!getAccessToken()) return;
    fetchProfile()
      .then((user) => {
        setDashboardCharts(
          resolveDashboardCharts(user.preferences.dashboardLayout),
        );
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  async function toggleOnHome(checked: boolean) {
    if (
      !checked &&
      dashboardCharts.length === 1 &&
      dashboardCharts[0] === selectedId
    ) {
      setLayoutMessage("На главной нужна хотя бы одна диаграмма");
      return;
    }

    const next = checked
      ? [...new Set([...dashboardCharts, selectedId])]
      : dashboardCharts.filter((id) => id !== selectedId);

    const previous = dashboardCharts;
    setDashboardCharts(next);
    setSavingLayout(true);
    setLayoutMessage(null);
    setError(null);
    try {
      const user = await updatePreferences({ dashboardLayout: next });
      setDashboardCharts(
        resolveDashboardCharts(user.preferences.dashboardLayout),
      );
      setLayoutMessage(
        checked
          ? "Диаграмма добавлена на главную"
          : "Диаграмма убрана с главной",
      );
    } catch (err) {
      setDashboardCharts(previous);
      setError(getErrorMessage(err));
    } finally {
      setSavingLayout(false);
    }
  }

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setError("Войдите, чтобы смотреть диаграммы");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const granularity = resolveGranularity(range.from, range.to);
      const limit = resolveTimelineLimit(range.from, range.to, granularity);

      if (selectedId === "income-by-category") {
        setIncomeByCategory(
          await fetchByCategory({ type: "income", range, balanceScope }),
        );
      } else if (
        selectedId === "expense-by-category" ||
        selectedId === "top-expenses"
      ) {
        setExpenseByCategory(
          await fetchByCategory({ type: "expense", range, balanceScope }),
        );
      } else if (selectedId === "income-vs-expense") {
        const data = await fetchTimeline({
          granularity,
          limit,
          range,
          balanceScope,
        });
        setTimeline(data.items);
        setTimelineGranularity(data.granularity);
      } else if (selectedId === "balance-trend") {
        const data = await fetchBalanceTrend(range, { balanceScope });
        setBalanceTrend(data.items);
      } else if (selectedId === "cashflow-forecast") {
        const data = await fetchCashflowForecast(3);
        setForecast(data.items);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range, selectedId, balanceScope]);

  useEffect(() => {
    void load();
  }, [load]);

  function onPresetChange(preset: PeriodPreset) {
    setPeriodPreset(preset);
    if (preset === "custom") return;
    const next = getPresetRange(preset);
    setFrom(next.from);
    setTo(next.to);
  }

  const pieIncome = useMemo(
    () =>
      incomeByCategory.map((item) => ({
        name: item.categoryName,
        value: kopecksToRubles(item.total),
      })),
    [incomeByCategory],
  );

  const pieExpense = useMemo(
    () =>
      expenseByCategory.map((item) => ({
        name: item.categoryName,
        value: kopecksToRubles(item.total),
      })),
    [expenseByCategory],
  );

  const topExpenses = useMemo(
    () =>
      [...expenseByCategory]
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
        .map((item) => ({
          name: item.categoryName,
          amount: kopecksToRubles(item.total),
        }))
        .reverse(),
    [expenseByCategory],
  );

  const barData = useMemo(
    () =>
      timeline.map((item) => ({
        period: formatPeriod(item.period),
        income: kopecksToRubles(item.income),
        expense: kopecksToRubles(item.expense),
      })),
    [timeline],
  );

  const balanceData = useMemo(
    () =>
      balanceTrend.map((item) => ({
        period: formatPeriod(item.period),
        balance: kopecksToRubles(item.balance),
        net: kopecksToRubles(item.net),
      })),
    [balanceTrend],
  );

  const forecastData = useMemo(
    () =>
      forecast.map((item) => ({
        period: formatPeriod(item.period),
        income: kopecksToRubles(item.projectedIncome),
        expense: kopecksToRubles(item.projectedExpense),
        balance: kopecksToRubles(item.projectedBalance),
      })),
    [forecast],
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Диаграммы</h1>
      <p className={styles.lead}>
        Выберите диаграмму слева. Справа — график за период. Галочкой можно
        решить, показывать ли её на главной.
      </p>

      {!authenticated ? (
        <p className={styles.muted}>
          <Link href="/login">Войти</Link>, чтобы продолжить.
        </p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      {authenticated ? (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <p className={styles.sidebarTitle}>Список</p>
            <ul className={styles.chartList}>
              {CHARTS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.chartBtn}
                    data-active={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className={styles.chartBtnRow}>
                      <strong>{item.title}</strong>
                      {dashboardCharts.includes(item.id) ? (
                        <span className={styles.onHomeBadge}>На главной</span>
                      ) : null}
                    </span>
                    <span>{item.short}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className={styles.viewer}>
            <div className={styles.viewerHeader}>
              <h2>{chart.title}</h2>
              <p className={styles.description}>{chart.description}</p>
              <label className={styles.homeToggle}>
                <input
                  type="checkbox"
                  checked={onHome}
                  disabled={savingLayout}
                  onChange={(e) => void toggleOnHome(e.target.checked)}
                />
                Показывать на главной
              </label>
              {layoutMessage ? (
                <p className={styles.layoutOk}>{layoutMessage}</p>
              ) : null}
            </div>

            {chart.usesPeriod ? (
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
            ) : (
              <p className={styles.periodNote}>
                Период для этой диаграммы не выбирается — прогноз всегда на
                следующие 3 месяца.
              </p>
            )}

            <div className={styles.chartArea}>
              {loading ? (
                <p className={styles.muted}>Загрузка…</p>
              ) : selectedId === "income-by-category" ? (
                pieIncome.length === 0 ? (
                  <p className={styles.muted}>Нет доходов за период</p>
                ) : (
                  <div className={styles.chartBox}>
                    <ResponsiveContainer width="100%" height={360}>
                      <PieChart>
                        <Pie
                          data={pieIncome}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={2}
                        >
                          {pieIncome.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                INCOME_COLORS[index % INCOME_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={moneyTooltip} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : selectedId === "expense-by-category" ? (
                pieExpense.length === 0 ? (
                  <p className={styles.muted}>Нет расходов за период</p>
                ) : (
                  <div className={styles.chartBox}>
                    <ResponsiveContainer width="100%" height={360}>
                      <PieChart>
                        <Pie
                          data={pieExpense}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={2}
                        >
                          {pieExpense.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                EXPENSE_COLORS[index % EXPENSE_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={moneyTooltip} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : selectedId === "top-expenses" ? (
                topExpenses.length === 0 ? (
                  <p className={styles.muted}>Нет расходов за период</p>
                ) : (
                  <div className={styles.chartBox}>
                    <ResponsiveContainer
                      width="100%"
                      height={Math.max(280, topExpenses.length * 44)}
                    >
                      <BarChart
                        data={topExpenses}
                        layout="vertical"
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#2e3a48"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fill: "#8b9aab", fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fill: "#8b9aab", fontSize: 12 }}
                        />
                        <Tooltip formatter={moneyTooltip} />
                        <Bar
                          dataKey="amount"
                          name="Расход"
                          fill="#e06c75"
                          radius={[0, 4, 4, 0]}
                        >
                          {topExpenses.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                EXPENSE_COLORS[index % EXPENSE_COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : selectedId === "income-vs-expense" ? (
                barData.length === 0 ? (
                  <p className={styles.muted}>Недостаточно данных</p>
                ) : (
                  <div className={styles.chartBox}>
                    <p className={styles.periodNote}>
                      Гранулярность:{" "}
                      {timelineGranularity === "day"
                        ? "дни"
                        : timelineGranularity === "week"
                          ? "недели"
                          : "месяцы"}
                    </p>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={barData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#2e3a48"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "#8b9aab", fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: "#8b9aab", fontSize: 12 }} />
                        <Tooltip formatter={moneyTooltip} />
                        <Legend />
                        <Bar
                          dataKey="income"
                          name="Доход"
                          fill="#7fd99a"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="expense"
                          name="Расход"
                          fill="#e06c75"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : selectedId === "balance-trend" ? (
                balanceData.length === 0 ? (
                  <p className={styles.muted}>Недостаточно данных</p>
                ) : (
                  <div className={styles.chartBox}>
                    <ResponsiveContainer width="100%" height={360}>
                      <LineChart data={balanceData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#2e3a48"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "#8b9aab", fontSize: 12 }}
                        />
                        <YAxis tick={{ fill: "#8b9aab", fontSize: 12 }} />
                        <Tooltip formatter={moneyTooltip} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          name="Баланс"
                          stroke="#5eb8ff"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="net"
                          name="Чистый поток"
                          stroke="#c9a227"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : forecastData.length === 0 ? (
                <p className={styles.muted}>Недостаточно истории</p>
              ) : (
                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e3a48" />
                      <XAxis
                        dataKey="period"
                        tick={{ fill: "#8b9aab", fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: "#8b9aab", fontSize: 12 }} />
                      <Tooltip formatter={moneyTooltip} />
                      <Legend />
                      <Bar
                        dataKey="income"
                        name="Прогноз дохода"
                        fill="#7fd99a"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        name="Прогноз расхода"
                        fill="#e06c75"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        name="Баланс"
                        stroke="#5eb8ff"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
