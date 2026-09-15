/**
 * TypeScript port of athan-core-java (org.openathar.core) — the single
 * source of truth for calculation logic. This file mirrors the Java
 * implementation 1:1; reference tests against the Java values
 * (lib/athan-core.test.ts) keep both in sync. Results are UTC epoch
 * milliseconds and must be shifted to the location's local time for
 * display (see formatLocalTime).
 */
export const Twilight = {
    angle: (degrees) => ({ kind: "angle", degrees }),
    minutes: (minutes) => ({ kind: "minutes", minutes }),
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
};
const DUHA_START_OFFSET_MINUTES = 15;
const DUHA_END_OFFSET_MINUTES = 10;
export class PrayerTimes {
    constructor(method = Methods.MWL, asr = "standard", highLats = "nightMiddle", dhuhrMinutes = 0, tune = {}, rounding = "nearest") {
        this.method = method;
        this.asr = asr;
        this.highLats = highLats;
        this.dhuhrMinutes = dhuhrMinutes;
        this.tune = tune;
        this.rounding = rounding;
    }
    getTimes(year, month, day, lat, lng) {
        const ctx = { lat, lng, utcTime: utcMillisOfDate(year, month, day) };
        const times = {
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
    processTimes(times, ctx) {
        const horizon = Twilight.angle(0.833);
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
    updateTimes(times, ctx, adjusted) {
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
    tuneTimes(times) {
        for (const [key, value] of Object.entries(this.tune)) {
            times[key] += value / 60;
        }
    }
    convertTimes(times, ctx) {
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
            duhaStart: sunrise + DUHA_START_OFFSET_MINUTES * 60000,
            duhaEnd: dhuhr - DUHA_END_OFFSET_MINUTES * 60000,
            duhaBest: Math.round((sunrise + (dhuhr - sunrise) / 2) / 60000) * 60000,
        };
    }
    convert(t, ctx) {
        const timestamp = ctx.utcTime + Math.floor((t - ctx.lng / 15) * 3600000);
        const oneMinute = 60000;
        switch (this.rounding) {
            case "up": return Math.ceil(timestamp / oneMinute) * 60000;
            case "down": return Math.floor(timestamp / oneMinute) * 60000;
            case "nearest": return Math.round(timestamp / oneMinute) * 60000;
            case "none": return Math.trunc(timestamp);
        }
    }
    adjustHighLats(times, ctx) {
        if (this.highLats === "none")
            return false;
        const night = 24 + times.sunrise - times.sunset;
        const fajr = this.adjustTime(times.fajr, times.sunrise, Twilight.angle(this.method.fajr), night, -1);
        const isha = this.adjustTime(times.isha, times.sunset, this.method.isha, night);
        const maghrib = this.adjustTime(times.maghrib, times.sunset, this.method.maghrib, night);
        times.fajr = fajr.time;
        times.isha = isha.time;
        times.maghrib = maghrib.time;
        return fajr.adjusted || isha.adjusted || maghrib.adjusted;
    }
    adjustTime(time, base, angle, night, direction = 1) {
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
    sunPosition(time, ctx) {
        const d = ctx.utcTime / 864e5 - 10957.5 + time / 24 - ctx.lng / 360;
        const g = mod(357.529 + 0.98560028 * d, 360);
        const q = mod(280.459 + 0.98564736 * d, 360);
        const l = mod(q + 1.915 * sinDeg(g) + 0.02 * sinDeg(2 * g), 360);
        const e = 23.439 - 0.00000036 * d;
        const ra = mod(arctan2Deg(cosDeg(e) * sinDeg(l), cosDeg(l)) / 15, 24);
        return { declination: arcsinDeg(sinDeg(e) * sinDeg(l)), equation: q / 15 - ra };
    }
    midDay(time, ctx) {
        return mod(12 - this.sunPosition(time, ctx).equation, 24);
    }
    angleTime(angle, time, ctx, direction = 1) {
        const decl = this.sunPosition(time, ctx).declination;
        const angleDeg = angle.kind === "angle" ? angle.degrees : NaN;
        const numerator = -sinDeg(angleDeg) - sinDeg(ctx.lat) * sinDeg(decl);
        const diff = arccosDeg(numerator / (cosDeg(ctx.lat) * cosDeg(decl))) / 15;
        return this.midDay(time, ctx) + diff * direction;
    }
    asrAngle(time, ctx) {
        const shadowFactor = this.asr === "standard" ? 1 : 2;
        const decl = this.sunPosition(time, ctx).declination;
        return -arccotDeg(shadowFactor + tanDeg(Math.abs(ctx.lat - decl)));
    }
}
function twilightValue(t) {
    return t.kind === "angle" ? t.degrees : t.minutes;
}
function mod(a, b) {
    return ((a % b) + b) % b;
}
function dtr(d) { return (d * Math.PI) / 180; }
function rtd(r) { return (r * 180) / Math.PI; }
function sinDeg(d) { return Math.sin(dtr(d)); }
function cosDeg(d) { return Math.cos(dtr(d)); }
function tanDeg(d) { return Math.tan(dtr(d)); }
function arcsinDeg(d) { return rtd(Math.asin(d)); }
function arccosDeg(d) { return rtd(Math.acos(d)); }
function arccotDeg(x) { return rtd(Math.atan(1 / x)); }
function arctan2Deg(y, x) { return rtd(Math.atan2(y, x)); }
/** UTC epoch milliseconds of a Gregorian date at midnight (proleptic). */
export function utcMillisOfDate(year, month, day) {
    return daysFromCivil(year, month, day) * 86400000;
}
/** Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's algorithm). */
export function daysFromCivil(y, m, d) {
    const yy = m <= 2 ? y - 1 : y;
    const era = Math.trunc((yy >= 0 ? yy : yy - 399) / 400);
    const yoe = yy - era * 400;
    const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
}
/** Format a UTC epoch millisecond as local "HH:mm" for a fixed UTC offset in hours. */
export function formatLocalTime(utcMillis, utcOffsetHours) {
    const localMillis = utcMillis + utcOffsetHours * 3600000;
    const totalMinutes = Math.floor(localMillis / 60000);
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
export function qiblaBearing(latitude, longitude) {
    const lat1 = dtr(latitude);
    const lat2 = dtr(KAABA_LAT);
    const dLng = dtr(KAABA_LNG - longitude);
    const y = Math.sin(dLng);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);
    const bearing = rtd(Math.atan2(y, x));
    return (bearing + 360) % 360;
}
//# sourceMappingURL=athan-core.js.map