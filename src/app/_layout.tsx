import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProProvider } from '../lib/purchases';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#03050d' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="privacy"
            options={{ presentation: 'modal', headerShown: true, title: 'Privacy Policy', headerStyle: { backgroundColor: '#080c1a' }, headerTintColor: '#e8efff' }}
          />
          <Stack.Screen
            name="tonight"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Tonight',
              headerStyle: { backgroundColor: '#080c1a' },
              headerTintColor: '#e8efff',
            }}
          />
        </Stack>
      </ProProvider>
    </SafeAreaProvider>
  );
}
