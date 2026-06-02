/**
 * Text-to-Speech utility for Children Wordbox
 * Uses the Web Speech API for zero-cost, high-performance offline speech synthesis.
 */

export interface SpeechOptions {
  rate?: number;  // speed: 1.0 = normal, 0.6 = slow
  pitch?: number; // frequency: 1.0 = normal, 1.2 = cheerful/kid-friendly
  lang?: string;  // language code
}

export function playSpeech(text: string, options: SpeechOptions = {}) {
  // Clean raw speech text (e.g., remove syllable separation dots so pronunciation sounds natural)
  const cleanText = text.replace(/•/g, '').trim();

  try {
    // Detect if text is mostly English for appropriate accent selection
    const isEnglish = /^[a-zA-Z\s,.'"-?!()]+$/.test(cleanText);
    const audioUrl = isEnglish
      ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`
      : `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=0`;

    const audio = new Audio(audioUrl);
    // Standard playback
    audio.play().catch((audioErr) => {
      console.warn('Online Audio playback failed, trying offline Web Speech API fallback...', audioErr);
      fallbackSpeechSynthesis(cleanText, options);
    });
  } catch (err) {
    console.warn('Could not launch HTML5 Audio, trying offline Web Speech API fallback...', err);
    fallbackSpeechSynthesis(cleanText, options);
  }
}

function fallbackSpeechSynthesis(cleanText: string, options: SpeechOptions = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  try {
    // Cancel any ongoing speech to prevent overlapping audio
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a premium English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en-') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en-'));

    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    } else {
      utterance.lang = options.lang || 'en-US';
    }

    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.15; // Slightly higher pitch for kids

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('All text-to-speech pathways failed.', err);
  }
}

// Speak a phonetic pronunciation of individual syllable parts
export function playSyllables(syllables: string) {
  // Replace • with commas or slight pauses for pronunciation
  const cleanText = syllables.replace(/•/g, ' - ').trim();
  playSpeech(cleanText, { rate: 0.55, pitch: 1.2 });
}
