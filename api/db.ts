import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

// Unique bucket based on applet ID for complete isolation
const BUCKET_ID = "3f8ee70c-6158-44d7-a4cb-ddc5239063a4";
const KVDB_URL = `https://kvdb.io/${BUCKET_ID}/users_v2`;

const ENCRYPTION_KEY = crypto.createHash("sha256").update("vocab_kid_key_3f8ee70c").digest(); // Exactly 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (e) {
    console.error("Encryption error:", e);
    return text;
  }
}

function decrypt(text: string): string {
  try {
    const parts = text.split(":");
    const ivStr = parts.shift();
    if (!ivStr) return text;
    const iv = Buffer.from(ivStr, "hex");
    const encryptedText = parts.join(":");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (e) {
    console.error("Decryption error:", e);
    return text;
  }
}

export interface UserAccount {
  username: string;
  passwordPlain: string;
  activationKey: string;
  activated: boolean;
  words: any[];
  stars: number;
  wordBoxes: any[];
  lastActiveDates: Record<string, number>;
}

export interface CloudDB {
  users: Record<string, UserAccount>; // keyed by username (lowercase)
}

// In-memory cache to guarantee fast response times
let memoryCache: CloudDB | null = null;

// Determine file path for local fallback persistence
let currentDirname = "";
try {
  if (typeof __dirname !== "undefined") {
    currentDirname = __dirname;
  } else {
    currentDirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch (e) {
  currentDirname = process.cwd();
}

const localFallbackPaths = [
  path.join(process.cwd(), "keys_db.json"),
  path.join(currentDirname, "../keys_db.json"),
  path.join(currentDirname, "keys_db.json")
];

function readLocalFallback(): CloudDB {
  for (const p of localFallbackPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {}
  }
  return { users: {} };
}

function writeLocalFallback(data: CloudDB) {
  for (const p of localFallbackPaths) {
    try {
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
    } catch (e) {}
  }
}

// Load DB from Cloud with fallback
export async function loadDB(): Promise<CloudDB> {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast responsiveness

    const res = await fetch(KVDB_URL, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.status === 200) {
      const encryptedText = await res.text();
      if (encryptedText && encryptedText.trim().length > 0) {
        const decryptedJson = decrypt(encryptedText);
        const parsed = JSON.parse(decryptedJson);
        if (parsed && parsed.users) {
          memoryCache = parsed;
          // Sync to local fallback file just in case
          writeLocalFallback(parsed);
          return parsed;
        }
      }
    }
  } catch (error) {
    console.error("Cloud DB read failed, using local/cache fallback:", error);
  }

  // Fallback to local file if cloud is unreachable
  const fallback = readLocalFallback();
  if (fallback && fallback.users) {
    memoryCache = fallback;
  } else {
    memoryCache = { users: {} };
  }
  return memoryCache;
}

// Save DB to Cloud
export async function saveDB(data: CloudDB): Promise<boolean> {
  memoryCache = data;
  writeLocalFallback(data);

  try {
    const rawString = JSON.stringify(data);
    const encryptedString = encrypt(rawString);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(KVDB_URL, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: encryptedString,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 200 || res.status === 201) {
      return true;
    }
  } catch (error) {
    console.error("Cloud DB write failed:", error);
  }

  return false;
}
