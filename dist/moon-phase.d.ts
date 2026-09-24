/**
 * Moon phase — approximation via the synodic period, fully local.
 *
 * Accuracy: ±0.5 days compared to exact ephemerides. Good enough for a
 * visualization, but NOT a basis for the actual start of Ramadan/Eid —
 * that depends on real moon sighting, not on a computed approximation.
 * Nothing here claims otherwise.
 */
export type MoonPhaseKey = "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";
export type MoonPhase = {
    /** Illuminated fraction of the disk, 0 (new moon) to 1 (full moon). */
    illumination: number;
    /** Days since the last new moon, 0 to ~29.5. */
    ageDays: number;
    /** Phase angle in degrees — 0 = new, 180 = full; < 180 means waxing. */
    phaseAngle: number;
    key: MoonPhaseKey;
};
export declare function moonPhaseAt(date: Date): MoonPhase;
export type MoonEvents = {
    /** Days until the next new moon, 0 < x <= 29.5. */
    nextNewMoon: number;
    /** Days until the next full moon, 0 < x <= 29.5. */
    nextFullMoon: number;
};
export declare function nextMoonEvents(date: Date): MoonEvents;
//# sourceMappingURL=moon-phase.d.ts.map