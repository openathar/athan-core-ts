/**
 * TypeScript port of athan-core-java (org.openathar.core) — the single
 * source of truth for calculation logic. This file mirrors the Java
 * implementation 1:1; reference tests against the Java values
 * (lib/athan-core.test.ts) keep both in sync. Results are UTC epoch
 * milliseconds and must be shifted to the location's local time for
 * display (see formatLocalTime).
 */
/** Twilight parameter: either a solar depression angle or fixed minutes. */
export type Twilight = {
    kind: "angle";
    degrees: number;
} | {
    kind: "minutes";
    minutes: number;
};
export declare const Twilight: {
    angle: (degrees: number) => Twilight;
    minutes: (minutes: number) => Twilight;
};
export type Midnight = "standard" | "jafari";
export type AsrMethod = "standard" | "hanafi";
export type HighLatMethod = "nightMiddle" | "oneSeventh" | "angleBased" | "none";
export type Rounding = "nearest" | "up" | "down" | "none";
export type Prayer = "fajr" | "sunrise" | "dhuhr" | "asr" | "sunset" | "maghrib" | "isha" | "midnight";
/** Calculation methods (praytime.js v3.2 methods table, defaults merged in). */
export type Method = {
    fajr: number;
    isha: Twilight;
    maghrib: Twilight;
    midnight: Midnight;
};
export declare const Methods: {
    MWL: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    ISNA: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    EGYPT: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    MAKKAH: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    KARACHI: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    TEHRAN: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "jafari";
    };
    JAFARI: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "jafari";
    };
    FRANCE: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    RUSSIA: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    MALAYSIA: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
    SINGAPORE: {
        fajr: number;
        isha: Twilight;
        maghrib: Twilight;
        midnight: "standard";
    };
};
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
export declare class PrayerTimes {
    private readonly method;
    private readonly asr;
    private readonly highLats;
    private readonly dhuhrMinutes;
    private readonly tune;
    private readonly rounding;
    constructor(method?: Method, asr?: AsrMethod, highLats?: HighLatMethod, dhuhrMinutes?: number, tune?: Partial<Record<Prayer, number>>, rounding?: Rounding);
    getTimes(year: number, month: number, day: number, lat: number, lng: number): PrayerTimesResult;
    private processTimes;
    private updateTimes;
    private tuneTimes;
    private convertTimes;
    private convert;
    private adjustHighLats;
    private adjustTime;
    private sunPosition;
    private midDay;
    private angleTime;
    private asrAngle;
}
/** UTC epoch milliseconds of a Gregorian date at midnight (proleptic). */
export declare function utcMillisOfDate(year: number, month: number, day: number): number;
/** Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's algorithm). */
export declare function daysFromCivil(y: number, m: number, d: number): number;
/** Format a UTC epoch millisecond as local "HH:mm" for a fixed UTC offset in hours. */
export declare function formatLocalTime(utcMillis: number, utcOffsetHours: number): string;
export declare function qiblaBearing(latitude: number, longitude: number): number;
//# sourceMappingURL=athan-core.d.ts.map