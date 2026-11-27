import * as Haptics from 'expo-haptics';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtAlign, ArtBell, ArtCamera, ArtFind, ArtMeteors, ArtPlan, ArtSky, ArtTonight } from '../components/OnboardArt';
import { declinePushConsent, grantPushConsent } from '../lib/push';
import { writeJson } from '../lib/storage';
import { usePro } from '../lib/purchases';
import { COLORS } from '../sky/theme';

type Page =
  | { kind: 'intro'; title: string; body: string; Art: () => React.JSX.Element }
  | { kind: 'permissions' }
  | { kind: 'notifications' }
  | { kind: 'plans' };

const PAGES: Page[] = [
  { kind: 'intro', title: 'Find any star or planet', body: 'Hold your phone up and see every star, planet and constellation exactly where it is. Works offline.', Art: ArtSky },
  { kind: 'intro', title: 'The map that points the right way', body: 'Sky Align lines the map up with the real sky in one tap, so you never have to guess which way is north.', Art: ArtAlign },
  { kind: 'intro', title: 'Search, then follow the arrow', body: 'Type a planet, star or Messier object and an arrow turns you straight toward it.', Art: ArtFind },
  { kind: 'intro', title: 'See it through your camera', body: 'AR mode labels the real sky behind your camera, so the dot you see is the star you are looking at.', Art: ArtCamera },
  { kind: 'intro', title: "Tonight's sky, planned", body: 'Which planets are up, when they rise and set, and how bright the Moon is. No ads, ever.', Art: ArtTonight },
  { kind: 'intro', title: 'Catch the Geminids', body: 'The best meteor shower of the year peaks on 13–14 December. Stargaze shows you where to look and when.', Art: ArtMeteors },
  { kind: 'intro', title: 'Spot the Space Station', body: 'Track the ISS live and get its next visible passes over your location.', Art: ArtPlan },
  { kind: 'permissions' },
  { kind: 'notifications' },
  { kind: 'plans' },
];

/** Read by the autopilot panel. */
export const ONBOARDING_SCREENS = PAGES.length;

const FREE = ['Live sky with stars to magnitude 4.5', 'Constellations, planets, Sun and Moon', 'Sky Align, Find and the pointing arrow', 'Camera view and Night mode', 'Favourites and meteor shower calendar', 'Time travel ±1 hour'];
const PRO = ['Everything in Free', 'About 2,850 stars (to magnitude 5.5)', '110 Messier deep-sky objects', 'Live ISS tracking and flyover times', 'Tonight planner with rise and set times', 'Time travel ±12 hours'];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { openPaywall } = usePro();
  const [index, setIndex] = useState(0);
  const [granted, setGranted] = useState(false);
  const list = useRef<FlatList<Page>>(null);

  const finish = async () => {
    await writeJson('onboarded-v1', true);
    router.replace('/');
  };
  const next = () => {
    Haptics.selectionAsync();
    if (index < PAGES.length - 1) list.current?.scrollToIndex({ index: index + 1, animated: true });
  };
  const allow = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
      await Camera.requestCameraPermissionsAsync();
      await DeviceMotion.requestPermissionsAsync();
    } catch {
      /* the main screen explains any denied permission */
    }
    setGranted(true);
    next();
  };
  const notifyOn = async () => {
    await grantPushConsent();
    next();
  };
  const notifyOff = async () => {
    await declinePushConsent();
    next();
  };
  const tryPro = async () => {
    await openPaywall();
    await finish();
  };

  const onViewable = useCallback(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }, []);

  const last = index === PAGES.length - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14 }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        {!last && (
          <Pressable onPress={() => list.current?.scrollToIndex({ index: PAGES.length - 1, animated: true })} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }}>
            {item.kind === 'intro' && (
              <View style={styles.page}>
                <item.Art />
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            )}
            {item.kind === 'permissions' && (
              <View style={styles.page}>
                <Text style={styles.title}>Three quick permissions</Text>
                <Text style={styles.body}>Stargaze only uses these while it is open, and nothing leaves your phone.</Text>
                <View style={styles.permCard}>
                  <Perm icon="📍" name="Location" why="Works out which stars are above your city" />
                  <Perm icon="🧭" name="Motion and compass" why="Matches the map to where you point" />
                  <Perm icon="📷" name="Camera" why="Optional: shows the real sky behind the map" />
                </View>
              </View>
            )}
            {item.kind === 'notifications' && (
              <View style={styles.page}>
                <ArtBell />
                <Text style={styles.title}>Never miss a sky event</Text>
                <Text style={styles.body}>Get a heads-up for meteor shower peaks, ISS flyovers and bright planets. A few a month, no spam.</Text>
              </View>
            )}
            {item.kind === 'plans' && (
              <View style={styles.page}>
                <Text style={styles.title}>What you get</Text>
                <View style={styles.plans}>
                  <PlanCard title="Free" items={FREE} />
                  <PlanCard title="Pro" items={PRO} highlight />
                </View>
                <Text style={styles.fine}>7-day free trial on Pro, cancel any time in Settings.</Text>
              </View>
            )}
          </View>
        )}
      />

      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.footer}>
        {PAGES[index].kind === 'permissions' ? (
          <>
            <Button label={granted ? 'Continue' : 'Allow and continue'} onPress={granted ? next : allow} />
            <Pressable onPress={next} hitSlop={10} accessibilityRole="button">
              <Text style={styles.link}>Not now</Text>
            </Pressable>
          </>
        ) : PAGES[index].kind === 'notifications' ? (
          <>
            <Button label="Turn on reminders" onPress={notifyOn} />
            <Pressable onPress={notifyOff} hitSlop={10} accessibilityRole="button">
              <Text style={styles.link}>Not now</Text>
            </Pressable>
          </>
        ) : last ? (
          <>
            <Button label="Try Stargaze Pro free" onPress={tryPro} />
            <Pressable onPress={finish} hitSlop={10} accessibilityRole="button">
              <Text style={styles.link}>Continue with Free</Text>
            </Pressable>
          </>
        ) : (
          <Button label="Next" onPress={next} />
        )}
      </View>
    </View>
  );
}

