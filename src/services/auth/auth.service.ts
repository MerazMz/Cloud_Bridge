import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setWithTTL, getJSON, del } from "@/lib/redis";
import { createLogger } from "@/lib/logger";
import type { JWTPayload, OtpState, AuthTokens } from "@/types/auth.types";
import { encryptSession } from "@/services/crypto/crypto.service";
import { ensureStorageChannel, type TelegramUserInfo } from "@/services/telegram/telegram.service";

const log = createLogger("AuthService");

// ─── Constants ────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 7;
const OTP_STATE_TTL_SECONDS = 300; // 5 minutes
const RATE_LIMIT_TTL_SECONDS = 60; // 1 OTP per 60 seconds per phone

// ─── Redis Key Helpers ────────────────────────────────────────────

function otpKey(phoneNumber: string): string {
  return `otp:${phoneNumber}`;
}

function rateLimitKey(phoneNumber: string): string {
  return `rate:otp:${phoneNumber}`;
}

// ─── JWT Functions ────────────────────────────────────────────────

const ACCESS_SECRET_DEFAULT = "super-secret-jwt-access-key-default-32-chars-long!!";
const REFRESH_SECRET_DEFAULT = "super-secret-jwt-refresh-key-default-32-chars-long!!";

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET || ACCESS_SECRET_DEFAULT;
  return new TextEncoder().encode(secret);
}

function getRefreshSecret(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET || REFRESH_SECRET_DEFAULT;
  return new TextEncoder().encode(secret);
}

/**
 * Create a short-lived JWT access token.
 */
export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getAccessSecret());
}

/**
 * Verify a JWT access token and return its payload.
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret(), {
    algorithms: ["HS256"],
  });

  return {
    sub: payload.sub as string,
    iat: payload.iat as number,
    exp: payload.exp as number,
  };
}

/**
 * Generate a cryptographically random refresh token string.
 */
function generateRefreshTokenString(): string {
  return randomBytes(48).toString("hex");
}

/**
 * Create a refresh token, hash it, and store in the database.
 */
export async function createRefreshToken(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const rawToken = generateRefreshTokenString();
  const hashedToken = await hash(rawToken, 10);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      userId,
      refreshToken: hashedToken,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  });

  log.info("Refresh token created", { userId });
  return rawToken;
}

/**
 * Generate both access and refresh tokens.
 */
