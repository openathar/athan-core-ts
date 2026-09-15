/**
 * TypeScript port of athan-core-java (org.openathar.core) — the single
 * source of truth for calculation logic. This file mirrors the Java
 * implementation 1:1; reference tests against the Java values
 * (lib/athan-core.test.ts) keep both in sync. Results are UTC epoch
 * milliseconds and must be shifted to the location's local time for
 * display (see formatLocalTime).
 */

/** Twilight parameter: either a solar depression angle or fixed minutes. */
export type Twilight =
  | { kind: "angle"; degrees: number }
  | { kind: "minutes"; minutes: number };

export const Twilight = {
  angle: (degrees: number): Twilight => ({ kind: "angle", degrees }),
  minutes: (minutes: number): Twilight => ({ kind: "minutes", minutes }),
};

export type Midnight = "standard" | "jafari";
export type AsrMethod = "standard" | "hanafi";
export type HighLatMethod = "nightMiddle" | "oneSeventh" | "angleBased" | "none";
export type Rounding = "nearest" | "up" | "down" | "none";
export type Prayer =
  | "fajr" | "sunrise" | "dhuhr" | "asr"
  | "sunset" | "maghrib" | "isha" | "midnight";

/** Calculation methods (praytime.js v3.2 methods table, defaults merged in). */
export type Method = {
  fajr: number;
  isha: Twilight;
  maghrib: Twilight;
  midnight: Midnight;
};

