import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

const R2D = 180 / Math.PI;

export type DeviceView = {
  /** Compass azimuth the back camera points at (degrees, 0 = true north). */
  az: number;
  /** Altitude the back camera points at (degrees above horizon). */
  alt: number;
  status: 'starting' | 'ok' | 'unavailable';
  /** Compass calibration 0 (none) .. 3 (good). */
  accuracy: number;
};

/**
 * Reads the compass heading and the gravity vector to work out where the back camera points.
 *
 * Altitude comes from gravity, not Euler angles, so it stays stable when the phone is held upright
 * or pointed straight up. `invertTilt` exists because accelerometer sign conventions differ between
 * platforms; it is exposed in the UI so it can be fixed on a real device without a rebuild.
 */
export function useDeviceView(enabled: boolean, invertTilt: boolean, headingOffset: number, altOffset = 0): DeviceView {
  const [view, setView] = useState<DeviceView>({ az: 0, alt: 20, status: 'starting', accuracy: 0 });
  const raw = useRef({ heading: null as number | null, alt: null as number | null, accuracy: 0 });
  const smooth = useRef({ sin: 0, cos: 1, alt: 20, init: false });
  const invert = useRef(invertTilt);
  invert.current = invertTilt;
  const altOff = useRef(altOffset);
  altOff.current = altOffset;

  useEffect(() => {
    if (!enabled) return;
    let headingSub: Location.LocationSubscription | undefined;
    let motionSub: { remove: () => void } | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) {
          if (!cancelled) setView((v) => ({ ...v, status: 'unavailable' }));
          return;
        }
        await DeviceMotion.requestPermissionsAsync();
        DeviceMotion.setUpdateInterval(50);
        motionSub = DeviceMotion.addListener((m) => {
          const g = m.accelerationIncludingGravity;
          if (!g) return;
          const mag = Math.hypot(g.x, g.y, g.z) || 1;
          // Back camera looks along -Z of the device. With the Android-style convention
          // (reading points up at rest) camera altitude = asin(-az / |a|).
          let s = Math.max(-1, Math.min(1, -g.z / mag));
          if (invert.current) s = -s;
          raw.current.alt = Math.asin(s) * R2D;
        });
        headingSub = await Location.watchHeadingAsync((h) => {
          const hd = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          raw.current.heading = hd;
          raw.current.accuracy = h.accuracy;
        });
        timer = setInterval(() => {
          const { heading, alt, accuracy } = raw.current;
          if (heading == null || alt == null) return;
          const s = smooth.current;
          const k = s.init ? 0.18 : 1;
          s.sin += (Math.sin((heading * Math.PI) / 180) - s.sin) * k;
          s.cos += (Math.cos((heading * Math.PI) / 180) - s.cos) * k;
          s.alt += (alt - s.alt) * k;
          s.init = true;
          const az = (((Math.atan2(s.sin, s.cos) * R2D + headingOffset) % 360) + 360) % 360;
          setView({ az, alt: s.alt + altOff.current, status: 'ok', accuracy });
        }, 50);
      } catch {
        if (!cancelled) setView((v) => ({ ...v, status: 'unavailable' }));
      }
    })();

    return () => {
      cancelled = true;
      headingSub?.remove();
      motionSub?.remove();
      if (timer) clearInterval(timer);
    };
  }, [enabled, headingOffset]);

  return view;
}
