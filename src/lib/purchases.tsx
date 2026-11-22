import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Modal, Platform, View } from 'react-native';

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = 'pro';

const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';

type ProContextValue = {
  isPro: boolean;
  ready: boolean;
  /** True when no RevenueCat key is set: purchases are disabled and a dev toggle is shown. */
  unconfigured: boolean;
  openPaywall: (source?: string) => Promise<boolean>;
  restore: () => Promise<void>;
  manageSubscription: () => Promise<void>;
  /** Development only: flips Pro on and off so gated UI can be tested before RevenueCat is set up. */
  devTogglePro: () => void;
};

const ProContext = createContext<ProContextValue | null>(null);

const hasPro = (info: CustomerInfo) => info.entitlements.active[PRO_ENTITLEMENT] !== undefined;

export function ProProvider({ children }: { children: ReactNode }) {
  const unconfigured = Platform.OS !== 'ios' || IOS_KEY.length === 0;
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(unconfigured);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const paywallDone = useRef<((bought: boolean) => void) | null>(null);

  /** Closes the paywall and settles the pending openPaywall() call. Safe to call twice. */
  const closePaywall = useCallback((bought: boolean) => {
    setPaywallOpen(false);
    paywallDone.current?.(bought);
    paywallDone.current = null;
  }, []);

  useEffect(() => {
    if (unconfigured) return;
    let active = true;
    (async () => {
      try {
        if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: IOS_KEY });
        Purchases.addCustomerInfoUpdateListener((info) => {
          if (!active) return;
          const pro = hasPro(info);
          setIsPro(pro);
          // A purchase can land here before the paywall reports it, so never
          // leave the paywall on screen once Pro is active.
          if (pro) closePaywall(true);
        });
        Purchases.setAttributes({ app: 'stargaze', platform: Platform.OS });
        const info = await Purchases.getCustomerInfo();
        if (active) setIsPro(hasPro(info));
      } catch (e) {
        console.warn('RevenueCat setup failed', e);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [unconfigured, closePaywall]);

  const openPaywall = useCallback(async (source = 'unknown') => {
    if (unconfigured) {
      Alert.alert('Purchases not set up', 'Add EXPO_PUBLIC_RC_IOS_KEY (see .env.example) and build a development client to test the RevenueCat paywall.');
      return false;
    }
    // Lets RevenueCat segment conversions by where the paywall was opened from.
    Purchases.setAttributes({ paywall_source: source });
    // The paywall is hosted in our own modal so it always closes the moment a
    // purchase or restore succeeds, instead of waiting on the native sheet.
    paywallDone.current?.(false);
    return new Promise<boolean>((resolve) => {
      paywallDone.current = resolve;
      setPaywallOpen(true);
    });
  }, [unconfigured]);

  const restore = useCallback(async () => {
    if (unconfigured) return;
    try {
      setIsPro(hasPro(await Purchases.restorePurchases()));
    } catch (e) {
      console.warn('Restore failed', e);
    }
  }, [unconfigured]);

  const manageSubscription = useCallback(async () => {
    if (unconfigured) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      console.warn('Customer Center failed', e);
    }
  }, [unconfigured]);

  const value = useMemo<ProContextValue>(
    () => ({ isPro, ready, unconfigured, openPaywall, restore, manageSubscription, devTogglePro: () => setIsPro((p) => !p) }),
    [isPro, ready, unconfigured, openPaywall, restore, manageSubscription],
  );
  return (
    <ProContext.Provider value={value}>
      {children}
      <Modal visible={paywallOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => closePaywall(false)}>
        <View style={{ flex: 1, backgroundColor: '#070b1e' }}>
          {paywallOpen && (
            <RevenueCatUI.Paywall
              options={{ displayCloseButton: true }}
              onPurchaseCompleted={({ customerInfo }) => {
                setIsPro(hasPro(customerInfo));
                closePaywall(true);
              }}
              onRestoreCompleted={({ customerInfo }) => {
                const pro = hasPro(customerInfo);
                setIsPro(pro);
                if (pro) closePaywall(true);
              }}
              onDismiss={() => closePaywall(false)}
            />
          )}
        </View>
      </Modal>
    </ProContext.Provider>
  );
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside ProProvider');
  return ctx;
}
