import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "keys_db.json");

interface KeyStatus {
  type: "permanent" | "trial";
  activatedDevices: string[];
  firstActivatedAt: number | null;
}

interface KeysDB {
  keys: Record<string, KeyStatus>;
}

if (!fs.existsSync(DB_PATH)) {
  console.error("No database found!");
  process.exit(1);
}

const db: KeysDB = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

const permanent: string[] = [];
const trial: string[] = [];

Object.entries(db.keys).forEach(([key, info]) => {
  if (info.type === "permanent") {
    permanent.push(key);
  } else {
    trial.push(key);
  }
});

// Sort to ensure clean lists
permanent.sort();
trial.sort();

// Create CSV content
let csvContent = "序号,授权码卡密,类别,激活状态,登录设备数量,试用有效期限制\n";
permanent.forEach((key, index) => {
  const status = db.keys[key];
  const devCount = status.activatedDevices.length;
  csvContent += `${index + 1},${key},永久卡密,${devCount > 0 ? "已激活" : "未激活"},${devCount}/2,"无激活后时效限制"\n`;
});

trial.forEach((key, index) => {
  const status = db.keys[key];
  const devCount = status.activatedDevices.length;
  csvContent += `${index + 1},${key},24小时试用卡密,${devCount > 0 ? "已激活" : "未激活"},${devCount}/2,"首次激活后24小时失效"\n`;
});

fs.writeFileSync(path.join(process.cwd(), "keys_export.csv"), "\ufeff" + csvContent); // BOM for Excel recognition

// Create a combined txt reader format
let txtContent = "=== 永久授权码 / 200张卡密 (不限时，支持2台设备) ===\n";
permanent.forEach((key, index) => {
  txtContent += `${(index + 1).toString().padStart(3, "0")} | ${key} | 永久卡密 | 限双设备\n`;
});

txtContent += "\n=== 24小时试用授权码 / 250张卡密 (首次激活起计24小时，支持2台设备) ===\n";
trial.forEach((key, index) => {
  txtContent += `${(index + 1).toString().padStart(3, "0")} | ${key} | 24小时试用 | 限双设备\n`;
});

fs.writeFileSync(path.join(process.cwd(), "keys_export.txt"), txtContent);

console.log("=== EXPORT SUCCESS ===");
console.log(`Permanent keys total: ${permanent.length}`);
console.log(`Trial keys total: ${trial.length}`);
console.log("Files written: keys_export.csv and keys_export.txt successfully Created!");
