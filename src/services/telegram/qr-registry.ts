import { TelegramClient } from "telegram";
import { createLogger } from "@/lib/logger";

const log = createLogger("QrRegistry");

export interface QrClientStore {
  client: TelegramClient;
  createdAt: number;
}

// Global declaration to prevent hot-reload wipes in Next.js dev server
const globalForQr = global as unknown as {
  qrClients: Record<string, QrClientStore>;
};

export const activeQrClients = globalForQr.qrClients || {};

if (process.env.NODE_ENV !== "production") {
  globalForQr.qrClients = activeQrClients;
}

/**
 * Remove and disconnect old client sessions that have been active for more than 3 minutes.
 */
export function cleanupExpiredQrClients() {
  const now = Date.now();
  for (const [id, store] of Object.entries(activeQrClients)) {
    if (now - store.createdAt > 3 * 60 * 1000) {
      log.info("Cleaning up expired QR client connection", { qrId: id });
      try {
        store.client.disconnect();
      } catch (err) {
        log.warn("Error disconnecting expired client", { error: err });
      }
      delete activeQrClients[id];
    }
  }
}
