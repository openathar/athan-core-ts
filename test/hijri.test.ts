import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { gregorianToHijri, hijriMonthNames, hijriToGregorian } from "../src/hijri.ts";

/**
 * Regression for a bug found on a real device (iOS, Hermes, 2026-11-17): the Hijri date showed
 * "NaN". Hermes ignores the `-nu-latn` extension for Arabic locales and returns Arabic-Indic
 * digits ("٧"), so Number("٧") was NaN, and it splits two-word month names ("جمادى" + a separate
 * "الآخرة" literal). The stub below replays exactly what Hermes returned.
 */
const RealDTF = Intl.DateTimeFormat;
afterEach(() => {
  (Intl as { DateTimeFormat: unknown }).DateTimeFormat = RealDTF;
});

function stubHermesArabicIndicDigits() {
  const toIndic = (s: string) => s.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
  class Stub extends RealDTF {
    override formatToParts(date?: Date | number): Intl.DateTimeFormatPart[] {
      // Whatever the requested tag: digits come back Arabic-Indic, month names split into two parts.
      return super.formatToParts(date).map((p) => {
        if (p.type === "day" || p.type === "year" || p.type === "month") {
          const numeric = /^\d+$/.test(p.value);
          return numeric ? { ...p, value: toIndic(p.value) } : { type: "month", value: p.value.split(" ")[0] };
        }
        return p;
      });
    }
  }
  (Intl as { DateTimeFormat: unknown }).DateTimeFormat = Stub;
}

describe("gregorianToHijri", () => {
  const d = new Date(Date.UTC(2026, 10, 17, 12)); // 7 Jumada II 1448 (verified against the live API)

  it("gives the Umm al-Qura date", () => {
    for (const locale of ["en", "de", "ar"] as const) {
      const h = gregorianToHijri(d, locale);
      assert.deepEqual([h.day, h.month, h.year], [7, 6, 1448], locale);
    }
  });

  it("survives a runtime that returns Arabic-Indic digits (Hermes)", () => {
    stubHermesArabicIndicDigits();
    const h = gregorianToHijri(d, "ar");
    assert.deepEqual([h.day, h.month, h.year], [7, 6, 1448]);
  });

  it("names a two-word month completely, not just its first word (Hermes splits it)", () => {
    stubHermesArabicIndicDigits();
    assert.equal(gregorianToHijri(d, "ar").monthName, "جمادى الآخرة");
    assert.equal(gregorianToHijri(d, "de").monthName, "Dschumada II");
    assert.equal(gregorianToHijri(d, "en").monthName, "Jumada II");
  });

  it("reverse conversion works on such a runtime too", () => {
    stubHermesArabicIndicDigits();
    assert.equal(hijriToGregorian(1448, 6, 7, "ar")?.toISOString().slice(0, 10), "2026-11-17");
  });
});

describe("hijriMonthNames", () => {
  it("lists all 12 months in order for every language", () => {
    for (const locale of ["en", "de", "ar"] as const) {
      const names = hijriMonthNames(locale);
      assert.equal(names.length, 12);
      assert.ok(names.every((n) => n.length > 0), locale);
      assert.equal(new Set(names).size, 12, `${locale}: names must be distinct`);
    }
    assert.equal(hijriMonthNames("en")[8], "Ramadan");
    assert.equal(hijriMonthNames("ar")[8], "رمضان");
  });

  it("matches what ICU prints in this runtime (so the static table cannot drift from it)", () => {
    const tag = { en: "en-GB", de: "de-DE", ar: "ar-SA" } as const;
    for (const locale of ["en", "de", "ar"] as const) {
      const names = hijriMonthNames(locale);
      const num = new RealDTF(`${tag[locale]}-u-ca-islamic-umalqura-nu-latn`, { month: "numeric", timeZone: "UTC" });
      const long = new RealDTF(`${tag[locale]}-u-ca-islamic-umalqura`, { month: "long", timeZone: "UTC" });
      const day = new Date(Date.UTC(2026, 0, 1));
      for (let i = 0; i < 400; i++) {
        const m = Number(num.formatToParts(day).find((p) => p.type === "month")!.value.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660)));
        assert.equal(names[m - 1], long.format(day), `${locale} month ${m}`);
        day.setUTCDate(day.getUTCDate() + 1);
      }
    }
  });
});
