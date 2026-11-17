import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, NIGHT_RED } from '../sky/theme';
import type { SkyObject } from '../sky/types';

const KIND: Record<SkyObject['kind'], string> = { star: 'Star', planet: 'Planet', sun: 'Sun', moon: 'Moon', dso: 'Deep-sky object', sat: 'Space station' };

const compass = (az: number) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(az / 22.5) % 16];

export function InfoCard({ obj, night, favorite, onToggleFavorite }: { obj: SkyObject; night?: boolean; favorite?: boolean; onToggleFavorite?: () => void }) {
  const accent = night ? NIGHT_RED.accent : COLORS.accent;
  const above = obj.alt >= 0;
  return (
    <View style={[styles.card, { borderColor: COLORS.panelBorder }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: night ? NIGHT_RED.label : COLORS.text }]}>{obj.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.kind, { color: accent }]}>{KIND[obj.kind]}</Text>
          {onToggleFavorite && obj.kind !== 'sun' && (
            <Pressable onPress={onToggleFavorite} hitSlop={12} accessibilityRole="button" accessibilityLabel={favorite ? `Remove ${obj.name} from favourites` : `Add ${obj.name} to favourites`}>
              <Text style={{ color: accent, fontSize: 20 }}>{favorite ? '★' : '☆'}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={styles.line}>
        {above ? `${obj.alt.toFixed(0)}° above the horizon, toward ${compass(obj.az)} (${obj.az.toFixed(0)}°)` : 'Below the horizon right now'}
        {obj.kind !== 'sun' ? ` · mag ${obj.mag.toFixed(1)}` : ''}
      </Text>
      {obj.detail ? <Text style={styles.line}>{obj.detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.panel, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  kind: { fontSize: 12, fontWeight: '700' },
  line: { color: COLORS.muted, fontSize: 13 },
});
