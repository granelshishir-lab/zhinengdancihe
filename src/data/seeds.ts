import { Word } from "../types";

export const SEED_WORDS: Word[] = [
  {
    id: "seed-apple",
    word: "apple",
    syllables: "ap•ple",
    translation: "苹果",
    definition: "A round, sweet fruit with crispy skin that can be red, green, or yellow.",
    example: "I took a big, crunchy bite of the sweet red apple.",
    imageType: "svg",
    progress: "mastered",
    createdAt: Date.now() - 50000,
    svgCode: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" rx="24" fill="#FFF1F2"/>
      <circle cx="100" cy="115" r="50" fill="#EF4444"/>
      <circle cx="120" cy="115" r="46" fill="#F87171"/>
      <circle cx="80" cy="115" r="46" fill="#DC2626"/>
      <!-- Apple indent -->
      <path d="M 85,73 Q 100,82 115,73" fill="none" stroke="#FFF1F2" stroke-width="8" stroke-linecap="round"/>
      <!-- Stem -->
      <path d="M 100,74 Q 105,50 120,45" fill="none" stroke="#78350F" stroke-width="6" stroke-linecap="round"/>
      <!-- Leaf -->
      <path d="M 108,60 Q 130,55 125,75 Q 112,75 108,60 Z" fill="#22C55E"/>
      <!-- Highlight -->
      <ellipse cx="78" cy="98" rx="8" ry="12" fill="#FFFFFF" opacity="0.4" transform="rotate(-15 78 98)"/>
    </svg>`
  },
  {
    id: "seed-elephant",
    word: "elephant",
    syllables: "e•le•phant",
    translation: "大象",
    definition: "A very large, intelligent animal with floppy ears, a long trunk, and grey skin.",
    example: "The friendly elephant sprayed cool water with its long trunk.",
    imageType: "svg",
    progress: "learning",
    createdAt: Date.now() - 40000,
    svgCode: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" rx="24" fill="#F0F9FF"/>
      <!-- Body -->
      <ellipse cx="105" cy="115" rx="52" ry="42" fill="#94A3B8"/>
      <!-- Head -->
      <circle cx="70" cy="95" r="32" fill="#94A3B8"/>
      <!-- Ears -->
      <ellipse cx="50" cy="85" rx="16" ry="24" fill="#64748B"/>
      <path d="M50,85 Q40,65 35,80 Q32,100 50,105 Z" fill="#F472B6" opacity="0.5"/>
      <!-- Feet -->
      <rect x="75" y="140" width="16" height="24" rx="4" fill="#64748B"/>
      <rect x="120" y="140" width="16" height="24" rx="4" fill="#64748B"/>
      <!-- Trunk -->
      <path d="M70,110 C65,135 40,135 35,115 C32,105 45,108 45,115" fill="none" stroke="#94A3B8" stroke-width="12" stroke-linecap="round"/>
      <!-- Tail -->
      <path d="M152,110 C162,110 165,125 165,130" fill="none" stroke="#64748B" stroke-width="4" stroke-linecap="round"/>
      <!-- Eye -->
      <circle cx="72" cy="85" r="4" fill="#0F172A"/>
      <circle cx="71" cy="83" r="1.5" fill="#FFFFFF"/>
      <!-- Tusk -->
      <path d="M 64,108 Q 54,115 50,110 C50,105 60,105 64,106 Z" fill="#F8FAFC"/>
    </svg>`
  },
  {
    id: "seed-banana",
    word: "banana",
    syllables: "ba•na•na",
    translation: "香蕉",
    definition: "A soft, long yellow fruit with a thick skin that you peel away before eating.",
    example: "The cheerful baby monkey love to peel and eat a ripe yellow banana.",
    imageType: "svg",
    progress: "learning",
    createdAt: Date.now() - 30000,
    svgCode: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" rx="24" fill="#FEFEE2"/>
      <!-- Bananas -->
      <path d="M 45,45 C 105,45 155,95 155,155 C 135,145 105,105 45,45" fill="#EAB308"/>
      <path d="M 45,45 C 95,50 145,100 145,150 C 135,145 110,110 45,45" fill="#FACC15"/>
      <!-- Stem End -->
      <path d="M 45,45 Q 40,38 35,42 Q 38,48 45,45 Z" fill="#78350F"/>
      <!-- Tip End -->
      <circle cx="155" cy="155" r="4" fill="#451A03"/>
      <!-- Highlights/Details -->
      <path d="M 65,65 Q 115,85 125,125" fill="none" stroke="#FEF08A" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "seed-robot",
    word: "robot",
    syllables: "ro•bot",
    translation: "机器人",
    definition: "A futuristic metal machine controlled by a smart computer, built to do chores.",
    example: "The red little robot blinked its yellow eyes and gave me a hearty high five.",
    imageType: "svg",
    progress: "mastered",
    createdAt: Date.now() - 20000,
    svgCode: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" rx="24" fill="#F0FDFA"/>
      <!-- Head -->
      <rect x="65" y="55" width="70" height="50" rx="8" fill="#3B82F6"/>
      <!-- Horn/Antenna -->
      <line x1="100" y1="55" x2="100" y2="40" stroke="#0EA5E9" stroke-width="6" stroke-linecap="round"/>
      <circle cx="100" cy="35" r="8" fill="#F59E0B"/>
      <!-- Eyes -->
      <circle cx="85" cy="80" r="10" fill="#E11D48"/>
      <circle cx="85" cy="80" r="4" fill="#FFFFFF"/>
      <circle cx="115" cy="80" r="10" fill="#E11D48"/>
      <circle cx="115" cy="80" r="4" fill="#FFFFFF"/>
      <!-- Mouth -->
      <rect x="80" y="93" width="40" height="6" rx="3" fill="#0F172A"/>
      <!-- Body -->
      <rect x="55" y="115" width="90" height="55" rx="12" fill="#1D4ED8"/>
      <!-- Dial buttons -->
      <circle cx="80" cy="135" r="6" fill="#F59E0B"/>
      <circle cx="100" cy="135" r="6" fill="#10B981"/>
      <circle cx="120" cy="135" r="6" fill="#EF4444"/>
      <!-- Arms -->
      <path d="M 55,125 Q 35,130 30,145" fill="none" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/>
      <path d="M 145,125 Q 165,130 170,145" fill="none" stroke="#3B82F6" stroke-width="8" stroke-linecap="round"/>
      <!-- Ears/Bolts -->
      <rect x="55" y="70" width="10" height="15" rx="2" fill="#64748B"/>
      <rect x="135" y="70" width="10" height="15" rx="2" fill="#64748B"/>
    </svg>`
  },
  {
    id: "seed-rainbow",
    word: "rainbow",
    syllables: "rain•bow",
    translation: "彩虹",
    definition: "A colorful magical arch of light formed in the humid sky when sunshine hits rain.",
    example: "We saw a brilliant, magical colorful rainbow standing high above the lush green forest.",
    imageType: "svg",
    progress: "mastered",
    createdAt: Date.now() - 10000,
    svgCode: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" rx="24" fill="#F5F3FF"/>
      <!-- Arcs -->
      <circle cx="100" cy="130" r="80" fill="none" stroke="#EF4444" stroke-width="12" stroke-dasharray="251 251" transform="rotate(-180 100 130)"/>
      <circle cx="100" cy="130" r="68" fill="none" stroke="#F59E0B" stroke-width="12" stroke-dasharray="213 213" transform="rotate(-180 100 130)"/>
      <circle cx="100" cy="130" r="56" fill="none" stroke="#10B981" stroke-width="12" stroke-dasharray="176 176" transform="rotate(-180 100 130)"/>
      <circle cx="100" cy="130" r="44" fill="none" stroke="#3B82F6" stroke-width="12" stroke-dasharray="138 138" transform="rotate(-180 100 130)"/>
      <circle cx="100" cy="130" r="32" fill="none" stroke="#8B5CF6" stroke-width="12" stroke-dasharray="100 100" transform="rotate(-180 100 130)"/>
      
      <!-- Left Cloud -->
      <path d="M 10,130 A 20,20 0 0,1 40,110 A 30,30 0 0,1 80,115 A 20,20 0 0,1 80,130 Z" fill="#F8FAFC"/>
      <path d="M 10,130 L 80,130 M 10,130 A 20,20 0 0,1 42,110 A 30,30 0 0,1 80,115" stroke="#E2E8F0" stroke-width="3" fill="none"/>
      
      <!-- Right Cloud -->
      <path d="M 120,130 A 20,20 0 0,1 150,110 A 30,30 0 0,1 190,115 A 20,20 0 0,1 190,130 Z" fill="#F8FAFC"/>
      <path d="M 120,130 L 190,130 M 120,130 A 20,20 0 0,1 152,110 A 30,30 0 0,1 190,115" stroke="#E2E8F0" stroke-width="3" fill="none"/>
    </svg>`
  }
];