const Button = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button">
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);

const Perm = ({ icon, name, why }: { icon: string; name: string; why: string }) => (
  <View style={styles.perm}>
    <Text style={styles.permIcon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.permName}>{name}</Text>
      <Text style={styles.permWhy}>{why}</Text>
    </View>
  </View>
);

const PlanCard = ({ title, items, highlight }: { title: string; items: string[]; highlight?: boolean }) => (
  <View style={[styles.plan, highlight && styles.planHi]}>
    <Text style={[styles.planTitle, highlight && { color: '#04101f' }]}>{title}</Text>
    {items.map((t) => (
      <Text key={t} style={[styles.planItem, highlight && { color: '#04101f' }]}>
        ✓ {t}
      </Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03050d' },
  topRow: { flexDirection: 'row', paddingHorizontal: 22, height: 28 },
  skip: { color: COLORS.muted, fontSize: 15, fontWeight: '600' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  body: { color: COLORS.muted, fontSize: 16, textAlign: 'center', lineHeight: 23 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotOn: { width: 22, backgroundColor: COLORS.accent },
  footer: { paddingHorizontal: 24, gap: 14, alignItems: 'center' },
  button: { backgroundColor: COLORS.accent, borderRadius: 28, paddingVertical: 16, alignSelf: 'stretch', alignItems: 'center' },
  buttonText: { color: '#04101f', fontWeight: '800', fontSize: 17 },
  link: { color: COLORS.muted, fontSize: 15, fontWeight: '600', paddingVertical: 4 },
  permCard: { alignSelf: 'stretch', backgroundColor: COLORS.panel, borderRadius: 18, borderWidth: 1, borderColor: COLORS.panelBorder, padding: 8, marginTop: 6 },
  perm: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  permIcon: { fontSize: 26 },
  permName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  permWhy: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  plans: { alignSelf: 'stretch', gap: 12 },
  plan: { backgroundColor: COLORS.panel, borderRadius: 18, borderWidth: 1, borderColor: COLORS.panelBorder, padding: 16, gap: 6 },
  planHi: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  planTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 2 },
  planItem: { color: COLORS.muted, fontSize: 13.5 },
  fine: { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
});
