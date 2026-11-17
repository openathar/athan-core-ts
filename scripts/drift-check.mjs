// Drift guard (ADR-001): compares this core-ts build (dist/) against the live
// reference implementation behind api.openathar.org (athan-core-java).
// Exit 1 on any mismatch OR any request error (errors are never ignored).
// Throttled to ~55 req/min (API limit is 60/min); retries on HTTP 429.
import { PrayerTimes, Methods, formatLocalTime, qiblaBearing, gregorianToHijri } from "../dist/index.js";

const API = process.env.API_BASE ?? "https://api.openathar.org";
const PAUSE_MS = Number(process.env.PAUSE_MS ?? 1100);
const places = [
  ["Berlin", 52.52, 13.405, 1], ["Mecca", 21.4225, 39.8262, 3], ["Jakarta", -6.2, 106.8167, 7],
  ["NewYork", 40.7128, -74.006, -5], ["Oslo", 59.9139, 10.7522, 1], ["Reykjavik", 64.1466, -21.9426, 0],
  ["Tromso", 69.6492, 18.9553, 2], ["CapeTown", -33.9249, 18.4241, 2], ["Sydney", -33.8688, 151.2093, 10],
];
const dates = ["2026-03-20", "2026-06-21", "2026-11-15", "2026-12-21"];
const hijriDates = [...dates, "2027-02-08", "2027-03-10", "2025-03-01", "2026-02-18", "2026-03-19", "2026-05-27", "2026-08-15", "2027-01-20"];
const fields = ["fajr", "sunrise", "dhuhr", "asr", "sunset", "maghrib", "isha", "midnight"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);

async function get(path) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(PAUSE_MS);
    try {
      // Eigener User-Agent: die Plattform-Auswertung zählt das als eigene Automatik, nicht als Besucher.
      const res = await fetch(`${API}${path}`, { headers: { "User-Agent": "zc-drift-check/1.0" } });
      if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      return { json: await res.json() };
    } catch (e) {
      if (attempt === 4) return { error: String(e) };
    }
  }
  return { error: "no response after retries (429?)" };
}

let checked = 0;
const problems = [];

for (const method of Object.keys(Methods)) {
  for (const [name, lat, lon, off] of places) {
    for (const date of dates) {
      const tag = `${method} ${name} ${date}`;
      const r = await get(`/v1/prayer-times?lat=${lat}&lon=${lon}&date=${date}&method=${method}&utcOffset=${off}`);
      if (r.error) { problems.push(`ERROR ${tag}: ${r.error}`); continue; }
      const [y, m, d] = date.split("-").map(Number);
      const ts = new PrayerTimes(Methods[method]).getTimes(y, m, d, lat, lon);
      for (const f of fields) {
        const tv = ts[f];
        const mine = tv == null || Number.isNaN(tv) ? null : formatLocalTime(tv, off);
        const a = r.json[f] ?? null;
        checked++;
        if ((a == null) !== (mine == null)) { problems.push(`DIFF ${tag} ${f}: api=${a} ts=${mine}`); continue; }
        if (a == null) continue;
        let diff = Math.abs(toMin(a) - toMin(mine)); diff = Math.min(diff, 1440 - diff);
        if (diff > 0) problems.push(`DIFF ${tag} ${f}: api=${a} ts=${mine} (${diff} min)`);
      }
    }
  }
}

for (const [name, lat, lon] of places) {
  const r = await get(`/v1/qibla?lat=${lat}&lon=${lon}`);
  if (r.error) { problems.push(`ERROR qibla ${name}: ${r.error}`); continue; }
  checked++;
  const mine = qiblaBearing(lat, lon);
  if (Math.abs(r.json.bearingDegrees - mine) > 0.01) problems.push(`DIFF qibla ${name}: api=${r.json.bearingDegrees} ts=${mine}`);
}

for (const date of hijriDates) {
  const r = await get(`/v1/hijri?date=${date}`);
  if (r.error) { problems.push(`ERROR hijri ${date}: ${r.error}`); continue; }
  checked++;
  const [y, m, d] = date.split("-").map(Number);
  const t = gregorianToHijri(new Date(Date.UTC(y, m - 1, d, 12)), "en");
  if (r.json.year !== t.year || r.json.month !== t.month || r.json.day !== t.day) {
    problems.push(`DIFF hijri ${date}: api=${JSON.stringify(r.json)} ts=${JSON.stringify(t)}`);
  }
}

console.log(`checked=${checked} problems=${problems.length} api=${API}`);
for (const p of problems) console.log(p);
process.exit(problems.length ? 1 : 0);
