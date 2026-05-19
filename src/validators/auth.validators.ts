import { z } from "zod";

/**
 * Zod validation schemas for authentication endpoints.
 */

export const sendOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^\+[1-9]\d{6,14}$/,
      "Invalid phone number. Must include country code (e.g., +919999999999)"
    ),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{6,14}$/, "Invalid phone number format"),
  code: z
    .string()
    .min(4, "Code must be at least 4 digits")
    .max(6, "Code must be at most 6 digits")
    .regex(/^\d+$/, "Code must contain only digits"),
});

export const verify2FASchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+[1-9]\d{6,14}$/, "Invalid phone number format"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
