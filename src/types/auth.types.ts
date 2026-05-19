/**
 * Authentication-related types.
 */

/**
 * JWT access token payload.
 */
export interface JWTPayload {
  sub: string; // User ID
  iat: number;
  exp: number;
}

/**
 * OTP state stored in Redis during the login flow.
 */
export interface OtpState {
  phoneNumber: string;
  phoneCodeHash: string;
  tempSessionString: string;
  step: "otp_sent" | "needs_2fa";
  attempts: number;
  createdAt: number;
}

/**
 * User profile returned by the /api/auth/me endpoint.
 */
export interface UserProfile {
  id: string;
  phoneNumber: string;
  telegramUserId: string;
  displayName: string | null;
  username: string | null;
  profilePhotoUrl: string | null;
  storageChannelId: string | null;
  storageChannelStatus: "active" | "pending";
  createdAt: string;
}

/**
 * Auth tokens pair.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
