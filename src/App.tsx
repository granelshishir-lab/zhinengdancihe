import { useState, useEffect } from "react";
import { Word } from "./types";
import { SEED_WORDS } from "./data/seeds";
import { StatsBanner } from "./components/StatsBanner";
import { WordList } from "./components/WordList";
import { MatchingGame } from "./components/MatchingGame";
import { QuizGame } from "./components/QuizGame";
import { BookOpen, Play, Brain, HeartHandshake } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [stars, setStars] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'box' | 'match' | 'quiz'>('box');

  // Load state on startup
  useEffect(() => {
    const cachedWords = localStorage.getItem("children_wordbox_words");
    const cachedStars = localStorage.getItem("children_wordbox_stars");

    if (cachedWords) {
      try {
        setWords(JSON.parse(cachedWords));
      } catch (e) {
        setWords(SEED_WORDS);
      }
    } else {
      setWords(SEED_WORDS);
    }

    if (cachedStars) {
      setStars(Number(cachedStars));
    } else {
      setStars(20); // start with 20 base stars
    }
  }, []);

  // Save changes to localStorage on modifications
  const saveWordsToCache = (newWords: Word[]) => {
    setWords(newWords);
    localStorage.setItem("children_wordbox_words", JSON.stringify(newWords));
  };

  const handleAddWord = (wordObj: Word) => {
    setWords(currentWords => {
      const updated = [wordObj, ...currentWords];
      localStorage.setItem("children_wordbox_words", JSON.stringify(updated));
      return updated;
    });
    // Award 5 stars for custom word creation
    handleAwardStars(5);
  };

  const handleAddWords = (newWords: Word[]) => {
    setWords(currentWords => {
      // Avoid duplicate IDs or words if existing
      const existingLabels = new Set(currentWords.map(w => w.word.toLowerCase()));
      const filteredNew = newWords.filter(w => !existingLabels.has(w.word.toLowerCase()));
      const updated = [...filteredNew, ...currentWords];
      localStorage.setItem("children_wordbox_words", JSON.stringify(updated));
      return updated;
    });
    // Award 5 stars per custom word successfully created
    handleAwardStars(5 * newWords.length);
  };

  const handleEditWord = (wordId: string, updatedFields: Partial<Word>) => {
    setWords(currentWords => {
      const updated = currentWords.map(w => w.id === wordId ? { ...w, ...updatedFields } : w);
      localStorage.setItem("children_wordbox_words", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteWord = (wordId: string) => {
    setWords(currentWords => {
      const updated = currentWords.filter(w => w.id !== wordId);
      localStorage.setItem("children_wordbox_words", JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleProgress = (wordId: string) => {
    setWords(currentWords => {
      const updated = currentWords.map(w => {
        if (w.id === wordId) {
          const nextProg = w.progress === 'mastered' ? 'learning' : 'mastered';
          if (nextProg === 'mastered') {
            // Award 15 stars for mastering a word
            handleAwardStars(15);
          }
          return { ...w, progress: nextProg };
        }
        return w;
      });
      localStorage.setItem("children_wordbox_words", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAwardStars = (count: number) => {
    setStars(prev => {
      const next = prev + count;
      localStorage.setItem("children_wordbox_stars", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] text-black pb-16 antialiased font-sans">
      
      {/* Decorative background sun illustration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD93D]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-5xl mx-auto px-4 pt-8 relative z-10">
        
        {/* Child Achievement Banner stats panel */}
        <StatsBanner words={words} stars={stars} />

        {/* Tab Selection Row in Neobrutalist design */}
        <div className="flex flex-col sm:flex-row justify-center border-4 border-black mb-8 p-1.5 bg-white rounded-3xl max-w-xl mx-auto shadow-neo relative">
          <button
            onClick={() => setActiveTab('box')}
            className={`flex-1 py-3 px-3 rounded-2xl text-sm font-display font-black transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
              activeTab === 'box' 
                ? 'bg-[#6BCB77] border-2 border-black shadow-neo-sm text-white scale-[1.02]' 
                : 'text-black hover:text-[#6BCB77] border-2 border-transparent'
            }`}
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <span>我的词箱</span>
          </button>

          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 py-3 px-3 rounded-2xl text-sm font-display font-black transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
              activeTab === 'match' 
                ? 'bg-[#4D96FF] border-2 border-black shadow-neo-sm text-white scale-[1.02]' 
                : 'text-black hover:text-[#4D96FF] border-2 border-transparent'
            }`}
          >
            <Brain className="w-5 h-5 shrink-0" />
            <span>连连对碰</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-3 px-3 rounded-2xl text-sm font-display font-black transition-all flex items-center justify-center gap-1.5 select-none cursor-pointer ${
              activeTab === 'quiz' 
                ? 'bg-[#FFD93D] border-2 border-black shadow-neo-sm text-black scale-[1.02]' 
                : 'text-black hover:text-[#FFD93D] border-2 border-transparent'
            }`}
          >
            <Play className="w-5 h-5 shrink-0" />
            <span>情景选择</span>
          </button>
        </div>

        {/* Dynamic Tab Body Panel Rendering */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'box' && (
                <WordList
                  words={words}
                  onAddWord={handleAddWord}
                  onAddWords={handleAddWords}
                  onEditWord={handleEditWord}
                  onDeleteWord={handleDeleteWord}
                />
              )}

              {activeTab === 'match' && (
                <MatchingGame
                  words={words}
                  onAwardStars={handleAwardStars}
                />
              )}

              {activeTab === 'quiz' && (
                <QuizGame
                  words={words}
                  onAwardStars={handleAwardStars}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Playful floating school footer copyright credits */}
      <footer className="mt-20 text-center select-none flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium tracking-wide">
        <HeartHandshake className="w-4.5 h-4.5 text-rose-300" />
        <span>专为孩子们设计，随时添加词汇开启奇妙的英语大冒险 🚀</span>
      </footer>
    </div>
  );
}
