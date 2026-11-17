/**
 * Hijri calendar conversion — fully local, no server.
 *
 * Forward (Gregorian → Hijri) uses `Intl.DateTimeFormat` directly with the
 * `islamic-umalqura` calendar (ICU, built into browsers and Node).
 *
 * Reverse (Hijri → Gregorian) has no direct Intl equivalent. The tabular
 * conversion algorithm (kbisa/al-Beruni) yields an estimate as a Julian
 * day number; Umm al-Qura deviates from it by up to ±2 days (computed moon
 * sighting instead of a fixed rule). The estimate is therefore checked
 * against the real Umm al-Qura output of Intl and corrected within a few
 * days.
 */

export type Locale = "de" | "en" | "ar";

export type HijriDate = { day: number; month: number; monthName: string; year: number };

/**
 * Month names, fixed in code rather than asked from Intl. Generated from ICU (Node) so they equal
 * what the website printed before. Reason: Hermes (React Native) returns two-word names split
 * across parts ("جمادى" + "الآخرة") and differs in other locale details, so asking the runtime
 * gave a truncated name on iOS. A test compares this table with ICU to keep it honest.
 */
const MONTH_NAMES: Record<Locale, readonly string[]> = {
  en: ["Muharram", "Safar", "Rabiʻ I", "Rabiʻ II", "Jumada I", "Jumada II", "Rajab", "Shaʻban", "Ramadan", "Shawwal", "Dhuʻl-Qiʻdah", "Dhuʻl-Hijjah"],
  de: ["Muharram", "Safar", "Rabiʻ I", "Rabiʻ II", "Dschumada I", "Dschumada II", "Radschab", "Shaʻban", "Ramadan", "Shawwal", "Dhu l-qaʿda", "Dhu l-Hiddscha"],
  ar: ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"],
};

/** Arabic-Indic (U+0660–0669) and Persian (U+06F0–06F9) digits → ASCII, so Number() always works. */
function toAsciiDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (c) => {
    const code = c.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * The numbers do not depend on the UI language, so they are always asked in en-GB. Even so the
 * digits are normalised: some runtimes (Hermes on iOS) ignore `-nu-latn` for Arabic locales and
 * return Arabic-Indic digits, and Number("٧") is NaN — that showed "NaN" instead of the date.
 */
function hijriPartsOf(date: Date, locale: Locale): HijriDate {
  const parts = new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura-nu-latn", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);
  const num = (type: string) => Number(toAsciiDigits(parts.find((p) => p.type === type)?.value ?? ""));
  const month = num("month");
  return {
    day: num("day"),
    month,
    monthName: MONTH_NAMES[locale][month - 1] ?? "",
    year: num("year"),
  };
}

export function gregorianToHijri(date: Date, locale: Locale): HijriDate {
  return hijriPartsOf(date, locale);
}

/** Names of the 12 Hijri months in the requested language, in month order (index 0 = Muharram). */
export function hijriMonthNames(locale: Locale): string[] {
  return [...MONTH_NAMES[locale]];
}

function hijriToJdnApprox(y: number, m: number, d: number): number {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948440 - 1;
}

function jdnToGregorian(jdn: number): Date {
  let l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Hijri → Gregorian. `null` if no match was found. */
export function hijriToGregorian(
  y: number,
  m: number,
  d: number,
  locale: Locale = "en",
): Date | null {
  const guess = jdnToGregorian(hijriToJdnApprox(y, m, d));
  for (let offset = -4; offset <= 4; offset++) {
    const candidate = new Date(guess);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const got = hijriPartsOf(candidate, locale);
    if (got.day === d && got.month === m && got.year === y) return candidate;
  }
  return null;
}