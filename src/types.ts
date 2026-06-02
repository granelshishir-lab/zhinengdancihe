export interface Word {
  id: string;
  word: string;
  syllables: string; // syllables with black dots e.g. "won•der•ful"
  translation: string; // Chinese translation
  definition: string; // Simple English definition
  example: string; // Simple situation sentence
  imageType: 'upload' | 'svg' | 'default';
  imageUrl?: string; // base64 or object URL of uploaded image
  svgCode?: string; // generated stylized vector SVG
  createdAt: number;
  progress: 'learning' | 'mastered';
  isFavorite?: boolean; // Word Favorite attribute
  boxId?: string; // Optional custom wordbox/category ID
}

export interface WordBox {
  id: string;
  name: string;
  color: string; // Tailwind background style or HEX representation
  icon: string; // Emoji representing the box, e.g. "🦁", "🍎"
  createdAt: number;
}

export interface MatchPair {
  id: string;
  text: string;
  type: 'word' | 'translation' | 'definition';
  matchedId: string; // the absolute word id it belongs to
}

export interface QuizQuestion {
  id: string;
  wordId: string;
  correctWord: string;
  definition: string;
  example: string; // Original example sentence for fill-in-the-blank
  svgCode?: string;
  imageUrl?: string;
  options: string[]; // four options
}
