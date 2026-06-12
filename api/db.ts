import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

// Unique bucket ID or signatures
const SECRET_SIGNATURE = "vocab_adventure_3f8ee70c_key_safe";

export interface UserAccount {
  username: string;
  passwordPlain: string;
  activationKey: string;
  activated: boolean;
  boundDeviceId?: string;
  revoked?: boolean;
  words: any[];
  stars: number;
  wordBoxes: any[];
  lastActiveDates: Record<string, number>;
}

export interface CloudDB {
  users: Record<string, UserAccount>; // keyed by username lowercase
}

// In-memory cache to guarantee fast response times
let memoryCache: CloudDB | null = null;

// Determine directory paths
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

// Separate read-only reference of pre-distributed card keys
const legacySeedPaths = [
  path.join(process.cwd(), "keys_db.json"),
  path.join(currentDirname, "../keys_db.json"),
  path.join(currentDirname, "keys_db.json")
];

// Writeable paths for active database states (Dynamic cache separate from Seed)
const dynamicStatePaths = [
  path.join(process.cwd(), "dynamic_db.json"),
  path.join(currentDirname, "../dynamic_db.json"),
  path.join(currentDirname, "dynamic_db.json"),
  path.join(process.cwd(), "api/dynamic_db.json"),
  path.join(currentDirname, "api/dynamic_db.json")
];

// Cryptographic Checksum Generation
function calculateChecksum(rChars: string): string {
  const keyChars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
  const hash = crypto.createHmac("sha256", SECRET_SIGNATURE).update(rChars).digest("hex");
  
  let s = "";
  for (let i = 0; i < 3; i++) {
    const chunk = hash.substring(i * 4, (i + 1) * 4);
    const num = parseInt(chunk, 16);
    s += keyChars.charAt(num % keyChars.length);
  }
  return s;
}

// Public: Checks if activation key is authentic and belongs to this system
export function isCryptographicallyValidKey(key: string): boolean {
  const cleanKey = key.trim().toUpperCase();
  
  if (!/^KID-[ABCDEFGHJKLMNOPQRSTUVWXYZ2-9]{4}-[ABCDEFGHJKLMNOPQRSTUVWXYZ2-9]{4}$/.test(cleanKey)) {
    return false;
  }
  
  const chars = cleanKey.replace(/[^A-Z2-9]/g, "").substring(3); // Keep only the 8 chars after KID
  if (chars.length !== 8) return false;
  
  // Extract random elements and checksum characters at expected indexes
  const rChars = chars.charAt(0) + chars.charAt(1) + chars.charAt(2) + chars.charAt(4) + chars.charAt(5);
  const sChars = chars.charAt(3) + chars.charAt(6) + chars.charAt(7);
  
  const expectedS = calculateChecksum(rChars);
  return expectedS === sChars;
}

// Public: Generates a new mathematically signed key
export function generateSignedKey(): string {
  const keyChars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
  
  let rChars = "";
  for (let i = 0; i < 5; i++) {
    rChars += keyChars.charAt(Math.floor(Math.random() * keyChars.length));
  }
  
  const sChars = calculateChecksum(rChars);
  
  // Synthesize key characters with deterministic placement
  const fullChars = 
    rChars.charAt(0) + // index 0 (R1)
    rChars.charAt(1) + // index 1 (R2)
    rChars.charAt(2) + // index 2 (R3)
    sChars.charAt(0) + // index 3 (S1)
    rChars.charAt(3) + // index 4 (R4)
    rChars.charAt(4) + // index 5 (R5)
    sChars.charAt(1) + // index 6 (S2)
    sChars.charAt(2);  // index 7 (S3)
    
  return `KID-${fullChars.substring(0, 4)}-${fullChars.substring(4)}`;
}

// Load dynamic writeable database
function readDynamicState(): CloudDB {
  for (const p of dynamicStatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.users) {
          return parsed;
        }
      }
    } catch (e) {}
  }
  return { users: {} };
}

// Write dynamic database (Only writes to dedicated dynamic destinations)
function writeDynamicState(data: CloudDB) {
  for (const p of dynamicStatePaths) {
    try {
      // Ensure folder exists
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
    } catch (e) {}
  }
}

// Load seed keys from read-only keys_db.json
function loadReadOnlyLegacySeed(): any {
  for (const p of legacySeedPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        // Ensure this is the legacy format with 'keys' array
        if (parsed && typeof parsed === "object" && parsed.keys) {
          return parsed;
        }
      }
    } catch (e) {}
  }
  return null;
}

// Unified Database Loading Pipeline
export async function loadDB(): Promise<CloudDB> {
  if (memoryCache) {
    return memoryCache;
  }

  // 1. Read the writeable dynamic states containing active sessions or generated cards
  const db = readDynamicState();

  // 2. Load the read-only keys_db.json seed and index any missing keys as UserAccounts
  const legacySeed = loadReadOnlyLegacySeed();
  if (legacySeed && legacySeed.keys) {
    let changed = false;
    for (const [keyName, val] of Object.entries(legacySeed.keys)) {
      const normalizedKey = keyName.trim().toUpperCase();
      const lKeyUsername = "legacy_" + normalizedKey.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check if this key is already added as a UserAccount
      const exists = Object.values(db.users).some(
        (u) => u.activationKey && u.activationKey.toUpperCase() === normalizedKey
      );

      if (!exists) {
        const details = val as any;
        const activated = !!(details.activatedDevices && details.activatedDevices.length > 0);
        const boundId = activated ? details.activatedDevices[0] : undefined;

        db.users[lKeyUsername] = {
          username: lKeyUsername,
          passwordPlain: "secured_legacy_pass",
          activationKey: normalizedKey,
          activated: activated,
          boundDeviceId: boundId,
          words: [],
          stars: 20,
          wordBoxes: [],
          lastActiveDates: {}
        };
        changed = true;
      }
    }

    if (changed) {
      writeDynamicState(db);
    }
  }

  memoryCache = db;
  return db;
}

// Unified Database Saving Pipeline
export async function saveDB(data: CloudDB): Promise<boolean> {
  memoryCache = data;
  writeDynamicState(data);
  return true;
}
