import fs from "fs";
import path from "path";

// Define DB paths relative to the current working directory to work on container environments
const DB_PATH = path.join(process.cwd(), "keys_db.json");

interface KeyStatus {
  type: "permanent" | "trial";
  activatedDevices: string[];
  firstActivatedAt: number | null;
}

interface KeysDB {
  keys: Record<string, KeyStatus>;
}

// Read database helper
function readDB(): KeysDB {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to read keys database:", error);
  }
  return { keys: {} };
}

// Write database helper
function writeDB(db: KeysDB): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Failed to write keys database:", error);
  }
}

export function verifyActivationKey(key: string, deviceId: string): { success: boolean; message: string; data?: { type: "permanent" | "trial" } } {
  if (!key || typeof key !== "string" || !deviceId) {
    return { success: false, message: "卡密及设备ID均不能为空" };
  }

  const db = readDB();
  const trimmedKey = key.trim().toUpperCase();
  const keyInfo = db.keys[trimmedKey];

  if (!keyInfo) {
    return { success: false, message: "授权码或卡密不存在，请重新核对输入 🌸" };
  }

  // Handle Trial configuration (24 Hour expiration check)
  if (keyInfo.type === "trial") {
    if (keyInfo.firstActivatedAt !== null) {
      const elapsedMs = Date.now() - keyInfo.firstActivatedAt;
      const hoursRemaining = (24 * 60 * 60 * 1000 - elapsedMs) / (60 * 60 * 1000);
      
      if (hoursRemaining <= 0) {
        return { success: false, message: "该试用卡密已经过期失效（试用期24小时已满）。" };
      }
    }
  }

  // Handle Devices matching / registration (Max 2 devices)
  const isRegisteredDev = keyInfo.activatedDevices.includes(deviceId);
  
  if (isRegisteredDev) {
    // Already validated for this device (e.g. reopen app)
    return { 
      success: true, 
      message: "此设备解锁成功！", 
      data: { type: keyInfo.type } 
    };
  }

  // This is a new device attempting to activate
  if (keyInfo.activatedDevices.length >= 2) {
    return { 
      success: false, 
      message: "该卡密已在其他电脑或手机等两台设备登录，绑定名额已满。如需解锁，请另外输入新卡密 🎒" 
    };
  }

  // Space available, register device!
  keyInfo.activatedDevices.push(deviceId);
  
  // Set first-activation time if not set yet (starts 24h grace countdown)
  if (keyInfo.firstActivatedAt === null) {
    keyInfo.firstActivatedAt = Date.now();
  }

  // Save back changes
  writeDB(db);

  return { 
    success: true, 
    message: keyInfo.type === "trial" ? "试用卡密激活成功！有效期为24小时。" : "永久卡密激活成功，开始您奇妙的英语词汇世界！🎨", 
    data: { type: keyInfo.type } 
  };
}
