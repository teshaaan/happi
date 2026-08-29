import { useState, useEffect, useCallback } from 'react';
import { globalTelemetry } from '../services/telemetryService.js';

/**
 * Hook for managing engine state across React components.
 */
export function useEngineState(threeSceneRef) {
  const [engineReady, setEngineReady] = useState(false);
  const [activePoi, setActivePoi] = useState(null);
  const [shrineCount, setShrineCount] = useState(0);

  useEffect(() => {
    if (!threeSceneRef?.current) return;

    globalTelemetry.recordEvent('engine_hook_bind', { timestamp: Date.now() });
    setEngineReady(true);

    const unbindPoi = threeSceneRef.current.onPoiChange?.((poi) => {
      setActivePoi(poi);
      globalTelemetry.recordEvent('poi_change', { poi });
    });

    const unbindShrine = threeSceneRef.current.onShrineChange?.(({ count }) => {
      setShrineCount(count);
      globalTelemetry.recordEvent('shrine_change', { count });
    });

    return () => {
      unbindPoi?.();
      unbindShrine?.();
      setEngineReady(false);
    };
  }, [threeSceneRef]);

  const triggerPoi = useCallback((poiType) => {
    if (threeSceneRef?.current?.triggerPoi) {
      threeSceneRef.current.triggerPoi(poiType);
    }
  }, [threeSceneRef]);

  return {
    engineReady,
    activePoi,
    shrineCount,
    triggerPoi
  };
}
