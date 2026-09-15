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
const localeTag = (l) => (l === "de" ? "de-DE" : l === "ar" ? "ar-SA" : "en-GB");
function hijriPartsOf(date, locale) {
    // "-nu-latn" forces Latin digits for the numeric fields — otherwise
    // ar-SA yields Arabic-Indic digits ("٢" instead of "2") and Number(...)
    // on them becomes NaN. Digit display for the UI is handled by
    // toArabicDigits() at the right place, not by Intl itself.
    const parts = new Intl.DateTimeFormat(`${localeTag(locale)}-u-ca-islamic-umalqura-nu-latn`, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).formatToParts(date);
    const monthNameParts = new Intl.DateTimeFormat(`${localeTag(locale)}-u-ca-islamic-umalqura`, { month: "long", timeZone: "UTC" }).formatToParts(date);
    const get = (parts, type) => parts.find((p) => p.type === type)?.value ?? "";
    return {
        day: Number(get(parts, "day")),
        month: Number(get(parts, "month")),
        monthName: get(monthNameParts, "month"),
        year: Number(get(parts, "year")),
    };
}
export function gregorianToHijri(date, locale) {
    return hijriPartsOf(date, locale);
}
/**
 * Names of the 12 Hijri months in the requested language, correctly
 * indexed.
 *
 * Iterates days forward from today until all 12 month numbers have been
 * seen — robust across year boundaries, without assuming month lengths.
 */
export function hijriMonthNames(locale) {
    const names = new Array(13).fill("");
    let filled = 0;
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < 400 && filled < 12; i++) {
        const { month, monthName } = hijriPartsOf(d, locale);
        if (!names[month]) {
            names[month] = monthName;
            filled++;
        }
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return names.slice(1);
}
function hijriToJdnApprox(y, m, d) {
    return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948440 - 1;
}
function jdnToGregorian(jdn) {
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
export function hijriToGregorian(y, m, d, locale = "en") {
    const guess = jdnToGregorian(hijriToJdnApprox(y, m, d));
    for (let offset = -4; offset <= 4; offset++) {
        const candidate = new Date(guess);
        candidate.setUTCDate(candidate.getUTCDate() + offset);
        const got = hijriPartsOf(candidate, locale);
        if (got.day === d && got.month === m && got.year === y)
            return candidate;
    }
    return null;
}
//# sourceMappingURL=hijri.js.map