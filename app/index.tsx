import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';

export default function Index() {
  const { settings, hasHydrated } = useSettingsStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!settings.isOnboardingComplete) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  }, [hasHydrated, settings.isOnboardingComplete]);

  return null;
}
