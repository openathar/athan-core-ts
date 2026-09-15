# athan-core-ts

TypeScript mirror of [athan-core-java](https://github.com/openathar/athan-core-java) —
the single source of truth for Athar's calculation logic. Prayer times,
Qibla direction, and Hijri calendar conversion, in pure TypeScript with no
dependencies. Shared by `athar-web` and `athar-mobile-app`.

Part of the Athar platform (Sadaqah Jariyah, 100% open source) — see
[openathar](https://github.com/openathar).

## What's inside

- **Prayer times** — TypeScript port of the PrayTimes.org v3.2
  specification, mirroring `athan-core-java` 1:1: all calculation methods
  (MWL, ISNA, EGYPT, MAKKAH, KARACHI, TEHRAN, JAFARI, FRANCE, RUSSIA,
  MALAYSIA, SINGAPORE), Asr (standard/Hanafi), high-latitude handling,
  rounding, and the Duha window.
- **Qibla direction** — bearing from true north to the Kaaba
  (21.4225241°N, 39.8261818°E).
- **Hijri calendar** — Gregorian ↔ Hijri conversion via `Intl` with the
  `islamic-umalqura` calendar (Umm al-Qura), plus localized month names
  (de/en/ar).

All pure, stateless, no dependencies. Reference tests against the Java
values keep both ports in sync.

## Usage

```ts
import { Methods, PrayerTimes, formatLocalTime, qiblaBearing } from "@openathar/athan-core-ts";

const result = new PrayerTimes(Methods.MWL).getTimes(2026, 9, 15, 52.52, 13.405);
console.log(formatLocalTime(result.fajr, 2.0)); // "04:41"
console.log(qiblaBearing(52.52, 13.405));       // 136.68
```

## Building & testing

```sh
npm install
npm test        # reference tests against athan-core-java values (Node's built-in runner)
npm run build   # emits dist/ (ESM + .d.ts)
```

## License

MIT — deliberately permissive, so other developers can freely embed this
library in their own projects.