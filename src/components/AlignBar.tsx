import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, NIGHT_RED } from '../sky/theme';

type Props = { targetName: string | null; night?: boolean; onConfirm: () => void; onCancel: () => void };

/** Sky Align banner plus a centre crosshair. The user lines the crosshair up with the named object and taps Align. */
export function AlignBar({ targetName, night, onConfirm, onCancel }: Props) {
  const accent = night ? NIGHT_RED.accent : COLORS.accent;
  return (
    <>
      <View style={styles.crossWrap} pointerEvents="none">
        <View style={[styles.cross, { borderColor: accent }]} />
        <View style={[styles.dot, { backgroundColor: accent }]} />
      </View>
      <View style={[styles.bar, { borderColor: accent }]}>
        {targetName ? (
          <>
            <Text style={styles.title}>Sky Align</Text>
            <Text style={styles.body}>Point the circle at {targetName} (ringed on the map), then tap Align.</Text>
            <View style={styles.row}>
              <Pressable onPress={onConfirm} style={[styles.btn, { backgroundColor: accent }]} accessibilityRole="button">
                <Text style={styles.btnText}>Align</Text>
              </Pressable>
              <Pressable onPress={onCancel} style={styles.btnGhost} accessibilityRole="button">
                <Text style={[styles.btnText, { color: COLORS.text }]}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Nothing bright to align with</Text>
            <Text style={styles.body}>Sky Align needs the Moon, a bright planet or a bright star above the horizon. Try again after dusk.</Text>
            <Pressable onPress={onCancel} style={styles.btnGhost} accessibilityRole="button">
              <Text style={[styles.btnText, { color: COLORS.text }]}>OK</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  crossWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  cross: { width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  bar: { position: 'absolute', left: 14, right: 14, top: '30%', backgroundColor: COLORS.panel, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  body: { color: COLORS.muted, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { borderRadius: 18, paddingHorizontal: 22, paddingVertical: 10 },
  btnGhost: { borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.panelBorder, alignSelf: 'flex-start' },
  btnText: { color: '#04101f', fontWeight: '800', fontSize: 14 },
});
