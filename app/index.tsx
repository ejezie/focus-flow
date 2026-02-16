import { useEffect, useState } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';

export default function Index() {
  const { settings, hasHydrated } = useSettingsStore();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (hasHydrated && rootNavigationState?.key) {
      setIsReady(true);
    }
  }, [hasHydrated, rootNavigationState?.key]);

  useEffect(() => {
    if (!isReady) return;

    // Small timeout to ensure the navigator is fully mounted and ready for navigation calls
    const timeout = setTimeout(() => {
      if (!settings.isOnboardingComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }, 1);

    return () => clearTimeout(timeout);
  }, [isReady, settings.isOnboardingComplete]);

  return null;
}
