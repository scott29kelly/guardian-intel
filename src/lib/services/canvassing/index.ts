import { SalesRabbitAdapter } from "./salesrabbit-adapter";
import type { CanvassingAdapter } from "./types";

export type {
  CanvassingAdapter,
  CanvassingLead,
  CanvassingRoute,
  CanvassingStats,
  CanvassingPinStatus,
  PushLeadsResult,
} from "./types";

export { SalesRabbitAdapter } from "./salesrabbit-adapter";

// Singleton adapter instance
let adapterInstance: CanvassingAdapter | null = null;

/**
 * Get the canvassing adapter instance.
 * Currently supports SalesRabbit (or demo mode if not configured).
 */
export function getCanvassingAdapter(): CanvassingAdapter {
  if (!adapterInstance) {
    adapterInstance = new SalesRabbitAdapter();
  }
  return adapterInstance;
}