export const Methods = {
  MWL: { fajr: 18.0, isha: Twilight.angle(17.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  ISNA: { fajr: 15.0, isha: Twilight.angle(15.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  EGYPT: { fajr: 19.5, isha: Twilight.angle(17.5), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  MAKKAH: { fajr: 18.5, isha: Twilight.minutes(90.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  KARACHI: { fajr: 18.0, isha: Twilight.angle(18.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  TEHRAN: { fajr: 17.7, isha: Twilight.angle(14.0), maghrib: Twilight.angle(4.5), midnight: "jafari" },
  JAFARI: { fajr: 16.0, isha: Twilight.angle(14.0), maghrib: Twilight.angle(4.0), midnight: "jafari" },
  FRANCE: { fajr: 12.0, isha: Twilight.angle(12.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  RUSSIA: { fajr: 16.0, isha: Twilight.angle(15.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  MALAYSIA: { fajr: 20.0, isha: Twilight.angle(18.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
  SINGAPORE: { fajr: 20.0, isha: Twilight.angle(18.0), maghrib: Twilight.minutes(1.0), midnight: "standard" },
} satisfies Record<string, Method>;

/**
 * Prayer times as UTC epoch milliseconds for the given date. The Duha
 * (forenoon) values are a derived time window: start = sunrise + 15 min,
 * end = dhuhr − 10 min, best = midpoint between sunrise and dhuhr.
 */
export type PrayerTimesResult = {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  sunset: number;
  maghrib: number;
  isha: number;
  midnight: number;
  duhaStart: number;
  duhaEnd: number;
  duhaBest: number;
};

const DUHA_START_OFFSET_MINUTES = 15;
const DUHA_END_OFFSET_MINUTES = 10;

type Ctx = { lat: number; lng: number; utcTime: number };
type SunPosition = { declination: number; equation: number };
type AdjustedTime = { time: number; adjusted: boolean };

export class PrayerTimes {
  private readonly method: Method;
  private readonly asr: AsrMethod;
  private readonly highLats: HighLatMethod;
  private readonly dhuhrMinutes: number;
  private readonly tune: Partial<Record<Prayer, number>>;
  private readonly rounding: Rounding;

  constructor(
    method: Method = Methods.MWL,
    asr: AsrMethod = "standard",
    highLats: HighLatMethod = "nightMiddle",
    dhuhrMinutes = 0,
    tune: Partial<Record<Prayer, number>> = {},
    rounding: Rounding = "nearest",
  ) {
    this.method = method;
    this.asr = asr;
    this.highLats = highLats;
    this.dhuhrMinutes = dhuhrMinutes;
    this.tune = tune;
    this.rounding = rounding;
  }

  getTimes(year: number, month: number, day: number, lat: number, lng: number): PrayerTimesResult {
    const ctx: Ctx = { lat, lng, utcTime: utcMillisOfDate(year, month, day) };
    const times: Record<Prayer, number> = {
      fajr: 5.0,
      sunrise: 6.0,
      dhuhr: 12.0,
      asr: 13.0,
      sunset: 18.0,
      maghrib: 18.0,
      isha: 18.0,
      midnight: 24.0,
    };
    const processed = this.processTimes(times, ctx);
    const adjusted = this.adjustHighLats(processed, ctx);
    this.updateTimes(processed, ctx, adjusted);
    this.tuneTimes(processed);
    return this.convertTimes(processed, ctx);
  }

  private processTimes(times: Record<Prayer, number>, ctx: Ctx): Record<Prayer, number> {
    const horizon: Twilight = Twilight.angle(0.833);
    return {
      fajr: this.angleTime(Twilight.angle(this.method.fajr), times.fajr, ctx, -1),
      sunrise: this.angleTime(horizon, times.sunrise, ctx, -1),
      dhuhr: this.midDay(times.dhuhr, ctx),
      asr: this.angleTime(Twilight.angle(this.asrAngle(times.asr, ctx)), times.asr, ctx),
      sunset: this.angleTime(horizon, times.sunset, ctx),
      maghrib: this.angleTime(this.method.maghrib, times.maghrib, ctx),
      isha: this.angleTime(this.method.isha, times.isha, ctx),
      midnight: this.midDay(times.midnight, ctx) + 12,
    };
  }

  private updateTimes(times: Record<Prayer, number>, ctx: Ctx, adjusted: boolean): void {
    if (this.method.maghrib.kind === "minutes")
      times.maghrib = times.sunset + twilightValue(this.method.maghrib) / 60;
    if (this.method.isha.kind === "minutes")
      times.isha = times.maghrib + twilightValue(this.method.isha) / 60;
    if (this.method.midnight === "jafari") {
      const nextFajr = this.angleTime(Twilight.angle(this.method.fajr), 29.0, ctx, -1) + 24;
      times.midnight = (times.sunset + (adjusted ? times.fajr + 24 : nextFajr)) / 2;
    }
    times.dhuhr += this.dhuhrMinutes / 60;
  }

  private tuneTimes(times: Record<Prayer, number>): void {
    for (const [key, value] of Object.entries(this.tune) as [Prayer, number][]) {
      times[key] += value / 60;
    }
  }

  private convertTimes(times: Record<Prayer, number>, ctx: Ctx): PrayerTimesResult {
    const sunrise = this.convert(times.sunrise, ctx);
    const dhuhr = this.convert(times.dhuhr, ctx);
    return {
      fajr: this.convert(times.fajr, ctx),
      sunrise,
      dhuhr,
      asr: this.convert(times.asr, ctx),
      sunset: this.convert(times.sunset, ctx),
      maghrib: this.convert(times.maghrib, ctx),
      isha: this.convert(times.isha, ctx),
      midnight: this.convert(times.midnight, ctx),
      duhaStart: sunrise + DUHA_START_OFFSET_MINUTES * 60_000,
      duhaEnd: dhuhr - DUHA_END_OFFSET_MINUTES * 60_000,
      duhaBest: Math.round((sunrise + (dhuhr - sunrise) / 2) / 60_000) * 60_000,
    };
  }

  private convert(t: number, ctx: Ctx): number {
    const timestamp = ctx.utcTime + Math.floor((t - ctx.lng / 15) * 3_600_000);
    const oneMinute = 60_000;
    switch (this.rounding) {
      case "up": return Math.ceil(timestamp / oneMinute) * 60_000;
      case "down": return Math.floor(timestamp / oneMinute) * 60_000;
      case "nearest": return Math.round(timestamp / oneMinute) * 60_000;
      case "none": return Math.trunc(timestamp);
    }
  }

  private adjustHighLats(times: Record<Prayer, number>, ctx: Ctx): boolean {
    if (this.highLats === "none") return false;
    const night = 24 + times.sunrise - times.sunset;
    const fajr = this.adjustTime(times.fajr, times.sunrise, Twilight.angle(this.method.fajr), night, -1);
    const isha = this.adjustTime(times.isha, times.sunset, this.method.isha, night);
    const maghrib = this.adjustTime(times.maghrib, times.sunset, this.method.maghrib, night);
    times.fajr = fajr.time;
    times.isha = isha.time;
    times.maghrib = maghrib.time;
    return fajr.adjusted || isha.adjusted || maghrib.adjusted;
  }

  private adjustTime(time: number, base: number, angle: Twilight, night: number, direction = 1): AdjustedTime {
    const portion = (() => {
      switch (this.highLats) {
        case "nightMiddle": return night / 2;
        case "oneSeventh": return night / 7;
        case "angleBased": return (twilightValue(angle) / 60) * night;
        case "none": return 0;
      }
    })();
    const timeDiff = (time - base) * direction;
    return Number.isNaN(time) || timeDiff > portion
      ? { time: base + portion * direction, adjusted: true }
      : { time, adjusted: false };
  }

  private sunPosition(time: number, ctx: Ctx): SunPosition {
    const d = ctx.utcTime / 864e5 - 10957.5 + time / 24 - ctx.lng / 360;
    const g = mod(357.529 + 0.98560028 * d, 360);
    const q = mod(280.459 + 0.98564736 * d, 360);
    const l = mod(q + 1.915 * sinDeg(g) + 0.02 * sinDeg(2 * g), 360);
    const e = 23.439 - 0.00000036 * d;
    const ra = mod(arctan2Deg(cosDeg(e) * sinDeg(l), cosDeg(l)) / 15, 24);
    return { declination: arcsinDeg(sinDeg(e) * sinDeg(l)), equation: q / 15 - ra };
  }

  private midDay(time: number, ctx: Ctx): number {
    return mod(12 - this.sunPosition(time, ctx).equation, 24);
  }

  private angleTime(angle: Twilight, time: number, ctx: Ctx, direction = 1): number {
    const decl = this.sunPosition(time, ctx).declination;
    const angleDeg = angle.kind === "angle" ? angle.degrees : NaN;
    const numerator = -sinDeg(angleDeg) - sinDeg(ctx.lat) * sinDeg(decl);
    const diff = arccosDeg(numerator / (cosDeg(ctx.lat) * cosDeg(decl))) / 15;
    return this.midDay(time, ctx) + diff * direction;
  }

  private asrAngle(time: number, ctx: Ctx): number {
    const shadowFactor = this.asr === "standard" ? 1 : 2;
    const decl = this.sunPosition(time, ctx).declination;
    return -arccotDeg(shadowFactor + tanDeg(Math.abs(ctx.lat - decl)));
  }
}

function twilightValue(t: Twilight): number {
  return t.kind === "angle" ? t.degrees : t.minutes;
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

function dtr(d: number): number { return (d * Math.PI) / 180; }
function rtd(r: number): number { return (r * 180) / Math.PI; }
function sinDeg(d: number): number { return Math.sin(dtr(d)); }
function cosDeg(d: number): number { return Math.cos(dtr(d)); }
function tanDeg(d: number): number { return Math.tan(dtr(d)); }
function arcsinDeg(d: number): number { return rtd(Math.asin(d)); }
function arccosDeg(d: number): number { return rtd(Math.acos(d)); }
function arccotDeg(x: number): number { return rtd(Math.atan(1 / x)); }
function arctan2Deg(y: number, x: number): number { return rtd(Math.atan2(y, x)); }

/** UTC epoch milliseconds of a Gregorian date at midnight (proleptic). */
export function utcMillisOfDate(year: number, month: number, day: number): number {
  return daysFromCivil(year, month, day) * 86_400_000;
}

/** Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's algorithm). */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.trunc((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Format a UTC epoch millisecond as local "HH:mm" for a fixed UTC offset in hours. */
export function formatLocalTime(utcMillis: number, utcOffsetHours: number): string {
  const localMillis = utcMillis + utcOffsetHours * 3_600_000;
  const totalMinutes = Math.floor(localMillis / 60_000);
  const minutesOfDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(minutesOfDay / 60);
  const mm = minutesOfDay % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Qibla direction (bearing from true north, in degrees) from any location
 * to the Kaaba in Mecca, using the great-circle initial bearing formula.
 * Kaaba coordinates match the Adhan library (21.4225241°N, 39.8261818°E)
 * so reference values agree.
 */
const KAABA_LAT = 21.4225241;
const KAABA_LNG = 39.8261818;

export function qiblaBearing(latitude: number, longitude: number): number {
  const lat1 = dtr(latitude);
  const lat2 = dtr(KAABA_LAT);
  const dLng = dtr(KAABA_LNG - longitude);
  const y = Math.sin(dLng);
  const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);
  const bearing = rtd(Math.atan2(y, x));
  return (bearing + 360) % 360;
}