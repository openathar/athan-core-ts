/**
 * Moon phase — approximation via the synodic period, fully local.
 *
 * Accuracy: ±0.5 days compared to exact ephemerides. Good enough for a
 * visualization, but NOT a basis for the actual start of Ramadan/Eid —
 * that depends on real moon sighting, not on a computed approximation.
 * Nothing here claims otherwise.
 */
const SYNODIC_MONTH = 29.530588853; // days between two new moons
/** Known reference new moon: January 6, 2000, 18:14 UTC. */
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);
function phaseKeyFromFraction(f) {
    if (f < 0.03 || f > 0.97)
        return "new";
    if (f < 0.22)
        return "waxing-crescent";
    if (f < 0.28)
        return "first-quarter";
    if (f < 0.47)
        return "waxing-gibbous";
    if (f < 0.53)
        return "full";
    if (f < 0.72)
        return "waning-gibbous";
    if (f < 0.78)
        return "last-quarter";
    return "waning-crescent";
}
export function moonPhaseAt(date) {
    const days = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
    let age = days % SYNODIC_MONTH;
    if (age < 0)
        age += SYNODIC_MONTH;
    const fraction = age / SYNODIC_MONTH;
    const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
    return {
        illumination,
        ageDays: age,
        phaseAngle: fraction * 360,
        key: phaseKeyFromFraction(fraction),
    };
}
export function nextMoonEvents(date) {
    const { ageDays } = moonPhaseAt(date);
    const half = SYNODIC_MONTH / 2;
    const nextNewMoon = SYNODIC_MONTH - ageDays;
    const nextFullMoon = ageDays < half ? half - ageDays : SYNODIC_MONTH - ageDays + half;
    return { nextNewMoon, nextFullMoon };
}
//# sourceMappingURL=moon-phase.js.map