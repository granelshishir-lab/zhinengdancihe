import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

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

// Express API Route
app.post("/api/word/analyze", async (req: express.Request, res: express.Response) => {
  const { word } = req.body;
  if (!word || typeof word !== "string") {
    res.status(400).json({ error: "Word is required and must be a string." });
    return;
  }

  const cleanWord = word.trim().toLowerCase();

  if (!ai) {
    // If no API Key is set, return a high-fidelity fallback immediately
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
      model: "gemini-3.5-flash",
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
    // Graceful error fallback
    res.json(generateFallback(cleanWord));
  }
});

export default app;
