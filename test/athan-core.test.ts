/**
 * Reference tests for the TypeScript port of athan-core. Values are taken
 * 1:1 from the Java reference suite (athan-core-java PrayerTimesTest /
 * QiblaTest), which in turn was generated from the official praytime.js
 * v3.2 library and the independent Adhan library. Run with `npm test`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Methods, PrayerTimes, formatLocalTime, qiblaBearing, type Method } from "../src/athan-core.ts";

const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "sunset", "maghrib", "isha", "midnight"] as const;
type PrayerKey = (typeof PRAYERS)[number];

function localTimes(
  method: Method,
  y: number,
  mo: number,
  d: number,
  lat: number,
  lng: number,
  utcOffsetHours: number,
): Record<PrayerKey, string> {
  const result = new PrayerTimes(method).getTimes(y, mo, d, lat, lng);
  const map = {} as Record<PrayerKey, string>;
  for (const p of PRAYERS) map[p] = formatLocalTime(result[p], utcOffsetHours);
  return map;
}

describe("prayer times (reference values from athan-core-java)", () => {
  it("berlin MWL", () => {
    const t = localTimes(Methods.MWL, 2026, 9, 14, 52.52, 13.405, 2.0);
    assert.equal(t.fajr, "04:38");
    assert.equal(t.sunrise, "06:39");
    assert.equal(t.dhuhr, "13:02");
    assert.equal(t.asr, "16:30");
    assert.equal(t.sunset, "19:24");
    assert.equal(t.maghrib, "19:25");
    assert.equal(t.isha, "21:17");
    assert.equal(t.midnight, "01:02");
  });

  it("mecca Makkah method", () => {
    const t = localTimes(Methods.MAKKAH, 2026, 9, 14, 21.4225, 39.8262, 3.0);
    assert.equal(t.fajr, "04:51");
    assert.equal(t.sunrise, "06:07");
    assert.equal(t.dhuhr, "12:16");
    assert.equal(t.asr, "15:42");
    assert.equal(t.sunset, "18:25");
    assert.equal(t.maghrib, "18:26");
    assert.equal(t.isha, "19:56");
    assert.equal(t.midnight, "00:16");
  });

  it("new york ISNA", () => {
    const t = localTimes(Methods.ISNA, 2026, 9, 14, 40.7128, -74.006, -4.0);
    assert.equal(t.fajr, "05:19");
    assert.equal(t.sunrise, "06:36");
    assert.equal(t.dhuhr, "12:52");
    assert.equal(t.asr, "16:23");
    assert.equal(t.sunset, "19:07");
    assert.equal(t.maghrib, "19:08");
    assert.equal(t.isha, "20:23");
    assert.equal(t.midnight, "00:51");
  });

  it("karachi method", () => {
    const t = localTimes(Methods.KARACHI, 2026, 9, 14, 24.8607, 67.0011, 5.0);
    assert.equal(t.fajr, "05:01");
    assert.equal(t.sunrise, "06:18");
    assert.equal(t.dhuhr, "12:28");
    assert.equal(t.asr, "15:55");
    assert.equal(t.sunset, "18:37");
    assert.equal(t.maghrib, "18:38");
    assert.equal(t.isha, "19:54");
    assert.equal(t.midnight, "00:27");
  });

  it("tromso high latitude night middle", () => {
    const t = localTimes(Methods.MWL, 2026, 9, 14, 69.6492, 18.9553, 2.0);
    assert.equal(t.fajr, "00:39");
    assert.equal(t.sunrise, "05:53");
    assert.equal(t.dhuhr, "12:40");
    assert.equal(t.asr, "15:47");
    assert.equal(t.sunset, "19:24");
    assert.equal(t.maghrib, "19:25");
    assert.equal(t.isha, "00:14");
    assert.equal(t.midnight, "00:40");
  });

  it("tehran jafari midnight", () => {
    const t = localTimes(Methods.TEHRAN, 2026, 9, 14, 35.6892, 51.389, 3.5);
    assert.equal(t.fajr, "04:21");
    assert.equal(t.sunrise, "05:46");
    assert.equal(t.dhuhr, "12:00");
    assert.equal(t.asr, "15:32");
    assert.equal(t.sunset, "18:13");
    assert.equal(t.maghrib, "18:32");
    assert.equal(t.isha, "19:19");
    assert.equal(t.midnight, "23:18");
  });

  it("berlin winter solstice", () => {
    const t = localTimes(Methods.MWL, 2026, 12, 21, 52.52, 13.405, 1.0);
    assert.equal(t.fajr, "06:07");
    assert.equal(t.sunrise, "08:15");
    assert.equal(t.dhuhr, "12:04");
    assert.equal(t.asr, "13:39");
    assert.equal(t.sunset, "15:54");
    assert.equal(t.maghrib, "15:55");
    assert.equal(t.isha, "17:55");
    assert.equal(t.midnight, "00:05");
  });

  it("damascus jafari", () => {
    const t = localTimes(Methods.JAFARI, 2026, 9, 14, 33.5138, 36.2765, 3.0);
    assert.equal(t.fajr, "05:03");
    assert.equal(t.sunrise, "06:17");
    assert.equal(t.dhuhr, "12:30");
    assert.equal(t.asr, "16:02");
    assert.equal(t.sunset, "18:43");
    assert.equal(t.maghrib, "18:58");
    assert.equal(t.isha, "19:47");
    assert.equal(t.midnight, "23:54");
  });

  it("berlin spring equinox", () => {
    const t = localTimes(Methods.MWL, 2026, 3, 20, 52.52, 13.405, 1.0);
    assert.equal(t.fajr, "04:13");
    assert.equal(t.sunrise, "06:09");
    assert.equal(t.dhuhr, "12:14");
    assert.equal(t.asr, "15:30");
    assert.equal(t.sunset, "18:19");
    assert.equal(t.maghrib, "18:20");
    assert.equal(t.isha, "20:09");
    assert.equal(t.midnight, "00:14");
  });

  it("berlin summer solstice", () => {
    const t = localTimes(Methods.MWL, 2026, 6, 21, 52.52, 13.405, 2.0);
    assert.equal(t.fajr, "01:08");
    assert.equal(t.sunrise, "04:43");
    assert.equal(t.dhuhr, "13:08");
    assert.equal(t.asr, "17:33");
    assert.equal(t.sunset, "21:33");
    assert.equal(t.maghrib, "21:34");
    assert.equal(t.isha, "01:08");
    assert.equal(t.midnight, "01:08");
  });

  it("sydney southern hemisphere", () => {
    const t = localTimes(Methods.MWL, 2026, 9, 14, -33.8688, 151.2093, 10.0);
    assert.equal(t.fajr, "04:34");
    assert.equal(t.sunrise, "05:56");
    assert.equal(t.dhuhr, "11:51");
    assert.equal(t.asr, "15:13");
    assert.equal(t.sunset, "17:46");
    assert.equal(t.maghrib, "17:47");
    assert.equal(t.isha, "19:04");
    assert.equal(t.midnight, "23:51");
  });

  it("singapore near equator", () => {
    const t = localTimes(Methods.ISNA, 2026, 9, 14, 1.3521, 103.8198, 8.0);
    assert.equal(t.fajr, "06:00");
    assert.equal(t.sunrise, "06:57");
    assert.equal(t.dhuhr, "13:00");
    assert.equal(t.asr, "16:04");
    assert.equal(t.sunset, "19:04");
    assert.equal(t.maghrib, "19:05");
    assert.equal(t.isha, "20:01");
    assert.equal(t.midnight, "01:00");
  });

  it("cairo Egyptian method", () => {
    const t = localTimes(Methods.EGYPT, 2026, 9, 14, 30.0444, 31.2357, 2.0);
    assert.equal(t.fajr, "04:11");
    assert.equal(t.sunrise, "05:39");
    assert.equal(t.dhuhr, "11:51");
    assert.equal(t.asr, "15:21");
    assert.equal(t.sunset, "18:02");
    assert.equal(t.maghrib, "18:03");
    assert.equal(t.isha, "19:20");
    assert.equal(t.midnight, "23:50");
  });

  it("reykjavik high latitude summer", () => {
    const t = localTimes(Methods.MWL, 2026, 6, 21, 64.1466, -21.9426, 0.0);
    assert.equal(t.fajr, "01:30");
    assert.equal(t.sunrise, "02:55");
    assert.equal(t.dhuhr, "13:30");
    assert.equal(t.asr, "18:22");
    assert.equal(t.sunset, "00:04");
    assert.equal(t.maghrib, "00:05");
    assert.equal(t.isha, "01:30");
    assert.equal(t.midnight, "01:30");
  });

  it("reykjavik high latitude winter", () => {
    const t = localTimes(Methods.MWL, 2026, 12, 21, 64.1466, -21.9426, 0.0);
    assert.equal(t.fajr, "07:54");
    assert.equal(t.sunrise, "11:22");
    assert.equal(t.dhuhr, "13:26");
    assert.equal(t.asr, "13:47");
    assert.equal(t.sunset, "15:30");
    assert.equal(t.maghrib, "15:31");
    assert.equal(t.isha, "18:48");
    assert.equal(t.midnight, "01:26");
  });

  it("berlin leap day", () => {
    const t = localTimes(Methods.MWL, 2024, 2, 29, 52.52, 13.405, 1.0);
    assert.equal(t.fajr, "05:01");
    assert.equal(t.sunrise, "06:54");
    assert.equal(t.dhuhr, "12:19");
    assert.equal(t.asr, "15:07");
    assert.equal(t.sunset, "17:44");
    assert.equal(t.maghrib, "17:45");
    assert.equal(t.isha, "19:31");
    assert.equal(t.midnight, "00:19");
  });

  it("duha window berlin MWL", () => {
    const r = new PrayerTimes(Methods.MWL).getTimes(2026, 9, 14, 52.52, 13.405);
    assert.equal(r.duhaStart, r.sunrise + 15 * 60_000);
    assert.equal(r.duhaEnd, r.dhuhr - 10 * 60_000);
    assert.equal(formatLocalTime(r.duhaStart, 2.0), "06:54");
    assert.equal(formatLocalTime(r.duhaEnd, 2.0), "12:52");
    assert.equal(formatLocalTime(r.duhaBest, 2.0), "09:51");
    assert.equal(formatLocalTime(r.sunrise, 2.0), "06:39");
    assert.equal(formatLocalTime(r.dhuhr, 2.0), "13:02");
  });
});

describe("qibla bearing (reference values from Adhan)", () => {
  const EPSILON = 0.01;
  const cases: Array<[string, number, number, number]> = [
    ["berlin", 52.52, 13.405, 136.68],
    ["mecca", 21.4225, 39.8262, 324.89],
    ["new york", 40.7128, -74.006, 58.48],
    ["sydney", -33.8688, 151.2093, 277.5],
    ["singapore", 1.3521, 103.8198, 293.02],
    ["reykjavik", 64.1466, -21.9426, 106.12],
    ["tokyo", 35.6762, 139.6503, 293.0],
    ["cape town", -33.9249, 18.4241, 23.35],
  ];

  for (const [name, lat, lng, expected] of cases) {
    it(name, () => {
      assert.ok(Math.abs(qiblaBearing(lat, lng) - expected) < EPSILON, `${name}: ${qiblaBearing(lat, lng)}`);
    });
  }

  it("bearing is within [0, 360)", () => {
    for (const lat of [-90, -45, 0, 45, 90]) {
      for (const lng of [-180, -90, 0, 90, 180]) {
        const b = qiblaBearing(lat, lng);
        assert.ok(b >= 0 && b < 360, `bearing ${b} in [0,360) for ${lat},${lng}`);
      }
    }
  });
});