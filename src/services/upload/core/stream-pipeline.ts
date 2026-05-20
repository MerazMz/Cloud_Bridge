import { createWriteStream } from "fs";

/**
 * Pipes a Web ReadableStream (from browser file.stream()) directly to a filesystem path.
 * Dynamically respects TCP / Node stream backpressure (drain event) to eliminate RAM overhead.
 */
export async function writeWebStreamToDisk(
  webStream: ReadableStream<Uint8Array>,
  destinationPath: string
): Promise<void> {
  const writeStream = createWriteStream(destinationPath);
  const reader = webStream.getReader();

  return new Promise<void>((resolve, reject) => {
    writeStream.on("error", (err) => {
      reader.releaseLock();
      reject(err);
    });

    writeStream.on("finish", () => {
      resolve();
    });

    async function pump() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          writeStream.end();
          return;
        }

        const canWrite = writeStream.write(Buffer.from(value));
        if (!canWrite) {
          // Wait for the OS socket/file buffer to drain before reading the next chunk
          writeStream.once("drain", pump);
        } else {
          pump();
        }
      } catch (err) {
        writeStream.destroy();
        reader.releaseLock();
        reject(err);
      }
    }

    pump();
  });
}