export async function createAuthTokens(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(userId),
    createRefreshToken(userId, userAgent, ipAddress),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Set auth cookies (HttpOnly, Secure, SameSite).
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost") || false;
  const isSecure = isProduction && !isLocalhost;

  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear auth cookies.
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

/**
 * Get the current user ID from the access token cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      return payload.sub;
    } catch (error) {
      log.debug("Access token expired or invalid, attempting automatic refresh", { error });
    }
  }

  // Automatic session persistence fallback using refresh token
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) {
    log.debug("No refresh_token found in cookies");
    return null;
  }

  try {
    // Find all active unexpired database sessions
    const activeSessions = await prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    for (const session of activeSessions) {
      const match = await compare(refreshToken, session.refreshToken);
      if (match) {
        log.info("Auto-refreshing access token from valid refresh token", { userId: session.userId });

        // Generate new access token
        const newAccessToken = await createAccessToken(session.userId);

        // Update cookies
        await setAuthCookies(newAccessToken, refreshToken);

        return session.userId;
      }
    }

    log.warn("No active database session matches the refresh token");
    return null;
  } catch (refreshError) {
    log.error("Failed to auto-refresh session", refreshError);
    return null;
  }
}

// ─── OTP State Management ─────────────────────────────────────────

/**
 * Check rate limit for OTP requests.
 * Returns true if rate-limited (should block).
 */
export async function isRateLimited(phoneNumber: string): Promise<boolean> {
  const key = rateLimitKey(phoneNumber);
  const exists = await getJSON<boolean>(key);
  return exists === true;
}

/**
 * Set rate limit after sending an OTP.
 */
export async function setRateLimit(phoneNumber: string): Promise<void> {
  await setWithTTL(rateLimitKey(phoneNumber), true, RATE_LIMIT_TTL_SECONDS);
}

/**
 * Store OTP state in Redis.
 */
export async function storeOtpState(
  phoneNumber: string,
  data: Omit<OtpState, "createdAt">
): Promise<void> {
  const state: OtpState = {
    ...data,
    createdAt: Date.now(),
  };

  await setWithTTL(otpKey(phoneNumber), state, OTP_STATE_TTL_SECONDS);
  log.debug("OTP state stored", { phone: phoneNumber.slice(0, 4) + "****" });
}

/**
 * Retrieve OTP state from Redis.
 */
export async function getOtpState(
  phoneNumber: string
): Promise<OtpState | null> {
  return getJSON<OtpState>(otpKey(phoneNumber));
}

/**
 * Update OTP state (e.g., when transitioning to 2FA step).
 */
export async function updateOtpState(
  phoneNumber: string,
  updates: Partial<OtpState>
): Promise<void> {
  const current = await getOtpState(phoneNumber);
  if (!current) {
    throw new Error("OTP session expired. Please request a new code.");
  }

  const updated = { ...current, ...updates };
  await setWithTTL(otpKey(phoneNumber), updated, OTP_STATE_TTL_SECONDS);
}

/**
 * Delete OTP state from Redis.
 */
export async function clearOtpState(phoneNumber: string): Promise<void> {
  await del(otpKey(phoneNumber));
}

// ─── Session Cleanup ──────────────────────────────────────────────

/**
 * Delete all sessions for a user (logout from all devices).
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
  log.info("All sessions deleted", { userId });
}

/**
 * Delete expired sessions (can be called periodically).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  log.info("Expired sessions cleaned up", { count: result.count });
  return result.count;
}

/**
 * Finalize user login after a successful Telegram session is established (OTP or QR scan).
 * Encrypts the session, ensures the storage channel exists, upserts the user in the database,
 * and sets auth cookies.
 */
export async function finalizeUserLogin(
  user: TelegramUserInfo,
  sessionString: string,
  userAgent?: string,
  ipAddress?: string
) {
  // Encrypt the Telegram session
  const encrypted = encryptSession(sessionString);

  const phoneNumber = user.phone;

  // Upsert user in database immediately (speeding up response time by ~5 seconds!)
  const dbUser = await prisma.user.upsert({
    where: { telegramUserId: user.telegramUserId },
    update: {
      phoneNumber,
      telegramAccessHash: user.accessHash,
      telegramSessionEncrypted: encrypted.encrypted,
      telegramSessionIv: encrypted.iv,
      telegramSessionAuthTag: encrypted.authTag,
      displayName: user.displayName,
      username: user.username || null,
      updatedAt: new Date(),
    },
    create: {
      phoneNumber,
      telegramUserId: user.telegramUserId,
      telegramAccessHash: user.accessHash,
      telegramSessionEncrypted: encrypted.encrypted,
      telegramSessionIv: encrypted.iv,
      telegramSessionAuthTag: encrypted.authTag,
      displayName: user.displayName,
      username: user.username || null,
    },
  });

  // Ensure storage channel exists in the background without blocking the login redirect response
  (async () => {
    try {
      const channel = await ensureStorageChannel(
        sessionString,
        user.telegramUserId
      );
      
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          storageChannelId: channel.channelId,
          storageChannelAccessHash: channel.accessHash,
        },
      });
      log.info("Background storage channel verification completed successfully", {
        userId: dbUser.id,
      });
    } catch (channelError) {
      log.warn("Background storage channel verification failed — will automatically retry on first file upload", {
        error: channelError,
      });
    }
  })();

  // Create auth tokens
  const tokens = await createAuthTokens(dbUser.id, userAgent, ipAddress);

  // Set HttpOnly cookies
  await setAuthCookies(tokens.accessToken, tokens.refreshToken);

  log.info("finalizeUserLogin completed successfully", {
    userId: dbUser.id,
    telegramUserId: user.telegramUserId.toString(),
  });

  return {
    userId: dbUser.id,
    displayName: user.displayName,
    username: user.username,
  };
}
