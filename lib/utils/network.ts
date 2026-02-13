import { useState, useEffect } from "react";
import * as Network from "expo-network";

export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true); // assume online initially

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsOnline(
            state.isConnected === true &&
              state.isInternetReachable !== false
          );
        }
      } catch {
        // If we can't check, assume online
      }
    }

    check();

    // Re-check periodically (every 10 seconds)
    const interval = setInterval(check, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
