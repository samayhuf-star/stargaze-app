import { computeDsos, computeSolarSystem, computeStars, gastDegrees, horizonFromEquatorial, norm360, precessToDate, toVec } from './engine';
import type { Observer, SkyData, SkyObject } from './types';

/** Signed shortest difference b - a in degrees, range (-180, 180]. */
export const angleDiff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

/**
 * Picks the best object to line the phone up with: the Moon, else the brightest planet,
 * else the brightest named star, all at least 12 degrees up so tilt is measurable.
 * The Sun is never offered (people must not be nudged to look at it).
 */
export function pickAlignTarget(data: SkyData, date: Date, obs: Observer): SkyObject | null {
  const up = (o: SkyObject) => o.alt >= 12;
  const bodies = computeSolarSystem(date, obs).filter((b) => b.kind !== 'sun' && up(b));
  const moon = bodies.find((b) => b.kind === 'moon');
  if (moon) return moon;
  const planets = bodies.filter((b) => b.kind === 'planet' && b.mag < 2).sort((a, b) => a.mag - b.mag);
  if (planets.length) return planets[0];

  const stars = computeStars(data, date, obs);
  let best: SkyObject | null = null;
  for (const sp of stars) {
    const s = data.stars[sp.idx];
    if (s[2] > 2.2) break; // sorted by magnitude
    if (s[4] < 0 || sp.alt < 20) continue;
    if (!best || s[2] < best.mag) {
      best = { kind: 'star', id: `star-${sp.idx}`, name: data.names[s[4]], mag: s[2], alt: sp.alt, az: sp.az, v: sp.v, color: '#ffffff' };
    }
  }
  return best;
}

export type AlignResult = { headingOffset: number; altOffset: number; invertTilt: boolean };

/**
 * Works out the corrections so the phone's reading matches the target it is pointed at.
 * `deviceAz` / `deviceAlt` are the readings the app currently shows (offsets already applied).
 * If the altitude reading has the opposite sign to the target, the tilt direction is flipped,
 * which fixes the sensor-sign question without the user having to find a Settings switch.
 */
export function computeAlign(
  target: { az: number; alt: number },
  deviceAz: number,
  deviceAlt: number,
  cur: AlignResult,
): AlignResult {
  const headingOffset = Math.round(angleDiff(0, cur.headingOffset + angleDiff(deviceAz, target.az)) * 10) / 10;
  const rawAlt = deviceAlt - cur.altOffset;
  const flipped = Math.abs(target.alt) >= 12 && Math.sign(rawAlt) !== Math.sign(target.alt) && Math.abs(rawAlt + target.alt) < 12;
  if (flipped) return { headingOffset, altOffset: 0, invertTilt: !cur.invertTilt };
  return { headingOffset, altOffset: Math.round((target.alt - rawAlt) * 10) / 10, invertTilt: cur.invertTilt };
}

export type SearchEntry = { id: string; name: string; kind: SkyObject['kind']; mag: number; sub: string };

/** Everything the Find box can look up: named stars, Moon, planets and Messier objects. */
export function buildCatalog(data: SkyData): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const n of ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']) {
    out.push({ id: n, name: n, kind: n === 'Moon' ? 'moon' : 'planet', mag: -5, sub: n === 'Moon' ? 'Moon' : 'Planet' });
  }
  const seen = new Set<string>();
  data.stars.forEach((s, i) => {
    if (s[4] < 0) return;
    const name = data.names[s[4]];
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ id: `star-${i}`, name, kind: 'star', mag: s[2], sub: `Star · mag ${s[2].toFixed(1)}` });
  });
  for (const [id, alt, , , mag, type] of data.dsos) {
    out.push({ id, name: alt ? `${id} · ${alt}` : id, kind: 'dso', mag, sub: type });
  }
  return out;
}

export function searchCatalog(catalog: SearchEntry[], query: string, limit = 12): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.filter((e) => e.kind === 'moon' || e.kind === 'planet' || (e.kind === 'star' && e.mag < 1.0)).slice(0, limit);
  const starts: SearchEntry[] = [];
  const has: SearchEntry[] = [];
  for (const e of catalog) {
    const n = e.name.toLowerCase();
    if (n.startsWith(q)) starts.push(e);
    else if (n.includes(q)) has.push(e);
  }
  const byMag = (a: SearchEntry, b: SearchEntry) => a.mag - b.mag;
  return [...starts.sort(byMag), ...has.sort(byMag)].slice(0, limit);
}

/** Current position of a catalogue entry (so a pointer arrow keeps working as the sky turns). */
export function locateEntry(data: SkyData, entry: SearchEntry, date: Date, obs: Observer): SkyObject | null {
  if (entry.kind === 'moon' || entry.kind === 'planet') return computeSolarSystem(date, obs).find((b) => b.id === entry.id) ?? null;
  if (entry.kind === 'dso') return computeDsos(data, date, obs).find((d) => d.id === entry.id) ?? null;
  const idx = Number(entry.id.slice(5));
  const s = data.stars[idx];
  if (!s) return null;
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
  const [ra, dec] = precessToDate(s[0], s[1], years);
  const { alt, az } = horizonFromEquatorial(ra, dec, gastDegrees(date), obs);
  return { kind: 'star', id: entry.id, name: entry.name, mag: s[2], alt, az: norm360(az), v: toVec(alt, az), color: '#ffffff' };
}

/** Direction to turn from the current view to a target: arrow angle (0 = up, clockwise) and angular distance. */
export function guideTo(view: { az: number; alt: number }, target: { az: number; alt: number }) {
  const dAz = angleDiff(view.az, target.az);
  const dAlt = target.alt - view.alt;
  const dx = dAz * Math.cos((view.alt * Math.PI) / 180);
  const angle = (Math.atan2(dx, dAlt) * 180) / Math.PI;
  const dist = Math.hypot(dx, dAlt);
  return { angle, dist };
}
