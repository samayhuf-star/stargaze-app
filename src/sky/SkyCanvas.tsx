import { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import rawData from '../data/sky-data.json';
import { bvColor, computeConstellationPoint, computeDsos, computeSolarSystem, computeStars, gastDegrees, starRadius, toVec } from './engine';
import { makeProjector } from './projection';
import { COLORS, NIGHT_RED, skyColor } from './theme';
import type { Observer, SkyData, SkyObject, Vec3, View as SkyView } from './types';

const sky = rawData as unknown as SkyData;

export type SkyOptions = {
  magLimit: number;
  showConstellations: boolean;
  showLabels: boolean;
  showDsos: boolean;
  night: boolean;
  /** Draw an opaque sky colour (false when the camera feed is behind the canvas). */
  opaque: boolean;
};

type Props = {
  width: number;
  height: number;
  view: SkyView;
  date: Date;
  observer: Observer;
  options: SkyOptions;
  selectedId: string | null;
  /** Fast-moving objects (the ISS) computed by the parent every couple of seconds. */
  extra?: SkyObject[];
  onSelect: (obj: SkyObject | null) => void;
};

const CARDINALS: [string, number][] = [
  ['N', 0],
  ['NE', 45],
  ['E', 90],
  ['SE', 135],
  ['S', 180],
  ['SW', 225],
  ['W', 270],
  ['NW', 315],
];

function SkyCanvasImpl({ width, height, view, date, observer, options, selectedId, extra, onSelect }: Props) {
  // Sky positions only change meaningfully once a minute (0.25 deg), so recompute at that rate.
  const minuteKey = Math.floor(date.getTime() / 60000);
  const latKey = observer.lat.toFixed(2);
  const lonKey = observer.lon.toFixed(2);

  const state = useMemo(() => {
    const d = new Date(minuteKey * 60000);
    const stars = computeStars(sky, d, observer);
    const gast = gastDegrees(d);
    const years = (d.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
    const lines = sky.constellations.map((c) => ({
      id: c.id,
      name: c.name,
      center: computeConstellationPoint(c.center[0], c.center[1], gast, years, observer),
      segs: c.segs.map((seg) => seg.map(([ra, dec]) => computeConstellationPoint(ra, dec, gast, years, observer))),
    }));
    const bodies = computeSolarSystem(d, observer);
    const dsos = computeDsos(sky, d, observer);
    return { stars, lines, bodies, dsos };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey, latKey, lonKey]);

  const sunAlt = state.bodies[0].alt;
  const { night } = options;
  const proj = makeProjector(view, width, height);
  const labelMag = 2.2 + Math.max(0, 60 - view.fov) / 10;

  const starColor = (bv: number) => (night ? NIGHT_RED.star : bvColor(bv));

  // Stars
  const starNodes: React.ReactNode[] = [];
  const labelNodes: React.ReactNode[] = [];
  const hit: { obj: SkyObject; x: number; y: number }[] = [];
  for (const sp of state.stars) {
    const s = sky.stars[sp.idx];
    if (s[2] > options.magLimit) break; // catalogue is sorted by magnitude
    if (sp.alt < -1) continue;
    const p = proj.project(sp.v);
    if (!p || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) continue;
    const name = s[4] >= 0 ? sky.names[s[4]] : '';
    const r = starRadius(s[2]);
    starNodes.push(<Circle key={sp.idx} cx={p.x} cy={p.y} r={r} fill={starColor(s[3])} opacity={Math.min(1, 0.55 + (6 - s[2]) * 0.1)} />);
    if (name) {
      const obj: SkyObject = { kind: 'star', id: `star-${sp.idx}`, name, mag: s[2], alt: sp.alt, az: sp.az, v: sp.v, color: bvColor(s[3]) };
      hit.push({ obj, x: p.x, y: p.y });
      if (options.showLabels && s[2] < labelMag) {
        labelNodes.push(
          <SvgText key={`l${sp.idx}`} x={p.x + r + 4} y={p.y + 3} fontSize={11} fill={night ? NIGHT_RED.label : COLORS.label}>
            {name}
          </SvgText>,
        );
      }
    }
  }

  // Constellation lines + names
  let linePath = '';
  const constLabels: React.ReactNode[] = [];
  if (options.showConstellations) {
    for (const c of state.lines) {
      for (const seg of c.segs) {
        let pen = false;
        for (const v of seg) {
          const p = proj.project(v);
          if (!p || Math.abs(p.x) > width * 3 || Math.abs(p.y) > height * 3) {
            pen = false;
            continue;
          }
          linePath += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          pen = true;
        }
      }
      if (options.showLabels) {
        const p = proj.project(c.center);
        if (p && p.x > 10 && p.x < width - 10 && p.y > 10 && p.y < height - 10) {
          constLabels.push(
            <SvgText key={c.id} x={p.x} y={p.y} fontSize={10} fill={night ? NIGHT_RED.line : COLORS.constLabel} textAnchor="middle">
              {c.name.toUpperCase()}
            </SvgText>,
          );
        }
      }
    }
  }

  // Sun, Moon, planets
  const bodyNodes: React.ReactNode[] = [];
  for (const b of state.bodies) {
    const p = proj.project(b.v);
    if (!p || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) continue;
    const r = b.kind === 'sun' ? 10 : b.kind === 'moon' ? 9 : Math.max(3.5, 5.5 - b.mag * 0.5);
    const color = night ? NIGHT_RED.planet : b.color;
    bodyNodes.push(
      <G key={b.id}>
        {b.kind === 'sun' && <Circle cx={p.x} cy={p.y} r={r * 2.2} fill={color} opacity={0.18} />}
        <Circle cx={p.x} cy={p.y} r={r} fill={color} />
        <SvgText x={p.x + r + 5} y={p.y + 4} fontSize={12} fontWeight="600" fill={night ? NIGHT_RED.label : '#ffffff'}>
          {b.name}
        </SvgText>
      </G>,
    );
    hit.push({ obj: b, x: p.x, y: p.y });
  }

  for (const b of extra ?? []) {
    if (b.alt < -1) continue;
    const p = proj.project(b.v);
    if (!p || p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) continue;
    const c = night ? NIGHT_RED.planet : b.color;
    bodyNodes.push(
      <G key={b.id}>
        <Path d={`M${p.x} ${p.y - 7} L${p.x + 7} ${p.y} L${p.x} ${p.y + 7} L${p.x - 7} ${p.y} Z`} fill={c} />
        <SvgText x={p.x + 11} y={p.y + 4} fontSize={12} fontWeight="700" fill={night ? NIGHT_RED.label : c}>
          {b.name}
        </SvgText>
      </G>,
    );
    hit.push({ obj: b, x: p.x, y: p.y });
  }

  // Deep-sky objects (Messier)
  const dsoNodes: React.ReactNode[] = [];
  if (options.showDsos) {
    for (const d of state.dsos) {
      if (d.alt < 0) continue;
      const p = proj.project(d.v);
      if (!p || p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) continue;
      dsoNodes.push(
        <G key={d.id}>
          <Circle cx={p.x} cy={p.y} r={5} stroke={night ? NIGHT_RED.star : '#7fd1ff'} strokeWidth={1} fill="none" />
          {options.showLabels && (
            <SvgText x={p.x + 8} y={p.y + 3} fontSize={10} fill={night ? NIGHT_RED.label : '#9fdcff'}>
              {d.id}
            </SvgText>
          )}
        </G>,
      );
      hit.push({ obj: d, x: p.x, y: p.y });
    }
  }

  // Horizon + compass points
  let horizon = '';
  let pen = false;
  for (let az = 0; az <= 360; az += 4) {
    const p = proj.project(toVec(0, az));
    if (!p || Math.abs(p.x) > width * 3 || Math.abs(p.y) > height * 3) {
      pen = false;
      continue;
    }
    horizon += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  const cardinalNodes = CARDINALS.map(([label, az]) => {
    const v: Vec3 = toVec(0, az);
    const p = proj.project(v);
    if (!p || p.x < 8 || p.x > width - 8 || p.y < 8 || p.y > height - 8) return null;
    const major = label.length === 1;
    return (
      <SvgText key={label} x={p.x} y={p.y - 6} fontSize={major ? 15 : 11} fontWeight={major ? '700' : '400'} fill={night ? NIGHT_RED.accent : '#ffffff'} textAnchor="middle">
        {label}
      </SvgText>
    );
  });

  // Selection ring
  let ring: React.ReactNode = null;
  if (selectedId) {
    const h = hit.find((e) => e.obj.id === selectedId);
    if (h) ring = <Circle cx={h.x} cy={h.y} r={15} stroke={night ? NIGHT_RED.accent : COLORS.accent} strokeWidth={1.5} fill="none" />;
  }

  const onPress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    let best: { obj: SkyObject; d: number } | null = null;
    for (const h of hit) {
      const d = Math.hypot(h.x - locationX, h.y - locationY);
      // Prefer brighter objects when several are close.
      const score = d + h.obj.mag * 1.5;
      if (d < 32 && (!best || score < best.d)) best = { obj: h.obj, d: score };
    }
    onSelect(best ? best.obj : null);
  };

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onPress}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: options.opaque ? skyColor(sunAlt, night) : 'transparent' }]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Path d={horizon} stroke={night ? NIGHT_RED.horizon : COLORS.horizon} strokeWidth={1.2} fill="none" />
          <Path d={linePath} stroke={night ? NIGHT_RED.line : COLORS.line} strokeWidth={1} fill="none" />
          {starNodes}
          {dsoNodes}
          {bodyNodes}
          {constLabels}
          {labelNodes}
          {cardinalNodes}
          {ring}
        </Svg>
      </View>
    </Pressable>
  );
}

export const SkyCanvas = memo(SkyCanvasImpl);
