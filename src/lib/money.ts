/** Суммы на API — в копейках (целые числа). В UI — рубли. */

export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}

export function kopecksToRubles(kopecks: number): number {
  return kopecks / 100;
}

export function formatRub(kopecks: number, locale = "ru-RU"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(kopecksToRubles(kopecks));
}
