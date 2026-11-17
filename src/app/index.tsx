import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router } from 'expo-router';
import { Linking } from 'react-native';
import Slider from '@react-native-community/slider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InfoCard } from '../components/InfoCard';
import { AlignBar } from '../components/AlignBar';
import { FindSheet } from '../components/FindSheet';
import { GuideOverlay } from '../components/GuideOverlay';
import { Pill } from '../components/Pill';
import rawSky from '../data/sky-data.json';
import { SUPPORT_EMAIL, TERMS_URL } from '../lib/config';
import { useFavorites } from '../lib/favorites';
import { useObserver } from '../lib/location';
import { usePersisted } from '../lib/storage';
import { useDeviceView } from '../lib/orientation';
import { usePro } from '../lib/purchases';
import { issObject, loadIssTle, makeSatrec } from '../sky/satellite';
import { SkyCanvas, type SkyOptions } from '../sky/SkyCanvas';
import { buildCatalog, computeAlign, guideTo, locateEntry, pickAlignTarget, type SearchEntry } from '../sky/align';
import { clampAlt, makeProjector } from '../sky/projection';
import { COLORS, NIGHT_RED } from '../sky/theme';
import type { SkyData, SkyObject, View as SkyView } from '../sky/types';

const sky = rawSky as unknown as SkyData;
const FREE_TIME_LIMIT_MIN = 60;
const FREE_MAG = 4.5;
const PRO_MAG = 5.5;

