import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SUPPORT_EMAIL } from '../lib/config';
import { COLORS } from '../sky/theme';

const SECTIONS: [string, string][] = [
  ['What Stargaze does with your data', 'Stargaze does not collect, store or sell personal data. There are no accounts and no ads.'],
  ['Location', 'Your location is read while the app is open to work out which stars, planets and satellites are above you. It is used on your phone only and is never sent to us.'],
  ['Camera', 'The camera feed is shown behind the star map when you turn Camera on. Nothing is recorded, saved or uploaded.'],
  ['Motion and compass', 'Motion sensors and the compass match the map to where you point your phone. Readings stay on the device.'],
  ['Satellite data', 'When you are online, the app downloads the public orbital elements of the International Space Station from CelesTrak. That request contains no personal information.'],
  ['Purchases', 'Subscriptions are handled by Apple. We use RevenueCat to confirm whether you have Pro. RevenueCat receives an anonymous app user ID and purchase status, not your name or location.'],
  ['Saved items', 'Favourites and settings are stored only on your device.'],
  ['Children', 'Stargaze is suitable for all ages and does not knowingly collect data from anyone.'],
  ['Contact', `Questions: ${SUPPORT_EMAIL}`],
];

export default function Privacy() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 18, gap: 14 }}>
      {SECTIONS.map(([h, b]) => (
        <Fragment key={h}>
          <Text style={styles.h}>{h}</Text>
          <Text style={styles.b}>{b}</Text>
        </Fragment>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080c1a' },
  h: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  b: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: -8 },
});
