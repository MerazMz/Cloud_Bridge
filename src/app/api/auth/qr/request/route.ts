import { NextRequest } from "next/server";
import { Api } from "telegram";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createTelegramClient } from "@/services/telegram/client";
import { activeQrClients, cleanupExpiredQrClients } from "@/services/telegram/qr-registry";
import { randomUUID } from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:qr-request");

export async function POST(request: NextRequest) {
  try {
    // Clear out any old expired clients
    cleanupExpiredQrClients();

    const apiId = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "";

    if (!apiId || !apiHash) {
      return errorResponse("Telegram API credentials are not set on server.", 500);
    }

    log.info("Starting new QR Login connection");

    // Create a new connected TelegramClient (empty session)
    const client = createTelegramClient("");
    await client.connect();

    // Call ExportLoginToken to generate the first QR token
    const result = await client.invoke(
      new Api.auth.ExportLoginToken({
        apiId,
        apiHash,
        exceptIds: [],
      })
    );

    if (!(result instanceof Api.auth.LoginToken)) {
      try {
        await client.disconnect();
      } catch {}
      return errorResponse("Unexpected response from Telegram login token request.", 500);
    }

    const tokenBase64 = result.token.toString("base64url");
    const loginUrl = `tg://login?token=${tokenBase64}`;
    const expires = result.expires;

    const qrId = randomUUID();

    // Store in active clients mapping
    activeQrClients[qrId] = {
      client,
      createdAt: Date.now(),
    };

    log.info("QR Login token generated successfully", { qrId, expires });

    return successResponse(
      {
        qrId,
        loginUrl,
        expires,
      },
      "QR Login initiated successfully."
    );
  } catch (error) {
    log.error("Failed to initiate QR Login", error);
    const message = error instanceof Error ? error.message : "Failed to generate QR token.";
    return errorResponse(message, 500);
  }
}
