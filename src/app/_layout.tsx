import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDbReady } from '@/db/migrate';
import { seedExercises } from '@/db/seed';
import { initI18n, setLanguage } from '@/i18n';
import { configureNotifications } from '@/lib/notifications';
import { useSettings } from '@/store/settings';
import { DialogHost, Text, ThemeProvider, ToastHost, useTheme } from '@/ui';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 150 });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const { success, error } = useDbReady();
  const language = useSettings((s) => s.language);

  useMemo(() => initI18n(language), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLanguage(language), [language]);

  useEffect(() => {
    if (success) {
      seedExercises();
      void configureNotifications();
    }
  }, [success]);

  const ready = fontsLoaded && (success || !!error);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {error ? <MigrationError message={error.message} /> : <Navigation />}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MigrationError({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text variant="h2">Database error</Text>
      <Text color="muted" style={{ marginTop: 8 }}>
        {message}
      </Text>
    </View>
  );
}

function Navigation() {
  const { colors, isDark } = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 200,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/active" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="workout/summary" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="exercise/picker" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="exercise/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="routine/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="measurements/log" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
      <DialogHost />
    </View>
  );
}
