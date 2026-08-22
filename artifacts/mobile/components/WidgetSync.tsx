import { useEffect, useRef } from 'react';
import { useBP } from '../context/BPContext';
import { useGlucose } from '../context/GlucoseContext';
import { useCrypto } from '../context/CryptoContext';
import { buildWidgetSnapshot } from '../utils/widgetSnapshot';
import { getWidgetEnabled, lockHomeWidget, publishWidgetSnapshot } from '../widget/bridge';

/** Publishes a redacted BP+glucose snapshot; clears on lock. Debounced to avoid extra native redraws. */
export function WidgetSync() {
  const { isUnlocked } = useCrypto();
  const { readings, isLoading: bpLoading } = useBP();
  const { glucose, isLoading: gluLoading } = useGlucose();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isUnlocked) {
      void lockHomeWidget();
      return;
    }
    if (bpLoading || gluLoading) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        const enabled = await getWidgetEnabled();
        await publishWidgetSnapshot(
          buildWidgetSnapshot({ enabled, locked: false, readings, glucose })
        );
      })();
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isUnlocked, bpLoading, gluLoading, readings, glucose]);

  return null;
}
