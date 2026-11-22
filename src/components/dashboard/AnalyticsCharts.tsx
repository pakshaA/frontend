"use client";

import { useMemo } from "react";
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
import {
  DEFAULT_DASHBOARD_CHARTS,
  type ChartId,
} from "@/lib/charts-catalog";
import { kopecksToRubles } from "@/lib/money";
import type {
  BalanceTrendItem,
  CategoryBreakdownItem,
  ForecastItem,
  TimelineItem,
} from "@/lib/analytics-api";
import styles from "./dashboard.module.css";

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

type AnalyticsChartsProps = {
  incomeByCategory: CategoryBreakdownItem[];
  expenseByCategory: CategoryBreakdownItem[];
  timeline: TimelineItem[];
  balanceTrend: BalanceTrendItem[];
  forecast: ForecastItem[];
  granularity?: string;
  loading?: boolean;
  /** Какие диаграммы показывать (по умолчанию — доходы/расходы) */
  visibleCharts?: ChartId[];
};

function toPieData(items: CategoryBreakdownItem[]) {
  return items.map((item) => ({
    name: item.categoryName,
    value: kopecksToRubles(item.total),
  }));
}

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

function timelineTitle(granularity?: string) {
  if (granularity === "day") return "Доходы и расходы по дням";
  if (granularity === "week") return "Доходы и расходы по неделям";
  return "Доходы и расходы по месяцам";
}

function moneyTip(value: unknown) {
  return `${Number(value).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  })} ₽`;
}

function PieBlock({
  title,
  data,
  colors,
  emptyText,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
  emptyText: string;
}) {
  return (
    <section className={styles.chartCard}>
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className={styles.muted}>{emptyText}</p>
      ) : (
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={moneyTip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function AnalyticsCharts({
  incomeByCategory,
  expenseByCategory,
  timeline,
  balanceTrend,
  forecast,
  granularity,
  loading,
  visibleCharts = DEFAULT_DASHBOARD_CHARTS,
}: AnalyticsChartsProps) {
  const visible = useMemo(() => new Set(visibleCharts), [visibleCharts]);

  const incomeData = useMemo(
    () => toPieData(incomeByCategory),
    [incomeByCategory],
  );
  const expenseData = useMemo(
    () => toPieData(expenseByCategory),
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

  if (loading) {
    return <p className={styles.muted}>Загрузка аналитики…</p>;
  }

  if (visibleCharts.length === 0) {
    return (
      <p className={styles.muted}>
        На главной нет выбранных диаграмм. Отметьте нужные на странице
        «Диаграммы».
      </p>
    );
  }

  return (
    <div className={styles.chartsStack}>
      {visible.has("income-by-category") ? (
        <PieBlock
          title="Доходы по категориям"
          data={incomeData}
          colors={INCOME_COLORS}
          emptyText="Пока нет доходов"
        />
      ) : null}

      {visible.has("expense-by-category") ? (
        <PieBlock
          title="Расходы по категориям"
          data={expenseData}
          colors={EXPENSE_COLORS}
          emptyText="Пока нет расходов"
        />
      ) : null}

      {visible.has("top-expenses") ? (
        <section className={styles.chartCard}>
          <h3>Топ расходов</h3>
          {topExpenses.length === 0 ? (
            <p className={styles.muted}>Пока нет расходов</p>
          ) : (
            <div className={styles.chartBoxTall}>
              <ResponsiveContainer
                width="100%"
                height={Math.max(220, topExpenses.length * 36)}
              >
                <BarChart
                  data={topExpenses}
                  layout="vertical"
                  margin={{ left: 4, right: 8 }}
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
                    width={100}
                    tick={{ fill: "#8b9aab", fontSize: 11 }}
                  />
                  <Tooltip formatter={moneyTip} />
                  <Bar
                    dataKey="amount"
                    name="Расход"
                    fill="#e06c75"
                    radius={[0, 4, 4, 0]}
                  >
                    {topExpenses.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      ) : null}

      {visible.has("income-vs-expense") ? (
        <section className={styles.chartCard}>
          <h3>{timelineTitle(granularity)}</h3>
          {barData.length === 0 ? (
            <p className={styles.muted}>Недостаточно данных</p>
          ) : (
            <div className={styles.chartBoxTall}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3a48" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#8b9aab", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#8b9aab", fontSize: 12 }} />
                  <Tooltip formatter={moneyTip} />
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
          )}
        </section>
      ) : null}

      {visible.has("balance-trend") ? (
        <section className={styles.chartCard}>
          <h3>Тренд баланса</h3>
          {balanceData.length === 0 ? (
            <p className={styles.muted}>Недостаточно данных</p>
          ) : (
            <div className={styles.chartBoxTall}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3a48" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#8b9aab", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#8b9aab", fontSize: 12 }} />
                  <Tooltip formatter={moneyTip} />
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
          )}
        </section>
      ) : null}

      {visible.has("cashflow-forecast") ? (
        <section className={styles.chartCard}>
          <h3>Прогноз на 3 месяца</h3>
          {forecastData.length === 0 ? (
            <p className={styles.muted}>Недостаточно истории</p>
          ) : (
            <div className={styles.chartBoxTall}>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3a48" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#8b9aab", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#8b9aab", fontSize: 12 }} />
                  <Tooltip formatter={moneyTip} />
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
        </section>
      ) : null}
    </div>
  );
}
