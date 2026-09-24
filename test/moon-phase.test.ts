/**
 * Tests for the local moon-phase helpers (mirrors the web's
 * moon-phase.test.ts — same math, shared single source).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { moonPhaseAt, nextMoonEvents } from "../src/moon-phase.ts";

describe("moon phase", () => {
  it("computes a known phase: full moon around 2026-09-26", () => {
    const phase = moonPhaseAt(new Date("2026-09-26T12:00:00Z"));
    assert.ok(phase.illumination > 0.97, `illumination ${phase.illumination}`);
  });

  it("next new and full moon are half a synodic period apart", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    const events = nextMoonEvents(now);
    const gap = Math.abs(events.nextNewMoon - events.nextFullMoon);
    assert.ok(Math.abs(gap - 29.530588853 / 2) < 0.01, `gap ${gap}`);
    assert.ok(events.nextNewMoon > 0 && events.nextNewMoon <= 29.6);
    assert.ok(events.nextFullMoon >= 0 && events.nextFullMoon <= 29.6);
  });

  it("is consistent with moonPhaseAt age", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    const { ageDays } = moonPhaseAt(now);
    const events = nextMoonEvents(now);
    assert.ok(Math.abs(events.nextNewMoon - (29.530588853 - ageDays)) < 0.001);
  });

  it("phase angle distinguishes waxing from waning", () => {
    const waxing = moonPhaseAt(new Date("2026-09-14T12:00:00Z"));
    const waning = moonPhaseAt(new Date("2026-10-08T12:00:00Z"));
    assert.ok(waxing.phaseAngle < 180, `waxing angle ${waxing.phaseAngle}`);
    assert.ok(waning.phaseAngle > 180, `waning angle ${waning.phaseAngle}`);
    assert.ok(Math.abs(waxing.illumination - waning.illumination) < 0.1);
  });
});
