const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { ConnectionTCPAbridged } = require("telegram/network");
require("dotenv").config();

async function run() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
  const apiHash = process.env.TELEGRAM_API_HASH || "";

  console.log("Loaded API_ID:", apiId);
  console.log("Loaded API_HASH:", apiHash);

  const session = new StringSession("");
  // Route initially through DC 5 (Singapore)
  session.setDC(5, "91.108.56.156", 443);

  const client = new TelegramClient(session, apiId, apiHash, {
    connection: ConnectionTCPAbridged,
    useWSS: false, // Use port 80
    connectionRetries: 3,
    retryDelay: 1000,
  });

  client.setLogLevel("debug");

  console.log("Connecting...");
  try {
    await client.connect();
    console.log("Connected successfully!");
    await client.disconnect();
  } catch (err) {
    console.error("Connection failed with error:", err);
  }
}

run();
