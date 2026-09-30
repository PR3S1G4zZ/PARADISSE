import { useCallback, useEffect, useRef, useState } from 'react';

export type WakeLockStatus = 'idle' | 'active' | 'unsupported' | 'error' | 'released';

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
}

export function useWakeLock(enabled = false) {
  const [status, setStatus] = useState<WakeLockStatus>('idle');
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const requestInFlightRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);
  const enabledRef = useRef(enabled);

  const release = useCallback(async () => {
    generationRef.current += 1;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    await sentinel?.release().catch(() => undefined);
    setStatus('idle');
  }, []);

  const request = useCallback(async () => {
    const wakeLockNavigator = typeof navigator === 'undefined' ? null : navigator as Navigator & WakeLockNavigator;
    if (!wakeLockNavigator?.wakeLock) {
      setStatus('unsupported');
      return;
    }

    const currentSentinel = sentinelRef.current;
    if (currentSentinel && !currentSentinel.released) {
      setStatus('active');
      return;
    }
    if (requestInFlightRef.current) return requestInFlightRef.current;

    const generation = ++generationRef.current;
    const requestPromise = (async () => {
      try {
        const sentinel = await wakeLockNavigator.wakeLock!.request('screen');
        if (!enabledRef.current || generation !== generationRef.current) {
          await sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
        setStatus('active');
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current !== sentinel) return;
          sentinelRef.current = null;
          setStatus('released');
        });
      } catch {
        if (enabledRef.current && generation === generationRef.current) setStatus('error');
      } finally {
        requestInFlightRef.current = null;
      }
    })();
    requestInFlightRef.current = requestPromise;
    return requestPromise;
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) void request();
    else void release();
    return () => {
      if (enabled) void release();
    };
  }, [enabled, release, request]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const recover = () => {
      if (enabledRef.current && document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', recover);
    return () => document.removeEventListener('visibilitychange', recover);
  }, [request]);

  return { status, request, release };
}
