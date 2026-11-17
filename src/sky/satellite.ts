import { degreesToRadians, ecfToLookAngles, eciToEcf, gstime, propagate, radiansToDegrees, twoline2satrec, type SatRec } from 'satellite.js';
import { readJson, writeJson } from '../lib/storage';
import { toVec } from './engine';
import type { Observer, SkyObject } from './types';

/**
 * Bundled ISS element set so the station still shows (roughly) offline. Elements go stale in weeks,
 * so a fresh set is fetched when online and cached; see `loadIssTle`.
 */
export const BUNDLED_ISS_TLE: [string, string] = [
  '1 25544U 98067A   24320.50000000  .00016717  00000-0  30000-3 0  9990',
  '2 25544  51.6400 247.4627 0006703 130.5360 325.0288 15.50000000400000',
];

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle';
const CACHE_KEY = 'iss-tle-v1';
const MAX_AGE_MS = 12 * 3600 * 1000;

type Cached = { at: number; l1: string; l2: string };

/** Latest ISS two-line elements: fresh network copy, else cache, else the bundled set. */
export async function loadIssTle(): Promise<{ tle: [string, string]; fresh: boolean }> {
  const cached = await readJson<Cached | null>(CACHE_KEY, null);
  if (cached && Date.now() - cached.at < MAX_AGE_MS) return { tle: [cached.l1, cached.l2], fresh: true };
  try {
    const res = await fetch(TLE_URL);
    if (res.ok) {
      const lines = (await res.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const i = lines.findIndex((l) => l.startsWith('1 25544'));
      if (i >= 0 && lines[i + 1]?.startsWith('2 25544')) {
        await writeJson(CACHE_KEY, { at: Date.now(), l1: lines[i], l2: lines[i + 1] } satisfies Cached);
        return { tle: [lines[i], lines[i + 1]], fresh: true };
      }
    }
  } catch {
    /* offline: fall through */
  }
  if (cached) return { tle: [cached.l1, cached.l2], fresh: false };
  return { tle: BUNDLED_ISS_TLE, fresh: false };
}

export const makeSatrec = (tle: [string, string]): SatRec => twoline2satrec(tle[0], tle[1]);

export function lookAt(rec: SatRec, date: Date, obs: Observer): { alt: number; az: number } | null {
  const pv = propagate(rec, date);
  if (!pv || !pv.position) return null;
  const ecf = eciToEcf(pv.position, gstime(date));
  const look = ecfToLookAngles({ latitude: degreesToRadians(obs.lat), longitude: degreesToRadians(obs.lon), height: 0 }, ecf);
  return { alt: radiansToDegrees(look.elevation), az: (radiansToDegrees(look.azimuth) + 360) % 360 };
}

export function issObject(rec: SatRec, date: Date, obs: Observer): SkyObject | null {
  const p = lookAt(rec, date, obs);
  if (!p) return null;
  return {
    kind: 'sat',
    id: 'ISS',
    name: 'ISS',
    mag: -2,
    alt: p.alt,
    az: p.az,
    v: toVec(p.alt, p.az),
    color: '#9dffb0',
    detail: 'International Space Station · about 28,000 km/h',
  };
}

export type IssPass = { rise: Date; peak: Date; set: Date; maxAlt: number };

/** Next pass that climbs above `minAlt` degrees within `hours`. Scans in 20 s steps. */
export function nextIssPass(rec: SatRec, from: Date, obs: Observer, hours = 48, minAlt = 10): IssPass | null {
  const step = 20000;
  const end = from.getTime() + hours * 3600000;
  let t = from.getTime();
  let rise: number | null = null;
  let peak = 0;
  let maxAlt = -90;
  let prevAlt = lookAt(rec, new Date(t), obs)?.alt ?? -90;
  if (prevAlt > 0) rise = t; // already overhead
  for (t += step; t < end; t += step) {
    const a = lookAt(rec, new Date(t), obs)?.alt ?? -90;
    if (a > 0 && prevAlt <= 0) {
      rise = t;
      maxAlt = a;
      peak = t;
    }
    if (rise !== null && a > maxAlt) {
      maxAlt = a;
      peak = t;
    }
    if (rise !== null && a <= 0 && prevAlt > 0) {
      if (maxAlt >= minAlt) return { rise: new Date(rise), peak: new Date(peak), set: new Date(t), maxAlt };
      rise = null;
      maxAlt = -90;
    }
    prevAlt = a;
  }
  return null;
}
