import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRIVACY_URL, TERMS_URL } from '../lib/config';
import { COLORS } from '../sky/theme';

/** RevenueCat package identifiers, in display order. */
export const PLAN_IDS = ['$rc_weekly', '$rc_monthly', '$rc_annual', '$rc_lifetime'] as const;
const LABEL: Record<string, string> = { $rc_weekly: 'Weekly', $rc_monthly: 'Monthly', $rc_annual: 'Annual', $rc_lifetime: 'Lifetime' };
const PER: Record<string, string> = { $rc_weekly: '/ week', $rc_monthly: '/ month', $rc_annual: '/ year', $rc_lifetime: 'one time' };
const PERKS = ['About 2,850 stars (to magnitude 5.5)', '110 Messier deep-sky objects', 'Live ISS tracking and flyover times', 'Tonight planner with rise and set times', 'Time travel ±12 hours'];

type Props = {
  onPurchased: (info: CustomerInfo) => void;
  onRestored: (info: CustomerInfo) => void;
  onClose: () => void;
};

function trialText(p: PurchasesPackage): string | null {
  const intro = p.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits * (intro.periodUnit === 'WEEK' ? 7 : 1);
  const unit = intro.periodUnit === 'MONTH' ? 'month' : 'day';
  return `${n}-${unit} free trial`;
}

/** Loads the current offering and keeps only the four standard plans, in order; missing ones are skipped. */
async function fetchPlans(): Promise<{ found: PurchasesPackage[]; failed: boolean }> {
  try {
    const offerings = await Purchases.getOfferings();
    const all = offerings.current?.availablePackages ?? [];
    const found = PLAN_IDS.map((id) => all.find((p) => p.identifier === id)).filter((p): p is PurchasesPackage => !!p);
    return { found, failed: false };
  } catch (e) {
    console.warn('Offerings failed', e);
    return { found: [], failed: true };
  }
}

export function Paywall({ onPurchased, onRestored, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const apply = (r: { found: PurchasesPackage[]; failed: boolean }) => {
    setError(r.failed);
    setPackages(r.found);
    setSelected(r.found.find((p) => p.identifier === '$rc_annual')?.identifier ?? r.found[0]?.identifier ?? null);
  };

  useEffect(() => {
    let alive = true;
    fetchPlans().then((r) => alive && apply(r));
    return () => {
      alive = false;
    };
  }, []);

  const load = () => {
    setError(false);
    setPackages(null);
    fetchPlans().then(apply);
  };

  const buy = async () => {
    const pkg = packages?.find((p) => p.identifier === selected);
    if (!pkg || busy) return;
    setBusy(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      onPurchased(customerInfo);
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) Alert.alert('Purchase failed', err.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const info = await Purchases.restorePurchases();
      onRestored(info);
      if (!info.entitlements.active.pro) Alert.alert('Nothing to restore', 'No active Stargaze Pro purchase was found for this Apple ID.');
    } catch (e) {
      Alert.alert('Restore failed', (e as Error).message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const pkg = packages?.find((p) => p.identifier === selected);
  const trial = pkg ? trialText(pkg) : null;
  const cta = !pkg ? 'Continue' : trial ? `Start ${trial}` : pkg.identifier === '$rc_lifetime' ? `Buy lifetime · ${pkg.product.priceString}` : 'Continue';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.top}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Stargaze Pro</Text>
        <Text style={styles.sub}>See the whole sky, not just the bright part.</Text>
        <View style={styles.perks}>
          {PERKS.map((p) => (
            <Text key={p} style={styles.perk}>✦  {p}</Text>
          ))}
        </View>

        {packages === null && <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 30 }} />}
        {packages !== null && packages.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.sub}>{error ? 'Could not reach the App Store.' : 'Plans are not available right now.'}</Text>
            <Pressable style={styles.secondary} onPress={load} accessibilityRole="button">
              <Text style={styles.secondaryText}>Try again</Text>
            </Pressable>
          </View>
        )}
        {packages?.map((p) => {
          const on = p.identifier === selected;
          const t = trialText(p);
          return (
            <Pressable
              key={p.identifier}
              onPress={() => setSelected(p.identifier)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.plan, on && styles.planOn]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>
                  {LABEL[p.identifier]}
                  {p.identifier === '$rc_annual' ? '  · Best value' : ''}
                </Text>
                {t ? <Text style={styles.planNote}>{t}, then {p.product.priceString} {PER[p.identifier]}</Text> : null}
              </View>
              <Text style={styles.planPrice}>
                {p.product.priceString} <Text style={styles.planPer}>{PER[p.identifier]}</Text>
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable style={[styles.cta, (!pkg || busy) && { opacity: 0.5 }]} onPress={buy} disabled={!pkg || busy} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#04101f" /> : <Text style={styles.ctaText}>{cta}</Text>}
      </Pressable>
      <Text style={styles.legal}>
        {pkg?.identifier === '$rc_lifetime'
          ? 'One-time purchase. No subscription.'
          : 'Subscriptions renew automatically at the price shown unless cancelled at least 24 hours before the end of the period. Manage or cancel in your Apple ID settings.'}
      </Text>
      <View style={styles.links}>
        <Text style={styles.link} onPress={restore}>Restore</Text>
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070b1e', paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: COLORS.muted, fontSize: 20, padding: 4 },
  body: { paddingBottom: 16, gap: 10 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub: { color: COLORS.muted, fontSize: 15, textAlign: 'center' },
  perks: { gap: 6, marginVertical: 12 },
  perk: { color: COLORS.text, fontSize: 15 },
  empty: { alignItems: 'center', gap: 12, marginVertical: 20 },
  plan: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.panelBorder, backgroundColor: COLORS.panel, borderRadius: 14, padding: 14, gap: 10 },
  planOn: { borderColor: COLORS.accent, backgroundColor: 'rgba(127,178,255,0.14)' },
  planName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  planNote: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  planPrice: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  planPer: { color: COLORS.muted, fontSize: 12, fontWeight: '400' },
  cta: { backgroundColor: COLORS.accent, borderRadius: 24, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  ctaText: { color: '#04101f', fontWeight: '800', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  secondaryText: { color: COLORS.accent, fontWeight: '700' },
  legal: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 8 },
  link: { color: COLORS.text, fontSize: 13, textDecorationLine: 'underline' },
});