export default function SkyScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isPro, openPaywall, unconfigured, devTogglePro, restore, manageSubscription } = usePro();
  const { observer, source, permission: locPermission } = useObserver();
  const [camPermission, requestCamPermission] = useCameraPermissions();

  const [live, setLive] = useState(true);
  const [camera, setCamera] = useState(true);
  const [lines, setLines] = useState(true);
  const [labels, setLabels] = useState(true);
  const [night, setNight] = useState(false);
  const [dsos, setDsos] = useState(false);
  const [invertTilt, setInvertTilt] = useState(false);
  const [headingOffset, setHeadingOffset] = useState(0);
  const [altOffset, setAltOffset] = useState(0);
  const [aligning, setAligning] = useState(false);
  const [alignTarget, setAlignTarget] = useState<SkyObject | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findEntry, setFindEntry] = useState<SearchEntry | null>(null);
  const [onboarded, , onboardedLoaded] = usePersisted<boolean>('onboarded-v1', false);
  const favorites = useFavorites();
  const [issOn, setIssOn] = useState(false);
  const [issRec, setIssRec] = useState<ReturnType<typeof makeSatrec> | null>(null);
  const [issTick, setIssTick] = useState(() => Date.now());
  const [offsetMin, setOffsetMin] = useState(0);
  const [selected, setSelected] = useState<SkyObject | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const device = useDeviceView(live, invertTilt, headingOffset, altOffset);
  const [manual, setManual] = useState<SkyView>({ az: 180, alt: 35, fov: 60 });
  const [fov, setFov] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const sensorsOk = live && device.status === 'ok';
  const view: SkyView = sensorsOk ? { az: device.az, alt: clampAlt(device.alt), fov } : { ...manual, fov };

  // Keep refs so the PanResponder (created once) always sees current values.
  const viewRef = useRef(view);
  viewRef.current = view;
  const fovRef = useRef(fov);
  fovRef.current = fov;
  const heightRef = useRef(height);
  heightRef.current = height;
  const liveRef = useRef(live);
  liveRef.current = live;

  const pinch = useRef({ startDist: 0, startFov: 60 });
  const drag = useRef({ az: 0, alt: 0 });

  const touchDist = (t: readonly { pageX: number; pageY: number }[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
        onPanResponderGrant: (e) => {
          const v = viewRef.current;
          drag.current = { az: v.az, alt: v.alt };
          if (e.nativeEvent.touches.length === 2) pinch.current = { startDist: touchDist(e.nativeEvent.touches), startFov: fovRef.current };
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length === 2) {
            if (pinch.current.startDist === 0) pinch.current = { startDist: touchDist(touches), startFov: fovRef.current };
            const ratio = pinch.current.startDist / touchDist(touches);
            setFov(Math.max(15, Math.min(100, pinch.current.startFov * ratio)));
            return;
          }
          pinch.current.startDist = 0;
          if (liveRef.current) setLive(false); // dragging takes manual control
          const dpp = fovRef.current / heightRef.current;
          setManual({
            az: (((drag.current.az - g.dx * dpp) % 360) + 360) % 360,
            alt: clampAlt(drag.current.alt + g.dy * dpp),
            fov: fovRef.current,
          });
        },
        onPanResponderRelease: () => {
          pinch.current.startDist = 0;
        },
      }),
    [],
  );

  useEffect(() => {
    if (!issOn) return;
    let alive = true;
    if (!issRec) loadIssTle().then(({ tle }) => alive && setIssRec(makeSatrec(tle)));
    const t = setInterval(() => setIssTick(Date.now()), 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [issOn, issRec]);

  const date = useMemo(() => new Date(now + offsetMin * 60000), [now, offsetMin]);
  const issObj = useMemo(
    () => (issOn && issRec ? issObject(issRec, new Date(issTick + offsetMin * 60000), observer) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issOn, issRec, issTick, offsetMin, observer.lat.toFixed(2), observer.lon.toFixed(2)],
  );
  const catalog = useMemo(() => buildCatalog(sky), []);
  const minuteKey = Math.floor(date.getTime() / 60000);
  const findTarget = useMemo(
    () => (findEntry ? locateEntry(sky, findEntry, new Date(minuteKey * 60000), observer) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findEntry, minuteKey, observer.lat.toFixed(2), observer.lon.toFixed(2)],
  );

  const startAlign = useCallback(() => {
    if (!live) setLive(true);
    setOffsetMin(0);
    setSelected(null);
    setAlignTarget(pickAlignTarget(sky, new Date(), observer));
    setAligning(true);
  }, [live, observer]);

  const confirmAlign = useCallback(() => {
    if (!alignTarget || device.status !== 'ok') return;
    const r = computeAlign(alignTarget, device.az, device.alt, { headingOffset, altOffset, invertTilt });
    setHeadingOffset(r.headingOffset);
    setAltOffset(r.altOffset);
    setInvertTilt(r.invertTilt);
    setAligning(false);
    setAlignTarget(null);
  }, [alignTarget, device, headingOffset, altOffset, invertTilt]);

  const cancelAlign = useCallback(() => {
    setAligning(false);
    setAlignTarget(null);
  }, []);

  const pickFind = useCallback(
    (e: SearchEntry) => {
      setFindOpen(false);
      setFindEntry(e);
      const t = locateEntry(sky, e, new Date(now + offsetMin * 60000), observer);
      if (t && t.alt >= 0) {
        setSelected(t);
        // Without live sensors, jump the map straight to the object.
        if (!(live && device.status === 'ok')) {
          setLive(false);
          setManual({ az: t.az, alt: clampAlt(t.alt), fov });
        }
      }
    },
    [now, offsetMin, observer, live, device.status, fov],
  );

  const toggleCamera = useCallback(async () => {
    if (camera) return setCamera(false);
    if (!camPermission?.granted) {
      const r = await requestCamPermission();
      if (!r.granted) return Alert.alert('Camera access is off', 'Allow the camera in Settings to see the sky behind the star map.');
    }
    setCamera(true);
  }, [camera, camPermission, requestCamPermission]);

  const requirePro = useCallback(
    async (action: () => void, source = 'feature') => {
      if (isPro) return action();
      const bought = await openPaywall(source);
      if (bought) action();
    },
    [isPro, openPaywall],
  );

  const showCamera = camera && !!camPermission?.granted;
  const options: SkyOptions = {
    magLimit: isPro ? PRO_MAG : FREE_MAG,
    showConstellations: lines,
    showLabels: labels,
    showDsos: isPro && dsos,
    night,
    opaque: !showCamera,
  };

  const accent = night ? NIGHT_RED.accent : COLORS.accent;
  const timeLabel =
    offsetMin === 0
      ? 'Now'
      : `${offsetMin > 0 ? '+' : '−'}${Math.floor(Math.abs(offsetMin) / 60)}h ${Math.abs(offsetMin) % 60}m · ${date.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;

  if (onboardedLoaded && !onboarded) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.root} {...pan.panHandlers}>
      {showCamera && <CameraView style={StyleSheet.absoluteFill} facing="back" />}
      {showCamera && night && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,0,0,0.65)' }]} pointerEvents="none" />}

      <SkyCanvas
        width={width}
        height={height}
        view={view}
        date={date}
        observer={observer}
        options={options}
        selectedId={aligning ? alignTarget?.id ?? null : selected?.id ?? findTarget?.id ?? null}
        extra={issObj ? [issObj] : undefined}
        onSelect={setSelected}
      />

      {findTarget && !aligning && (() => {
        const p = makeProjector(view, width, height).project(findTarget.v);
        const onScreen = !!p && p.x > 20 && p.x < width - 20 && p.y > 20 && p.y < height - 20;
        return <GuideOverlay name={findTarget.name} guide={onScreen ? null : guideTo(view, findTarget)} below={findTarget.alt < 0} night={night} onClear={() => setFindEntry(null)} />;
      })()}
      {aligning && <AlignBar targetName={alignTarget?.name ?? null} night={night} onConfirm={confirmAlign} onCancel={cancelAlign} />}

      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              {source === 'gps' ? `${observer.lat.toFixed(1)}°, ${observer.lon.toFixed(1)}°` : locPermission === 'denied' ? 'Location off · New Delhi' : 'Finding location…'}
            </Text>
          </View>
          <View style={styles.topRight}>
            {!isPro && <Pill label="PRO" onPress={() => openPaywall('pro_pill')} active night={night} />}
            <Pill label="⚙︎" onPress={() => setSettingsOpen(true)} night={night} />
          </View>
        </View>
        {live && device.status === 'unavailable' && <Text style={styles.hint}>Motion sensors unavailable. Drag to explore the sky.</Text>}
        {sensorsOk && device.accuracy < 2 && <Text style={styles.hint}>Compass needs calibration: wave the phone in a figure 8.</Text>}
        {!live && <Text style={styles.hint}>Drag to look around, pinch to zoom.</Text>}
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        {selected && <InfoCard obj={selected} night={night} favorite={favorites.has(selected.id)} onToggleFavorite={() => favorites.toggle(selected.id)} />}

        <View style={styles.sliderRow}>
          <Text style={[styles.timeLabel, { color: night ? NIGHT_RED.label : COLORS.text }]}>{timeLabel}</Text>
          {offsetMin !== 0 && (
            <Pressable onPress={() => setOffsetMin(0)} hitSlop={10}>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>Reset</Text>
            </Pressable>
          )}
        </View>
        <Slider
          minimumValue={-720}
          maximumValue={720}
          step={5}
          value={offsetMin}
          minimumTrackTintColor={accent}
          maximumTrackTintColor="rgba(255,255,255,0.25)"
          thumbTintColor={accent}
          onValueChange={(v) => setOffsetMin(isPro ? v : Math.max(-FREE_TIME_LIMIT_MIN, Math.min(FREE_TIME_LIMIT_MIN, v)))}
          onSlidingComplete={async (v) => {
            if (!isPro && Math.abs(v) > FREE_TIME_LIMIT_MIN) {
              setOffsetMin(Math.sign(v) * FREE_TIME_LIMIT_MIN);
              await openPaywall('time_travel');
            }
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          <Pill label={live ? 'Live' : 'Drag'} active={live} night={night} onPress={() => setLive((l) => !l)} />
          <Pill label="Camera" active={showCamera} night={night} onPress={toggleCamera} />
          <Pill label="Find" night={night} onPress={() => setFindOpen(true)} />
          <Pill label="Align" active={aligning} night={night} onPress={startAlign} />
          <Pill label="Lines" active={lines} night={night} onPress={() => setLines((v) => !v)} />
          <Pill label="Names" active={labels} night={night} onPress={() => setLabels((v) => !v)} />
          <Pill label="Night" active={night} night={night} onPress={() => setNight((v) => !v)} />
          <Pill label="Messier" active={isPro && dsos} night={night} badge={isPro ? undefined : 'PRO'} onPress={() => requirePro(() => setDsos((v) => !v), 'messier')} />
          <Pill label="ISS" active={issOn} night={night} badge={isPro ? undefined : 'PRO'} onPress={() => requirePro(() => setIssOn((v) => !v), 'iss')} />
          <Pill label="Tonight" night={night} badge={isPro ? undefined : 'PRO'} onPress={() => requirePro(() => router.push('/tonight'), 'tonight')} />
        </ScrollView>
      </View>

      <FindSheet visible={findOpen} catalog={catalog} favoriteIds={favorites.ids} onPick={pickFind} onClose={() => setFindOpen(false)} />

      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Settings</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Flip tilt direction</Text>
                <Text style={styles.settingHelp}>Turn on if the map moves the wrong way when you tilt the phone up or down.</Text>
              </View>
              <Switch value={invertTilt} onValueChange={setInvertTilt} />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Compass offset: {headingOffset}°</Text>
                <Text style={styles.settingHelp}>Fine-tune if known stars sit slightly left or right of where they should.</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="−5" onPress={() => setHeadingOffset((o) => Math.max(-180, o - 5))} />
                <Pill label="+5" onPress={() => setHeadingOffset((o) => Math.min(180, o + 5))} />
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Sky Align</Text>
                <Text style={styles.settingHelp}>Re-run Align from the main screen any time. Reset clears what it learned.</Text>
              </View>
              <Pill
                label="Reset"
                onPress={() => {
                  setHeadingOffset(0);
                  setAltOffset(0);
                  setInvertTilt(false);
                }}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Subscription</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Restore" onPress={restore} />
                <Pill label="Manage" onPress={manageSubscription} />
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>About</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pill label="Privacy" onPress={() => { setSettingsOpen(false); router.push('/privacy'); }} />
                <Pill label="Terms" onPress={() => Linking.openURL(TERMS_URL)} />
                <Pill label="Support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Stargaze%20support`)} />
              </View>
            </View>

            {__DEV__ && unconfigured && (
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Developer: Pro {isPro ? 'on' : 'off'}</Text>
                  <Text style={styles.settingHelp}>RevenueCat key not set. This toggle only exists in development.</Text>
                </View>
                <Switch value={isPro} onValueChange={devTogglePro} />
              </View>
            )}

            <Text style={styles.credit}>Star data: Hipparcos via d3-celestial (BSD). Positions: astronomy-engine (MIT). ISS orbit: CelesTrak, SGP4 via satellite.js (MIT).</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03050d' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, gap: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { flexDirection: 'row', gap: 8 },
  statusPill: { backgroundColor: COLORS.panel, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, borderWidth: 1, borderColor: COLORS.panelBorder },
  statusText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  hint: { alignSelf: 'flex-start', lineHeight: 17, color: COLORS.text, backgroundColor: COLORS.panel, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, fontSize: 12, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, gap: 8 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  timeLabel: { fontSize: 14, fontWeight: '700' },
  pills: { gap: 8, paddingRight: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#0c1226', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 18 },
  sheetTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  settingHelp: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  credit: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
});
