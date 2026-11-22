export type ParsedFiscalReceipt = {
  /** YYYY-MM-DD для input[type=date] */
  date: string;
  /** Сумма в рублях как строка для инпута */
  amount: string;
  /** Исходные поля чека (для отладки / комментария) */
  raw: {
    t?: string;
    s?: string;
    fn?: string;
    i?: string;
    fp?: string;
    n?: string;
  };
};

/**
 * Парсит QR фискального чека ФНС.
 * Пример: t=20240115T1430&s=1250.50&fn=...&i=...&fp=...&n=1
 */
export function parseFiscalReceiptQr(raw: string): ParsedFiscalReceipt {
  const text = raw.trim();
  if (!text) {
    throw new Error("Пустой QR-код");
  }

  const params = extractParams(text);
  const t = params.get("t") ?? params.get("T");
  const s = params.get("s") ?? params.get("S");

  if (!t || !s) {
    throw new Error(
      "Это не QR чека ФНС. Ожидаются поля даты (t) и суммы (s).",
    );
  }

  const date = parseFiscalDate(t);
  const amount = parseFiscalAmount(s);

  return {
    date,
    amount,
    raw: {
      t,
      s,
      fn: params.get("fn") ?? params.get("FN") ?? undefined,
      i: params.get("i") ?? params.get("I") ?? undefined,
      fp: params.get("fp") ?? params.get("FP") ?? undefined,
      n: params.get("n") ?? params.get("N") ?? undefined,
    },
  };
}

function extractParams(text: string): URLSearchParams {
  // URL вида https://...?t=...&s=...
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if ([...url.searchParams.keys()].length > 0) {
        return url.searchParams;
      }
    } catch {
      /* fall through */
    }
  }

  // Чистая query-строка t=...&s=...
  const query = text.includes("?") ? text.slice(text.indexOf("?") + 1) : text;
  return new URLSearchParams(query.replace(/^\?/, ""));
}

/** t=20240115T143025 или 20240115T1430 */
function parseFiscalDate(t: string): string {
  const normalized = t.replace(/[^0-9T]/gi, "").toUpperCase();
  const match = /^(\d{4})(\d{2})(\d{2})(?:T|$)/.exec(normalized);
  if (!match) {
    throw new Error("Не удалось разобрать дату из QR чека");
  }
  const [, yyyy, mm, dd] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function parseFiscalAmount(s: string): string {
  const value = Number(String(s).replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Некорректная сумма в QR чека");
  }
  // До 2 знаков, без лишних нулей в конце целой части
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
