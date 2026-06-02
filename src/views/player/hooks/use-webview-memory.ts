import { useEffect } from "react";
import { pulseWebviewMemoryLow } from "@/lib/webview-memory";
import { runMaintenance } from "@/lib/maintenance";

export function useWebviewMemory(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return () => {
      pulseWebviewMemoryLow();
      runMaintenance(true);
    };
  }, [active]);
}
