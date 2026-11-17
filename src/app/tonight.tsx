import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useObserver } from '../lib/location';
import { usePro } from '../lib/purchases';
import { tonightPlanner } from '../sky/engine';
import { loadIssTle, makeSatrec, nextIssPass, type IssPass } from '../sky/satellite';
import { upcomingShowers } from '../sky/showers';
import { COLORS } from '../sky/theme';

const fmt = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—');

export default function Tonight() {
  const { isPro, openPaywall } = usePro();
  const { observer } = useObserver();
  const rows = useMemo(() => tonightPlanner(new Date(), observer), [observer]);
  const showers = useMemo(() => upcomingShowers(new Date(), 4), []);
  const [pass, setPass] = useState<IssPass | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    loadIssTle().then(({ tle }) => alive && setPass(nextIssPass(makeSatrec(tle), new Date(), observer)));
    return () => {
      alive = false;
    };
  }, [observer]);

  if (!isPro) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Tonight is a Pro feature</Text>
        <Text style={styles.muted}>See when the Moon and every planet rise and set where you are.</Text>
        <Pressable style={styles.button} onPress={async () => (await openPaywall('tonight')) || router.back()}>
          <Text style={styles.buttonText}>See Pro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={styles.muted}>Next 24 hours for your location. Times are in your local time zone.</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>ISS next flyover</Text>
          <Text style={styles.muted}>{pass === undefined ? 'Working it out…' : pass ? `Climbs ${pass.maxAlt.toFixed(0)}° high` : 'No good pass in the next 48 hours'}</Text>
        </View>
        {pass ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.time}>{pass.rise.toLocaleDateString([], { weekday: 'short' })} {fmt(pass.rise)}</Text>
            <Text style={styles.time}>to {fmt(pass.set)}</Text>
          </View>
        ) : null}
      </View>
      {rows.map((r) => (
        <View key={r.name} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{r.name}</Text>
            <Text style={styles.muted}>
              {r.alt > 0 ? `Up now, ${r.alt.toFixed(0)}° high` : 'Below the horizon'} · mag {r.mag.toFixed(1)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.time}>Rises {fmt(r.riseUtc)}</Text>
            <Text style={styles.time}>Sets {fmt(r.setUtc)}</Text>
          </View>
        </View>
      ))}
      <Text style={[styles.title, { textAlign: 'left', fontSize: 17, marginTop: 8 }]}>Meteor showers</Text>
      {showers.map((m) => (
        <View key={m.name} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{m.name}</Text>
            <Text style={styles.muted}>Up to {m.zhr}/hour · {m.moonNote}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.time}>{m.peak.toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.time}>{m.daysAway === 0 ? 'Peaks now' : `in ${m.daysAway} days`}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080c1a' },
  center: { flex: 1, backgroundColor: '#080c1a', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  muted: { color: COLORS.muted, fontSize: 13, textAlign: 'left' },
  row: { flexDirection: 'row', backgroundColor: COLORS.panel, borderRadius: 14, borderWidth: 1, borderColor: COLORS.panelBorder, padding: 14, gap: 10 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  time: { color: COLORS.text, fontSize: 13 },
  button: { backgroundColor: COLORS.accent, borderRadius: 22, paddingHorizontal: 26, paddingVertical: 12 },
  buttonText: { color: '#04101f', fontWeight: '800', fontSize: 15 },
});
