import { z } from "zod";

/**
 * Server-side environment variable schema.
 * Validated at module load time — crashes fast if misconfigured.
 */
const envSchema = z.object({
  // Telegram MTProto
  TELEGRAM_API_ID: z
    .string()
    .min(1, "TELEGRAM_API_ID is required")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive("TELEGRAM_API_ID must be a positive integer")),
  TELEGRAM_API_HASH: z
    .string()
    .min(1, "TELEGRAM_API_HASH is required")
    .length(32, "TELEGRAM_API_HASH must be 32 characters"),

  // Database
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid URL"),

  // Redis
  REDIS_URL: z
    .string()
    .min(1, "REDIS_URL is required"),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  // Encryption
  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY must be a 64-char hex string (32 bytes)")
    .regex(/^[0-9a-fA-F]+$/, "ENCRYPTION_KEY must be hexadecimal"),

  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Lazily validated environment singleton.
 * Throws a descriptive error on first access if env vars are invalid.
 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs as string[]).join(", ")}`)
      .join("\n");

    throw new Error(
      `❌ Invalid environment variables:\n${formatted}\n\nPlease check your .env file.`
    );
  }

  _env = parsed.data;
  return _env;
}
