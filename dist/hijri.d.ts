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
export type HijriDate = {
    day: number;
    month: number;
    monthName: string;
    year: number;
};
export declare function gregorianToHijri(date: Date, locale: Locale): HijriDate;
/**
 * Names of the 12 Hijri months in the requested language, correctly
 * indexed.
 *
 * Iterates days forward from today until all 12 month numbers have been
 * seen — robust across year boundaries, without assuming month lengths.
 */
export declare function hijriMonthNames(locale: Locale): string[];
/** Hijri → Gregorian. `null` if no match was found. */
export declare function hijriToGregorian(y: number, m: number, d: number, locale?: Locale): Date | null;
//# sourceMappingURL=hijri.d.ts.map