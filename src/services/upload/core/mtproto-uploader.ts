import { Api } from "telegram";
import { readBigIntFromBuffer, generateRandomBytes, sleep } from "telegram/Helpers";
import { errors } from "telegram";
import { promises as fs } from "fs";
import { createLogger } from "@/lib/logger";

const log = createLogger("MTProtoUploader");

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
const DISCONNECT_SLEEP = 1000;

export interface UploadOptions {
  client: any;
  jobId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  workers?: number;
  checkCancelled?: () => Promise<boolean>;
  onProgress?: (percent: number, uploadedBytes: number, speed: string, eta: string) => void;
  checkCancelled?: () => boolean;
}

/**
 * Uploads a file from filesystem to Telegram using a sliding-window chunk concurrency queue.
 * Memory overhead is strictly bounded to workers * chunk size (e.g. 8 * 512KB = 4MB).
 */
export async function uploadToTelegramStream(options: UploadOptions): Promise<any> {
  const { client, jobId, filePath, fileName, fileSize, workers = 8, onProgress } = options;

  // Open file handle for reading
  const fHandle = await fs.open(filePath, "r");

  try {
    const fileId = readBigIntFromBuffer(generateRandomBytes(8), true, true);
    const isLarge = fileSize > LARGE_FILE_THRESHOLD;
    
    // Always force maximum 512KB part sizes for absolute maximum throughput
    const partSize = 512 * KB_TO_BYTES;
    const partCount = Math.floor((fileSize + partSize - 1) / partSize);

    // Make sure MTProto client senders are ready for all clients in the pool
    const clients = Array.isArray(client) ? client : [client];
    for (const c of clients) {
      await c.getSender(c.session.dcId);
    }

    let uploadedBytes = 0;
    const startTime = Date.now();

    let nextIndex = 0;
    let activeWorkers = 0;
    let hasFailed = false;
    let uploadError: any = null;

    return new Promise<any>(async (resolve, reject) => {
      async function startNextWorker() {
        if (hasFailed) return;

        // Perform cancellation check
        if (options.checkCancelled) {
          try {
            const isCancelled = await options.checkCancelled();
            if (isCancelled) {
              hasFailed = true;
              uploadError = new Error("Upload cancelled");
              try {
                await fHandle.close();
              } catch {}
              reject(uploadError);
              return;
            }
          } catch (cancelErr) {
            log.error("Failed to run cancellation check", cancelErr);
          }
        }

        if (nextIndex >= partCount) {
          if (activeWorkers === 0 && !hasFailed) {
            // Close file handle and complete!
            try {
              await fHandle.close();
            } catch {}
            const result = isLarge
              ? new Api.InputFileBig({ id: fileId, parts: partCount, name: fileName })
              : new Api.InputFile({ id: fileId, parts: partCount, name: fileName, md5Checksum: "" });
            resolve(result);
          }
          return;
        }

        const j = nextIndex++;
        activeWorkers++;

        try {
          const chunkStart = j * partSize;
          let currentChunkSize = partSize;
          if (chunkStart + currentChunkSize > fileSize) {
            currentChunkSize = fileSize - chunkStart;
          }

          // Use Buffer.allocUnsafe for zero-overhead fast memory allocation since we overwrite it immediately
          const chunkBuffer = Buffer.allocUnsafe(currentChunkSize);
          await fHandle.read(chunkBuffer, 0, currentChunkSize, chunkStart);

          // Upload loop with retry logic
          (async () => {
            try {
              while (true) {
                if (hasFailed) return;
                if (checkCancelled && checkCancelled()) {
                  throw new Error("Upload cancelled");
                }
                let sender;
                try {
                  // Round-robin alternate among the available Telegram client TCP connections in the pool
                  // to completely bypass the single-connection speed limits and multiply throughput!
                  const activeClient = clients[j % clients.length];
                  sender = await activeClient.getSender(activeClient.session.dcId);
                  await sender.send(
                    isLarge
                      ? new Api.upload.SaveBigFilePart({
                          fileId,
                          filePart: j,
                          fileTotalParts: partCount,
                          bytes: chunkBuffer,
                        })
                      : new Api.upload.SaveFilePart({
                          fileId,
                          filePart: j,
                          bytes: chunkBuffer,
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

              // Update progress metrics
              uploadedBytes += currentChunkSize;
              const percent = Math.min(100, Math.round((uploadedBytes / fileSize) * 100));
              
              const now = Date.now();
              const elapsedSeconds = (now - startTime) / 1000;
              let speedStr = "0 KB/s";
              let etaStr = "--";

              if (elapsedSeconds > 0.5) {
                const speedBytesPerSecond = uploadedBytes / elapsedSeconds;
                if (speedBytesPerSecond > 1024 * 1024) {
                  speedStr = `${(speedBytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
                } else if (speedBytesPerSecond > 1024) {
                  speedStr = `${(speedBytesPerSecond / 1024).toFixed(0)} KB/s`;
                } else {
                  speedStr = `${speedBytesPerSecond.toFixed(0)} B/s`;
                }

                const remainingBytes = fileSize - uploadedBytes;
                if (speedBytesPerSecond > 0) {
                  const etaSeconds = Math.round(remainingBytes / speedBytesPerSecond);
                  etaStr = `${etaSeconds}s`;
                }
              }

              if (onProgress) {
                onProgress(percent, uploadedBytes, speedStr, etaStr);
              }
            } catch (err) {
              hasFailed = true;
              uploadError = err;
            } finally {
              activeWorkers--;
              if (hasFailed) {
                try {
                  await fHandle.close();
                } catch {}
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
          try {
            await fHandle.close();
          } catch {}
          reject(uploadError);
        }
      }

      // Spawn concurrent workers
      const initialWorkers = Math.min(workers, partCount);
      for (let w = 0; w < initialWorkers; w++) {
        startNextWorker();
      }
    });
  } catch (err) {
    try {
      await fHandle.close();
    } catch {}
    throw err;
  }
}
