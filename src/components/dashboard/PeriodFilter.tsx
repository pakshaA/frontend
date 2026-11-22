"use client";

import type { BalanceScope } from "@/lib/analytics-api";
import {
  PERIOD_PRESET_LABELS,
  type PeriodPreset,
} from "@/lib/period";
import styles from "./dashboard.module.css";

const SCOPE_LABELS: Record<BalanceScope, string> = {
  all: "Все источники",
  cards: "Карты",
  deposits: "Вклады",
};

type PeriodFilterProps = {
  preset: PeriodPreset;
  from: string;
  to: string;
  onPresetChange: (preset: PeriodPreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  balanceScope?: BalanceScope;
  onBalanceScopeChange?: (scope: BalanceScope) => void;
};

export function PeriodFilter({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
  balanceScope,
  onBalanceScopeChange,
}: PeriodFilterProps) {
  return (
    <div
      className={styles.periodFilter}
      data-with-scope={onBalanceScopeChange ? "true" : undefined}
    >
      <label className={styles.periodField}>
        Период
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as PeriodPreset)}
        >
          {(Object.keys(PERIOD_PRESET_LABELS) as PeriodPreset[]).map((key) => (
            <option key={key} value={key}>
              {PERIOD_PRESET_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.periodField}>
        С
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </label>

      <label className={styles.periodField}>
        По
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </label>

      {onBalanceScopeChange && balanceScope ? (
        <label className={styles.periodField}>
          Источник
          <select
            value={balanceScope}
            onChange={(e) =>
              onBalanceScopeChange(e.target.value as BalanceScope)
            }
            aria-label="Источник средств"
          >
            {(Object.keys(SCOPE_LABELS) as BalanceScope[]).map((key) => (
              <option key={key} value={key}>
                {SCOPE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
