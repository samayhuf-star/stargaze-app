import * as Astronomy from 'astronomy-engine';

export type Shower = { name: string; month: number; day: number; zhr: number; parent: string; radiantRa: number; radiantDec: number };

/** Major annual meteor showers (peak dates are approximate and shift by a day or so each year). */
export const SHOWERS: Shower[] = [
  { name: 'Quadrantids', month: 1, day: 3, zhr: 80, parent: 'asteroid 2003 EH1', radiantRa: 230, radiantDec: 49 },
  { name: 'Lyrids', month: 4, day: 22, zhr: 18, parent: 'comet Thatcher', radiantRa: 271, radiantDec: 34 },
  { name: 'Eta Aquariids', month: 5, day: 6, zhr: 50, parent: "comet Halley", radiantRa: 338, radiantDec: -1 },
  { name: 'Perseids', month: 8, day: 12, zhr: 100, parent: 'comet Swift-Tuttle', radiantRa: 48, radiantDec: 58 },
  { name: 'Orionids', month: 10, day: 21, zhr: 20, parent: "comet Halley", radiantRa: 95, radiantDec: 16 },
  { name: 'Taurids', month: 11, day: 5, zhr: 5, parent: 'comet Encke', radiantRa: 52, radiantDec: 15 },
  { name: 'Leonids', month: 11, day: 17, zhr: 15, parent: 'comet Tempel-Tuttle', radiantRa: 152, radiantDec: 22 },
  { name: 'Geminids', month: 12, day: 14, zhr: 150, parent: 'asteroid Phaethon', radiantRa: 112, radiantDec: 33 },
  { name: 'Ursids', month: 12, day: 22, zhr: 10, parent: 'comet Tuttle', radiantRa: 217, radiantDec: 76 },
];

export type UpcomingShower = Shower & { peak: Date; daysAway: number; moonLit: number; moonNote: string };

/** Showers sorted by how soon they peak, with the Moon's glare at peak (a bright Moon hides faint meteors). */
export function upcomingShowers(from: Date, count = 4): UpcomingShower[] {
  const out = SHOWERS.map((s) => {
    let peak = new Date(Date.UTC(from.getUTCFullYear(), s.month - 1, s.day, 12));
    if (peak.getTime() < from.getTime() - 86400000) peak = new Date(Date.UTC(from.getUTCFullYear() + 1, s.month - 1, s.day, 12));
    const moonLit = Math.round(Astronomy.Illumination(Astronomy.Body.Moon, peak).phase_fraction * 100);
    const moonNote = moonLit < 30 ? 'Dark skies, great year' : moonLit < 65 ? 'Some moonlight' : 'Bright Moon will wash out faint ones';
    return { ...s, peak, daysAway: Math.max(0, Math.round((peak.getTime() - from.getTime()) / 86400000)), moonLit, moonNote };
  });
  return out.sort((a, b) => a.daysAway - b.daysAway).slice(0, count);
}
