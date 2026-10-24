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
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDatabaseReady } from '@/db/migrate';
import { renameDefaultWorkoutNames } from '@/db/renameDefaultWorkoutNames';
import { seedExercises } from '@/db/seed';
import { initI18n, resolveLanguage, setLanguage } from '@/i18n';
import { configureNotifications } from '@/lib/notifications';
import { useSettings } from '@/store/settings';
import { DialogHost, Text, ThemeProvider, ToastHost, useTheme } from '@/ui';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 150 });

export default function RootLayout() {
  const [areFontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const { success: isDatabaseReady, error: databaseError } = useDatabaseReady();
  const language = useSettings((state) => state.language);

  // Выполняется один раз, во время первого рендера, чтобы переводы были готовы до отрисовки любого экрана.
  useMemo(() => initI18n(language), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLanguage(language), [language]);

  useEffect(() => {
    if (isDatabaseReady) {
      seedExercises();
      renameDefaultWorkoutNames(resolveLanguage(useSettings.getState().language));
      void configureNotifications();
    }
  }, [isDatabaseReady]);

  const isAppReady = areFontsLoaded && (isDatabaseReady || !!databaseError);
  useEffect(() => {
    if (isAppReady) void SplashScreen.hideAsync();
  }, [isAppReady]);

  if (!isAppReady) return null;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ThemeProvider>
          {databaseError ? <MigrationError message={databaseError.message} /> : <Navigation />}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function MigrationError({ message }: { message: string }) {
  return (
    <View style={styles.migrationError}>
      <Text variant="h2">Database error</Text>
      <Text color="muted" style={styles.migrationErrorMessage}>
        {message}
      </Text>
    </View>
  );
}

function Navigation() {
  const { colors, isDark } = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          // Длительности как в Android: ios_from_right занимает 200 мс, slide_from_* — 400 мс.
          animation: 'ios_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/active"
          options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="workout/summary"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="exercise/picker"
          options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="exercise/edit"
          options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="routine/edit"
          options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
        />
        <Stack.Screen
          name="measurements/log"
          options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
        />
      </Stack>
      <ToastHost />
      <DialogHost />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  migrationError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  migrationErrorMessage: { marginTop: 8 },
});
