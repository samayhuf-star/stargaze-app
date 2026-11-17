import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, NIGHT_RED } from '../sky/theme';

type Props = {
  name: string;
  /** Arrow angle (0 = up, clockwise) and distance in degrees; null when the target is on screen. */
  guide: { angle: number; dist: number } | null;
  below: boolean;
  night?: boolean;
  onClear: () => void;
};

/** "Point me to it" arrow shown while a Find target is active. */
export function GuideOverlay({ name, guide, below, night, onClear }: Props) {
  const accent = night ? NIGHT_RED.accent : COLORS.accent;
  const text = below ? `${name} is below the horizon right now` : guide ? `${name} · ${Math.round(guide.dist)}° away` : `${name} is on screen`;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {guide && !below && (
        <View style={[styles.arrowBox, { transform: [{ rotate: `${guide.angle}deg` }] }]} pointerEvents="none">
          <Text style={[styles.arrow, { color: accent }]}>▲</Text>
        </View>
      )}
      <Pressable onPress={onClear} style={[styles.chip, { borderColor: accent }]} accessibilityRole="button" accessibilityLabel={`Stop pointing to ${name}`}>
        <Text style={[styles.chipText, { color: night ? NIGHT_RED.label : COLORS.text }]}>{text}  ✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  arrowBox: { position: 'absolute', width: 190, height: 190, alignItems: 'center' },
  arrow: { fontSize: 34, opacity: 0.95 },
  chip: { position: 'absolute', top: '24%', backgroundColor: COLORS.panel, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '700' },
});
