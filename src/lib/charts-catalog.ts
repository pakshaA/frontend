export type ChartId =
  | "income-by-category"
  | "expense-by-category"
  | "top-expenses"
  | "income-vs-expense"
  | "balance-trend"
  | "cashflow-forecast";

export type ChartDefinition = {
  id: ChartId;
  title: string;
  short: string;
  description: string;
  /** Нужен ли фильтр периода (прогноз строится вперёд от сегодня) */
  usesPeriod: boolean;
};

export const CHARTS: ChartDefinition[] = [
  {
    id: "income-by-category",
    title: "Доходы по категориям",
    short: "Круговая",
    description:
      "Показывает структуру доходов за выбранный период: какая доля приходится на каждую категорию. Удобно видеть основные источники поступлений.",
    usesPeriod: true,
  },
  {
    id: "expense-by-category",
    title: "Расходы по категориям",
    short: "Круговая",
    description:
      "Разбивка расходов по категориям за период. Помогает найти статьи, которые съедают бюджет больше остальных.",
    usesPeriod: true,
  },
  {
    id: "top-expenses",
    title: "Топ расходов",
    short: "Рейтинг",
    description:
      "Горизонтальный рейтинг до восьми категорий расходов за выбранный период, отсортированных по сумме. Удобно сравнивать, какие статьи бюджета самые крупные.",
    usesPeriod: true,
  },
  {
    id: "income-vs-expense",
    title: "Доходы и расходы",
    short: "Столбчатая",
    description:
      "Сравнение доходов и расходов по дням, неделям или месяцам (гранулярность зависит от длины периода). Показывает, в какие интервалы вы уходили в минус или копились.",
    usesPeriod: true,
  },
  {
    id: "balance-trend",
    title: "Тренд баланса",
    short: "Линейная",
    description:
      "Накопительный баланс и чистый денежный поток по месяцам в выбранном периоде. Линия баланса учитывает операции до начала периода как стартовую точку.",
    usesPeriod: true,
  },
  {
    id: "cashflow-forecast",
    title: "Прогноз на 3 месяца",
    short: "Прогноз",
    description:
      "Оценка доходов и расходов на ближайшие три месяца на основе средних за последние месяцы, плюс известные подписки и запланированные платежи. Фильтр периода на эту диаграмму не влияет.",
    usesPeriod: false,
  },
];

export function getChartById(id: ChartId): ChartDefinition {
  const found = CHARTS.find((c) => c.id === id);
  if (!found) return CHARTS[0];
  return found;
}

/** По умолчанию на главной — доходы и расходы (по дням/неделям/месяцам) */
export const DEFAULT_DASHBOARD_CHARTS: ChartId[] = ["income-vs-expense"];

const CHART_IDS = new Set<string>(CHARTS.map((c) => c.id));

export function isChartId(value: string): value is ChartId {
  return CHART_IDS.has(value);
}

/** Пустой layout → дефолт; неизвестные id отбрасываются */
export function resolveDashboardCharts(
  layout: string[] | null | undefined,
): ChartId[] {
  if (!layout || layout.length === 0) return [...DEFAULT_DASHBOARD_CHARTS];
  const filtered = layout.filter(isChartId);
  return filtered.length > 0 ? filtered : [...DEFAULT_DASHBOARD_CHARTS];
}
