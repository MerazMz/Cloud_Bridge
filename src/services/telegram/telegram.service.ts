import { Api, TelegramClient } from "telegram";
import * as telegramUtils from "telegram/Utils";
import * as uploads from "telegram/client/uploads";
import { readBigIntFromBuffer, generateRandomBytes, sleep } from "telegram/Helpers";
import { errors } from "telegram";
import { computeCheck } from "telegram/Password";
import bigInt from "big-integer";
import { CustomFile } from "telegram/client/uploads";
import { createTelegramClient, saveSessionString } from "./client";
import { createLogger } from "@/lib/logger";
import { decryptSession } from "@/services/crypto/crypto.service";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";

// Monkey-patch getAppropriatedPartSize to always return 512 (512KB chunks) for maximum upload performance!
try {
  Object.defineProperty(telegramUtils, "getAppropriatedPartSize", {
    value: function () {
      return 512;
    },
    writable: true,
    configurable: true,
  });
} catch (e) {
  try {
    (telegramUtils as any).getAppropriatedPartSize = function () {
      return 512;
    };
  } catch {}
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const DISCONNECT_SLEEP = 1000;
const BUFFER_SIZE_20MB = 20 * 1024 * 1024;

// High-Performance sliding-window concurrent uploader queue replacement for GramJS's slow sequential promise batcher
async function customUploadFile(client: any, fileParams: any) {
  const { file, onProgress } = fileParams;
  let { workers } = fileParams;
  const { name, size } = file;
  const fileId = readBigIntFromBuffer(generateRandomBytes(8), true, true);
  const isLarge = size > LARGE_FILE_THRESHOLD;
  const partSize = telegramUtils.getAppropriatedPartSize(bigInt(size)) * KB_TO_BYTES;
  const partCount = Math.floor((size + partSize - 1) / partSize);
  
  const getFileBuffer = (uploads as any).getFileBuffer;
  const buffer = await getFileBuffer(file, size, fileParams.maxBufferSize || BUFFER_SIZE_20MB - 1);
  
  await client.getSender(client.session.dcId);
  if (!workers || !size) {
    workers = 1;
  }
  if (workers >= partCount) {
    workers = partCount;
  }
  
  let progress = 0;
  if (onProgress) {
    onProgress(progress);
  }

  let nextIndex = 0;
  let activeWorkers = 0;
  let hasFailed = false;
  let uploadError: any = null;

  return new Promise<any>(async (resolve, reject) => {
    async function startNextWorker() {
      if (hasFailed) return;

      if (nextIndex >= partCount) {
        if (activeWorkers === 0 && !hasFailed) {
          const result = isLarge
            ? new Api.InputFileBig({ id: fileId, parts: partCount, name })
            : new Api.InputFile({ id: fileId, parts: partCount, name, md5Checksum: "" });
          resolve(result);
        }
        return;
      }

      const j = nextIndex++;
      activeWorkers++;

      try {
        let endPart = (j + 1) * partSize;
        if (endPart > size) {
          endPart = size;
        }
        
        const bytes = await buffer.slice(j * partSize, endPart);

        (async () => {
          try {
            while (true) {
              if (hasFailed) return;
              let sender;
              try {
                sender = await client.getSender(client.session.dcId);
                await sender.send(
                  isLarge
                    ? new Api.upload.SaveBigFilePart({
                        fileId,
                        filePart: j,
                        fileTotalParts: partCount,
                        bytes,
                      })
                    : new Api.upload.SaveFilePart({
                        fileId,
                        filePart: j,
                        bytes,
                      })
                );
                break;
              } catch (err: any) {
                if (sender && !sender.isConnected()) {
                  await sleep(DISCONNECT_SLEEP);
                  continue;
                } else if (err instanceof errors.FloodWaitError) {
                  await sleep(err.seconds * 1000);
                  continue;
                }
                throw err;
              }
            }

            if (onProgress) {
              if (onProgress.isCanceled) {
                throw new Error("USER_CANCELED");
              }
              progress += 1 / partCount;
              onProgress(progress);
            }
          } catch (err) {
            hasFailed = true;
            uploadError = err;
          } finally {
            activeWorkers--;
            if (hasFailed) {
              reject(uploadError);
            } else {
              startNextWorker();
            }
          }
        })();
      } catch (err) {
        hasFailed = true;
        uploadError = err;
        activeWorkers--;
        reject(uploadError);
      }
    }

    for (let w = 0; w < workers; w++) {
      startNextWorker();
    }
  });
}

try {
  (uploads as any).uploadFile = customUploadFile;
} catch (e) {}

const log = createLogger("TelegramService");

/**
 * Result of sending an OTP code to a phone number.
 */
export interface SendCodeResult {
  phoneCodeHash: string;
  tempSessionString: string;
}

/**
 * Telegram user profile information.
 */
export interface TelegramUserInfo {
  telegramUserId: bigint;
  accessHash: string;
  displayName: string;
  username?: string;
  phone: string;
}

/**
 * Result of a successful sign-in.
 */
export interface SignInSuccess {
  type: "success";
  user: TelegramUserInfo;
  sessionString: string;
}

/**
 * Result when 2FA is required.
 */
export interface SignIn2FARequired {
  type: "2fa_required";
  tempSessionString: string;
}

export type SignInResult = SignInSuccess | SignIn2FARequired;

/**
 * Storage channel information.
 */
export interface StorageChannelInfo {
  channelId: bigint;
  accessHash: string;
}

// ─── Service Methods ──────────────────────────────────────────────

/**
 * Send an OTP code to the given phone number via Telegram MTProto.
 */
export async function sendCode(phoneNumber: string): Promise<SendCodeResult> {
  const client = createTelegramClient();

  try {
    await client.connect();
    log.info("Sending OTP code", { phone: phoneNumber.slice(0, 4) + "****" });

    const apiId = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
    const apiHash = process.env.TELEGRAM_API_HASH || "";

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({
          allowFlashcall: false,
          currentNumber: false,
          allowAppHash: false,
        }),
      })
    );

    // TypeSentCode is a union of SentCode | SentCodeSuccess.
    // Only SentCode has phoneCodeHash (SentCodeSuccess means already authed).
    if (!(result instanceof Api.auth.SentCode)) {
      throw new Error("Unexpected response: account may already be authorized.");
    }

    // Save the intermediate session so we can restore it for verify step
    const tempSessionString = saveSessionString(client);

    log.info("OTP sent successfully");

    return {
      phoneCodeHash: result.phoneCodeHash,
      tempSessionString,
    };
  } catch (error: unknown) {
    // Handle Telegram-specific errors
    if (error && typeof error === "object" && "errorMessage" in error) {
      const tgError = error as { errorMessage: string; seconds?: number };

      if (tgError.errorMessage === "FLOOD_WAIT") {
        const waitTime = tgError.seconds || 60;
        log.warn("Flood wait triggered", { waitTime });
        throw new Error(
          `Too many attempts. Please wait ${waitTime} seconds before trying again.`
        );
      }

      if (tgError.errorMessage === "PHONE_NUMBER_INVALID") {
        throw new Error("Invalid phone number format.");
      }

      if (tgError.errorMessage === "PHONE_NUMBER_BANNED") {
        throw new Error("This phone number has been banned from Telegram.");
      }
    }

    log.error("Failed to send OTP", error);
    throw new Error("Failed to send verification code. Please try again.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

/**
 * Verify the OTP code and sign in to Telegram.
 * Returns either a success result with the session, or indicates 2FA is required.
 */
export async function signIn(
  tempSessionString: string,
  phoneNumber: string,
  phoneCode: string,
  phoneCodeHash: string
): Promise<SignInResult> {
  const client = createTelegramClient(tempSessionString);

  try {
    await client.connect();
    log.info("Verifying OTP code");

    const result = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      })
    );

    // Extract user info from the authorization result
    if (result instanceof Api.auth.Authorization) {
      const user = result.user;
      if (user instanceof Api.User) {
        const sessionString = saveSessionString(client);
        const userInfo = extractUserInfo(user);

        log.info("Sign-in successful", {
          userId: userInfo.telegramUserId.toString(),
        });

        return {
          type: "success",
          user: userInfo,
          sessionString,
        };
      }
    }

    throw new Error("Unexpected response from Telegram");
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errorMessage" in error) {
      const tgError = error as { errorMessage: string; seconds?: number };

      if (tgError.errorMessage === "SESSION_PASSWORD_NEEDED") {
        log.info("2FA password required");
        const updatedSession = saveSessionString(client);
        return {
          type: "2fa_required",
          tempSessionString: updatedSession,
        };
      }

      if (tgError.errorMessage === "PHONE_CODE_INVALID") {
        throw new Error("Invalid verification code. Please check and try again.");
      }

      if (tgError.errorMessage === "PHONE_CODE_EXPIRED") {
        throw new Error("Verification code has expired. Please request a new one.");
      }

      if (tgError.errorMessage === "FLOOD_WAIT") {
        const waitTime = tgError.seconds || 60;
        throw new Error(
          `Too many attempts. Please wait ${waitTime} seconds before trying again.`
        );
      }
    }

    log.error("Sign-in failed", error);
    throw error instanceof Error ? error : new Error("Sign-in failed. Please try again.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

/**
 * Complete sign-in with 2FA cloud password.
 */
export async function signInWith2FA(
  tempSessionString: string,
  password: string
): Promise<SignInSuccess> {
  const client = createTelegramClient(tempSessionString);

  try {
    await client.connect();
    log.info("Verifying 2FA password");

    // Get the SRP password parameters
    const srpPassword = await client.invoke(new Api.account.GetPassword());

    // Compute the SRP check using the standalone helper
    const inputCheckPassword = await computeCheck(srpPassword, password);

    const result = await client.invoke(
      new Api.auth.CheckPassword({
        password: inputCheckPassword,
      })
    );

    if (result instanceof Api.auth.Authorization) {
      const user = result.user;
      if (user instanceof Api.User) {
        const sessionString = saveSessionString(client);
        const userInfo = extractUserInfo(user);

        log.info("2FA verification successful", {
          userId: userInfo.telegramUserId.toString(),
        });

        return {
          type: "success",
          user: userInfo,
          sessionString,
        };
      }
    }

    throw new Error("Unexpected response from Telegram");
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errorMessage" in error) {
      const tgError = error as { errorMessage: string };

      if (tgError.errorMessage === "PASSWORD_HASH_INVALID") {
        throw new Error("Incorrect password. Please try again.");
      }
    }

    log.error("2FA verification failed", error);
    throw error instanceof Error ? error : new Error("2FA verification failed.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

/**
 * Create a private storage channel for the user.
 * Channel name: Drive_<telegramUserId>
 */
export async function createStorageChannel(
  sessionString: string,
  telegramUserId: bigint
): Promise<StorageChannelInfo> {
  const client = createTelegramClient(sessionString);

  try {
    await client.connect();
    const channelTitle = `Drive_${telegramUserId.toString()}`;

    log.info("Creating storage channel", { title: channelTitle });

    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: channelTitle,
        about: "CloudBridge private storage channel",
        broadcast: true,
        megagroup: false,
      })
    );

    // Extract channel info from the result
    // TypeUpdates is a union — CreateChannel returns Updates which has chats
    if (result instanceof Api.Updates && result.chats.length > 0) {
      const channel = result.chats[0];
      if (channel instanceof Api.Channel) {
        const channelId = BigInt(channel.id.toString());
        const accessHash = channel.accessHash?.toString() || "0";

        // Send welcome message
        try {
          await client.invoke(
            new Api.messages.SendMessage({
              peer: new Api.InputPeerChannel({
                channelId: channel.id,
                accessHash: channel.accessHash || bigInt(0),
              }),
              message:
                "🌩️ Welcome to your private cloud storage.\n\nFiles uploaded from CloudBridge will appear here.\n\nDo not delete this channel.",
              randomId: bigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
            })
          );
          log.info("Welcome message sent to channel");
        } catch (msgError) {
          log.warn("Failed to send welcome message", { error: msgError });
        }

        return { channelId, accessHash };
      }
    }

    throw new Error("Failed to extract channel information");
  } catch (error: unknown) {
    log.error("Failed to create storage channel", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to create storage channel.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

/**
 * Find an existing storage channel for the user.
 * Looks for a channel titled "Drive_<telegramUserId>".
 */
export async function findStorageChannel(
  sessionString: string,
  telegramUserId: bigint
): Promise<StorageChannelInfo | null> {
  const client = createTelegramClient(sessionString);

  try {
    await client.connect();
    const channelTitle = `Drive_${telegramUserId.toString()}`;

    log.info("Searching for existing storage channel", { title: channelTitle });

    // Search through user's channels/dialogs
    const dialogs = await client.invoke(
      new Api.messages.GetDialogs({
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        limit: 100,
        hash: bigInt(0),
      })
    );

    if (
      dialogs instanceof Api.messages.Dialogs ||
      dialogs instanceof Api.messages.DialogsSlice
    ) {
      for (const chat of dialogs.chats) {
        if (chat instanceof Api.Channel && chat.title === channelTitle) {
          log.info("Found existing storage channel", {
            channelId: chat.id.toString(),
          });
          return {
            channelId: BigInt(chat.id.toString()),
            accessHash: chat.accessHash?.toString() || "0",
          };
        }
      }
    }

    log.info("No existing storage channel found");
    return null;
  } catch (error) {
    log.error("Failed to search for storage channel", error);
    return null;
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

/**
 * Get or create a storage channel — idempotent operation.
 */
export async function ensureStorageChannel(
  sessionString: string,
  telegramUserId: bigint
): Promise<StorageChannelInfo> {
  // Try to find existing channel first
  const existing = await findStorageChannel(sessionString, telegramUserId);
  if (existing) {
    return existing;
  }

  // Create a new one
  return createStorageChannel(sessionString, telegramUserId);
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractUserInfo(user: Api.User): TelegramUserInfo {
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const displayName = `${firstName} ${lastName}`.trim() || "Telegram User";

  return {
    telegramUserId: BigInt(user.id.toString()),
    accessHash: user.accessHash?.toString() || "0",
    displayName,
    username: user.username || undefined,
    phone: user.phone || "",
  };
}

/**
 * Retrieve and connect a TelegramClient for a given database user.
 */
export async function getClientForUser(userId: string): Promise<TelegramClient> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramSessionEncrypted: true,
      telegramSessionIv: true,
      telegramSessionAuthTag: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (
    !user.telegramSessionEncrypted ||
    !user.telegramSessionIv ||
    !user.telegramSessionAuthTag
  ) {
    throw new Error("User does not have an active Telegram session.");
  }

  const sessionString = decryptSession(
    user.telegramSessionEncrypted,
    user.telegramSessionIv,
    user.telegramSessionAuthTag
  );

  const client = createTelegramClient(sessionString);
  await client.connect();
  return client;
}

/**
 * Upload a file buffer to a user's storage channel.
 */
export async function uploadFileToTelegram(
  client: TelegramClient,
  channelId: bigint,
  accessHash: string,
  filePath: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<number> {
  const channelPeer = new Api.InputPeerChannel({
    channelId: bigInt(channelId.toString()),
    accessHash: bigInt(accessHash),
  });

  const stats = await fs.stat(filePath);

  const fileToUpload = new CustomFile(
    fileName,
    stats.size,
    filePath
  );

  log.info("Uploading file to Telegram channel from path", { fileName, size: stats.size });

  const message = await client.sendFile(channelPeer, {
    file: fileToUpload,
    forceDocument: true,
    workers: 8,
    progressCallback: onProgress ? (progress: any) => {
      onProgress(Math.round(Number(progress) * 100));
    } : undefined,
  });

  if (!message || !message.id) {
    throw new Error("Failed to upload file to Telegram: no message ID returned.");
  }

  log.info("File uploaded successfully to Telegram", { messageId: message.id });
  return message.id;
}

/**
 * Download a file from a user's storage channel using the message ID.
 */
export async function downloadFileFromTelegram(
  client: TelegramClient,
  channelId: bigint,
  accessHash: string,
  messageId: number
): Promise<Buffer> {
  const channelPeer = new Api.InputPeerChannel({
    channelId: bigInt(channelId.toString()),
    accessHash: bigInt(accessHash),
  });

  log.info("Fetching message from Telegram channel", { messageId });

  const messages = await client.getMessages(channelPeer, {
    ids: [messageId],
  });

  const message = messages[0];
  if (!message || !message.media) {
    throw new Error("File not found or has no media content on Telegram.");
  }

  log.info("Downloading file media from Telegram", { messageId });

  const buffer = await client.downloadMedia(message.media);

  if (!buffer || !(buffer instanceof Buffer)) {
    throw new Error("Failed to download file media from Telegram.");
  }

  return buffer;
}

/**
 * Delete a file message from a user's storage channel.
 */
export async function deleteFileFromTelegram(
  client: TelegramClient,
  channelId: bigint,
  accessHash: string,
  messageId: number
): Promise<void> {
  const channelPeer = new Api.InputPeerChannel({
    channelId: bigInt(channelId.toString()),
    accessHash: bigInt(accessHash),
  });

  log.info("Deleting message from Telegram channel", { messageId });

  await client.invoke(
    new Api.channels.DeleteMessages({
      channel: channelPeer,
      id: [messageId],
    })
  );

  log.info("Message deleted successfully from Telegram channel", { messageId });
}
