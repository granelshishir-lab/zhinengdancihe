import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

// Support both ESM and CommonJS for path resolution
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

const DB_PATH = path.join(currentDirname, "../keys_db.json");

interface KeyStatus {
  type: "permanent" | "trial";
  activatedDevices: string[];
  firstActivatedAt: number | null;
}

interface KeysDB {
  keys: Record<string, KeyStatus>;
}

// Read database helper with multi-path safety
function readDB(): KeysDB {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    } else {
      // Fallback: If DB_PATH is not found but process.cwd() works, try fallback path
      const fallbackPath = path.join(process.cwd(), "keys_db.json");
      if (fs.existsSync(fallbackPath)) {
        const content = fs.readFileSync(fallbackPath, "utf-8");
        return JSON.parse(content);
      }
    }
  } catch (error) {
    console.error("Failed to read keys database:", error);
  }
  return { keys: {} };
}

// Write database helper with error catching and read-only fallback to memory or tmp
function writeDB(db: KeysDB): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Failed to write keys database to main path:", error);
    try {
      const fallbackPath = path.join(process.cwd(), "keys_db.json");
      fs.writeFileSync(fallbackPath, JSON.stringify(db, null, 2));
    } catch (err) {
      console.error("Failed to write keys database to fallback path:", err);
    }
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

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Fallback Syllable splitting calculation
function fallbackSyllables(word: string): string {
  const cleanWord = word.trim().replace(/[^a-zA-Z]/g, '');
  if (!cleanWord) return word;
  
  // Basic syllable splitting heuristic for English
  const res = cleanWord.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*(?![aeiouy]))?/gi);
  if (!res || res.length <= 1) return cleanWord;
  
  return res.join("•");
}

// Fallback mock information with card-styled cute fallback SVG
function generateFallback(word: string) {
  const syll = fallbackSyllables(word);
  const capped = word.charAt(0).toUpperCase() + word.slice(1);
  return {
    syllables: syll,
    translation: `${capped}`,
    definition: `A basic description of ${word} for kids.`,
    example: `Look at this cute ${word} over there!`,
    svgIllustration: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" rx="24" fill="#EEF2F6"/>
      <circle cx="100" cy="100" r="50" fill="#6366F1" opacity="0.85"/>
      <text x="100" y="112" font-family="sans-serif" font-size="44" font-weight="bold" fill="white" text-anchor="middle">${word.substring(0, 2).toUpperCase()}</text>
    </svg>`
  };
}

// Express API Route for word categorization
app.post("/api/word/analyze", async (req: express.Request, res: express.Response) => {
  const { word } = req.body;
  if (!word || typeof word !== "string") {
    res.status(400).json({ error: "Word is required and must be a string." });
    return;
  }

  const cleanWord = word.trim();

  if (!ai) {
    res.json(generateFallback(cleanWord));
    return;
  }

  try {
    const prompt = `You are a friendly, experienced English teacher for elementary school children. Organize the English word: "${cleanWord}".
1. Segment it into syllables using dots (•) as syllable separators. (e.g. apple is "ap•ple", elephant is "e•le•phant", orange is "or•ange").
2. Provide a simple, clear Chinese translation suitable for children.
3. Write a child-friendly, elementary-level simplified English definition.
4. Construct an engaging, vivid example sentence using this word. Keep it simple and easy for children to understand.
5. Create a colorful, cute cartoon vector illustration of this word in raw vector SVG format. Ensure it meets these constraints:
   - Wrapped inside a single responsive <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"> block.
   - Beautifully filled with vivid child-appealing colors (like flat pastel colors, beautiful gradients, soft shadows).
   - Use simple clean geometry (rect, circle, path) forming a lovely icon/cartoon of the object (e.g., if "apple", a cute red apple with a glossy highlight and a leaf; if "run", a happy shoe/stick figure running).
   - No outer XML/HTML markup, markdown backticks, or text before/after the SVG. Just pure valid SVG starting with <svg and ending with </svg>. Ensure no script tags.
   - Rounded card background built into the SVG (e.g., <rect width="200" height="200" rx="24" fill="#F1F5F9" />) to frame it nicely.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            syllables: { type: Type.STRING, description: "Word with syllables separated by dots (e.g. com•pu•ter)" },
            translation: { type: Type.STRING, description: "Chinese translation suited for kids (e.g. 电脑)" },
            definition: { type: Type.STRING, description: "Simple kid-friendly English definition" },
            example: { type: Type.STRING, description: "vivid child-friendly example sentence" },
            svgIllustration: { type: Type.STRING, description: "Responsive inline raw <svg>...</svg> vector code depicting the word's situation" }
          },
          required: ["syllables", "translation", "definition", "example", "svgIllustration"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response text from Gemini API.");
    }

    const payload = JSON.parse(textOutput);
    res.json(payload);
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.json(generateFallback(cleanWord));
  }
});

// Activation verifier endpoint
app.post("/api/auth/verify", (req: express.Request, res: express.Response) => {
  const { key, deviceId } = req.body;
  const result = verifyActivationKey(key, deviceId);
  res.json(result);
});

export default app;
