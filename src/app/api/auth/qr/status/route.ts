import { NextRequest } from "next/server";
import { Api } from "telegram";
import { successResponse, errorResponse } from "@/lib/api-response";
import { activeQrClients, cleanupExpiredQrClients } from "@/services/telegram/qr-registry";
import { saveSessionString } from "@/services/telegram/client";
import { finalizeUserLogin } from "@/services/auth/auth.service";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:qr-status");

export async function GET(request: NextRequest) {
  // Extract qrId from query parameters
  const { searchParams } = new URL(request.url);
  const qrId = searchParams.get("qrId");

  if (!qrId) {
    return errorResponse("Missing qrId parameter.", 400);
  }

  // Perform a cleanup of old sessions
  cleanupExpiredQrClients();

  const store = activeQrClients[qrId];
  if (!store) {
    log.warn("QR Session not found or expired", { qrId });
    return successResponse({ status: "expired" }, "Session not found or expired.");
  }

  const { client } = store;

  try {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "";

    // Poll current login token status
    const result = await client.invoke(
      new Api.auth.ExportLoginToken({
        apiId,
        apiHash,
        exceptIds: [],
      })
    );

    // Case 1: Still pending scan
    if (result instanceof Api.auth.LoginToken) {
      const tokenBase64 = result.token.toString("base64url");
      const loginUrl = `tg://login?token=${tokenBase64}`;
      
      return successResponse({
        status: "pending",
        loginUrl,
        expires: result.expires,
      }, "Waiting for user to scan QR code.");
    }

    // Case 2: Direct Authorization Success
    if (result instanceof Api.auth.LoginTokenSuccess &&
        result.authorization instanceof Api.auth.Authorization) {
      log.info("QR Login direct success", { qrId });

      const user = result.authorization.user;
      if (!(user instanceof Api.User)) {
        throw new Error("Unexpected user object type from authorization result");
      }

      const sessionString = saveSessionString(client);

      const finalUserInfo = {
        telegramUserId: BigInt(user.id.toString()),
        accessHash: user.accessHash?.toString() || "0",
        displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Telegram User",
        username: user.username || undefined,
        phone: user.phone || "",
      };

      const userAgent = request.headers.get("user-agent") || undefined;
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined;

      const loginResult = await finalizeUserLogin(finalUserInfo, sessionString, userAgent, ipAddress);

      // Successfully authenticated! Clean up connection
      try {
        await client.disconnect();
      } catch {}
      delete activeQrClients[qrId];

      return successResponse({
        status: "success",
        user: loginResult,
      }, "Logged in successfully.");
    }

    // Case 3: Data Center Migration Required
    if (result instanceof Api.auth.LoginTokenMigrateTo) {
      log.info("QR Login requires DC migration", { qrId, targetDc: result.dcId });

      // Switch client DC
      await client._switchDC(result.dcId);

      // Import the token at the new DC
      const migratedResult = await client.invoke(
        new Api.auth.ImportLoginToken({
          token: result.token,
        })
      );

      if (migratedResult instanceof Api.auth.LoginTokenSuccess &&
          migratedResult.authorization instanceof Api.auth.Authorization) {
        
        log.info("QR Login success after DC migration", { qrId });

        const user = migratedResult.authorization.user;
        if (!(user instanceof Api.User)) {
          throw new Error("Unexpected user object type from migrated authorization result");
        }

        const sessionString = saveSessionString(client);

        const finalUserInfo = {
          telegramUserId: BigInt(user.id.toString()),
          accessHash: user.accessHash?.toString() || "0",
          displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Telegram User",
          username: user.username || undefined,
          phone: user.phone || "",
        };

        const userAgent = request.headers.get("user-agent") || undefined;
        const ipAddress =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          undefined;

        const loginResult = await finalizeUserLogin(finalUserInfo, sessionString, userAgent, ipAddress);

        // Successfully authenticated! Clean up connection
        try {
          await client.disconnect();
        } catch {}
        delete activeQrClients[qrId];

        return successResponse({
          status: "success",
          user: loginResult,
        }, "Logged in successfully.");
      } else {
        log.error("Migration failed to return successful authorization", migratedResult);
        throw new Error("QR login migration failed.");
      }
    }

    // Fallback if Telegram returned an unhandled constructor
    log.error("Unknown result from login token checking", result);
    throw new Error("Unhandled Telegram QR authorization state.");

  } catch (error: any) {
    if (error?.errorMessage === "SESSION_PASSWORD_NEEDED") {
      log.info("QR Login needs 2FA cloud password");
      return successResponse({
        status: "2fa_required"
      }, "2FA Cloud Password is required on the scanning device.");
    }

    log.error("Failed to check QR login status", error);
    
    // Cleanup on error
    try {
      await client.disconnect();
    } catch {}
    delete activeQrClients[qrId];

    const message = error instanceof Error ? error.message : "Checking QR status failed.";
    return errorResponse(message, 400);
  }
}
