import * as Updates from 'expo-updates';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';

/**
 * Ручное обновление по воздуху: проверить, скачать и сразу перезапустить приложение.
 * Само приложение тоже скачивает обновление при запуске, но применяет его только при
 * следующем холодном старте, а MIUI при смахивании часто не выгружает процесс.
 */
export function useAppUpdate() {
  const { t: translate } = useTranslation();
  const { isUpdatePending, isChecking, isDownloading } = Updates.useUpdates();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateApp = async () => {
    // В режиме разработки и в Expo Go обновлений по воздуху нет: код идёт из Metro.
    if (!Updates.isEnabled) {
      toast(translate('settings.updateUnavailable'));
      return;
    }
    setIsUpdating(true);
    try {
      // Обновление уже скачано в фоне при запуске: осталось только перезапуститься.
      if (isUpdatePending) {
        await Updates.reloadAsync();
        return;
      }
      const checkResult = await Updates.checkForUpdateAsync();
      if (!checkResult.isAvailable) {
        toast(translate('settings.updateLatest'));
        return;
      }
      const fetchResult = await Updates.fetchUpdateAsync();
      if (!fetchResult.isNew) {
        toast(translate('settings.updateLatest'));
        return;
      }
      await Updates.reloadAsync();
    } catch {
      toast(translate('settings.updateFailed'));
    } finally {
      setIsUpdating(false);
    }
  };

  const describeButtonTitle = () => {
    if (isDownloading) return translate('settings.updateDownloading');
    if (isChecking) return translate('settings.updateChecking');
    if (isUpdatePending) return translate('settings.updateInstall');
    return translate('settings.updateCheck');
  };

  return {
    updateApp,
    buttonTitle: describeButtonTitle(),
    isBusy: isUpdating || isChecking || isDownloading,
  };
}
