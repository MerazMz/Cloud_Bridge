import { TelegramClient } from "telegram";
import { ConnectionTCPObfuscated } from "telegram/network";
import { StringSession } from "telegram/sessions";
import { LogLevel } from "telegram/extensions/Logger";
import { createLogger } from "@/lib/logger";

const log = createLogger("TelegramClient");

/**
 * Factory function to create a GramJS TelegramClient instance.
 * Uses API_ID and API_HASH from environment variables.
 *
 * @param sessionString - Optional saved StringSession string to restore state.
 *                        Pass empty string "" for a new session.
 */
export function createTelegramClient(sessionString = ""): TelegramClient {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
  const apiHash = process.env.TELEGRAM_API_HASH || "";

  if (!apiId || !apiHash) {
    throw new Error(
      "TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in environment variables"
    );
  }

  const session = new StringSession(sessionString);

  const client = new TelegramClient(session, apiId, apiHash, {
    connection: ConnectionTCPObfuscated,
    useWSS: false, // Disable WebSocket overhead in Node.js server; use raw high-speed TCP socket connection
    connectionRetries: 5,
    retryDelay: 1000,
    autoReconnect: true,
  });

  // Mute GramJS verbose connection/ping socket traffic, only logging critical errors
  client.setLogLevel(LogLevel.ERROR);

  log.debug("TelegramClient created", { hasSession: sessionString.length > 0 });

  return client;
}

/**
 * Save the current session as a string for persistence.
 */
export function saveSessionString(client: TelegramClient): string {
  // GramJS session.save() can return a string or void depending on version
  const saved = client.session.save() as unknown as string;
  return saved;
}
