import React, { useState, useEffect } from "react";
import { Word, WordBox } from "./types";
import { SEED_WORDS } from "./data/seeds";
import { StatsBanner } from "./components/StatsBanner";
import { WordList } from "./components/WordList";
import { MatchingGame } from "./components/MatchingGame";
import { QuizGame } from "./components/QuizGame";
import { BookOpen, Play, Brain, HeartHandshake } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const BASE_BOXES: WordBox[] = [
  { id: "box-default", name: "默认曲奇", color: "#FEF2F2", icon: "🍪", createdAt: 1654160000000 },
  { id: "box-animals", name: "动物乐园", color: "#F0F9FF", icon: "🦁", createdAt: 1654160000001 },
  { id: "box-fruits", name: "美味水果", color: "#FFF1F2", icon: "🍎", createdAt: 1654160000002 },
  { id: "box-daily", name: "日常百宝", color: "#F0FDFA", icon: "🎒", createdAt: 1654160000003 }
];

export default function App() {
  const [words, setWords] = useState<Word[]>([]);
  const [wordBoxes, setWordBoxes] = useState<WordBox[]>([]);
  const [stars, setStars] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'box' | 'match' | 'quiz'>('box');

  // Authorization and Activation States
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null); // null = checking, false = locked, true = unlocked
  const [unlockedKey, setUnlockedKey] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");

  // Load licensing & generate deviceId on start
  useEffect(() => {
    let storedDeviceId = localStorage.getItem("children_wordbox_device_id");
    if (!storedDeviceId) {
      storedDeviceId = "dev-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
      localStorage.setItem("children_wordbox_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    const savedKey = localStorage.getItem("children_wordbox_unlocked_key");
    if (savedKey) {
      fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: savedKey.trim().toUpperCase(), deviceId: storedDeviceId })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            setIsUnlocked(true);
            setUnlockedKey(savedKey.trim().toUpperCase());
          } else {
            localStorage.removeItem("children_wordbox_unlocked_key");
            setIsUnlocked(false);
            if (data && data.message) {
              setAuthError(data.message);
            }
          }
        })
        .catch(err => {
          console.error("Auth check failed on start:", err);
          // Let's degrade and allow them if network is strictly offline for demo, but require auth
          setIsUnlocked(false);
        })
        .finally(() => {
          setAuthLoading(false);
        });
    } else {
      setIsUnlocked(false);
      setAuthLoading(false);
    }
  }, []);

  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputKey.trim()) {
      setAuthError("请输入合法的卡密 🌸");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const formatted = inputKey.trim().toUpperCase();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: formatted, deviceId })
      });
      const data = await res.json();
      if (data && data.success) {
        localStorage.setItem("children_wordbox_unlocked_key", formatted);
        setUnlockedKey(formatted);
        setIsUnlocked(true);
      } else {
        setAuthError(data.message || "无效的卡密，请重新输入 🌿");
      }
    } catch (err) {
      setAuthError("连接服务器失败，请检查网络 📶");
    } finally {
      setAuthLoading(false);
    }
  };

  // Load state on startup
  useEffect(() => {
    const cachedWords = localStorage.getItem("children_wordbox_words");
    const cachedStars = localStorage.getItem("children_wordbox_stars");
    const cachedBoxes = localStorage.getItem("children_wordbox_boxes");

    // 1. Initial/Load Word Boxes
    let loadedBoxes: WordBox[] = BASE_BOXES;
    if (cachedBoxes) {
      try {
        loadedBoxes = JSON.parse(cachedBoxes);
      } catch (e) {
        loadedBoxes = BASE_BOXES;
      }
    } else {
      localStorage.setItem("children_wordbox_boxes", JSON.stringify(BASE_BOXES));
    }
    setWordBoxes(loadedBoxes);

    // 2. Initial/Load Seeds/Words with boxId mapped appropriately
    const seedWithBoxes = SEED_WORDS.map(w => {
      let boxId = "box-default";
      if (w.id === "seed-apple" || w.id === "seed-banana") {
        boxId = "box-fruits";
      } else if (w.id === "seed-elephant") {
        boxId = "box-animals";
      } else if (w.id === "seed-robot" || w.id === "seed-rainbow") {
        boxId = "box-daily";
      }
      return { ...w, boxId };
    });

    if (cachedWords) {
      try {
        const parsed = JSON.parse(cachedWords);
        // Migrate legacy loaded records lacking a boxId
        const migrated = parsed.map((w: any) => ({
          ...w,
          boxId: w.boxId || "box-default"
        }));
        setWords(migrated);
      } catch (e) {
        setWords(seedWithBoxes);
      }
    } else {
      setWords(seedWithBoxes);
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
      const existingLabels = new Set(currentWords.map(w => w.word));
      const filteredNew = newWords.map(w => ({
        ...w,
        boxId: w.boxId || "box-default"
      })).filter(w => !existingLabels.has(w.word));
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

  const handleAddWordBox = (newBox: WordBox) => {
    setWordBoxes(prev => {
      const updated = [...prev, newBox];
      localStorage.setItem("children_wordbox_boxes", JSON.stringify(updated));
      return updated;
    });
    handleAwardStars(10); // Award 10 stars for creating a new wordbox category!
  };

  const handleDeleteWordBox = (boxId: string) => {
    if (boxId === "box-default") return; // cannot delete default
    setWordBoxes(prev => {
      const updated = prev.filter(b => b.id !== boxId);
      localStorage.setItem("children_wordbox_boxes", JSON.stringify(updated));
      return updated;
    });
    // re-assign words in that box to default
    setWords(currentWords => {
      const updated = currentWords.map(w => w.boxId === boxId ? { ...w, boxId: "box-default" } : w);
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

  if (isUnlocked === null) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center justify-center p-4 font-sans select-none relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD93D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="bg-white border-4 border-black p-8 rounded-[32px] shadow-neo max-w-sm w-full text-center relative z-10 transition-transform">
          <div className="w-20 h-20 bg-[#FFD93D] text-black border-2 border-black rounded-2xl flex items-center justify-center text-4xl shadow-neo-sm mx-auto mb-6 animate-pulse">
            🔑
          </div>
          <h2 className="text-xl font-black mb-2 tracking-tight">专属授权校验中...</h2>
          <p className="text-xs text-slate-500 font-bold mb-5">正在连接卡通单词盒中心验证账户安全 🚀</p>
          <div className="w-full bg-[#FEF2F2] border-2 border-black h-4 rounded-full overflow-hidden">
            <div 
              className="bg-[#6BCB77] h-full transition-all duration-300"
              style={{ width: "85%", animation: "pulse 1.5s infinite" }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center justify-center p-4 font-sans relative">
        {/* Decorative background illustrations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD93D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-white border-4 border-black p-6 sm:p-8 rounded-[36px] shadow-neo max-w-lg w-full text-center relative z-10">
          <div className="w-16 h-16 bg-[#FF6B6B] text-white border-2 border-black rounded-2xl flex items-center justify-center text-3xl shadow-neo-sm mx-auto mb-6 transform hover:rotate-12 transition">
            🎒
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black mb-3 text-black tracking-tight" style={{ fontStyle: "normal" }}>
            🔑 单词乐园 · 冒险起航
          </h1>
          
          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed mb-6">
            各位小探险家，请输入您的专属授权码 / 卡密，
            <br />
            开启卡通生动插画与趣味发音的英语单词秘境吧！🌸
          </p>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value.toUpperCase());
                  setAuthError("");
                }}
                placeholder="密码: 如 KT-PM-XXXX-XXXX"
                className="w-full px-5 py-3.5 text-center font-mono font-black text-black bg-[#FFFBEB] border-4 border-black rounded-2xl shadow-neo-sm focus:outline-none focus:ring-0 placeholder-slate-400 text-sm tracking-widest uppercase transition"
                disabled={authLoading}
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-50 border-2 border-rose-400 text-rose-600 rounded-xl text-xs font-black text-left"
              >
                ⚠️ 提示: {authError}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className={`w-full py-3.5 px-6 bg-[#6BCB77] hover:bg-[#59b865] text-white font-black rounded-2xl border-4 border-black shadow-neo-sm hover:translate-y-0.5 active:translate-y-1 transition duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-md`}
            >
              {authLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>正在检验卡密中...</span>
                </>
              ) : (
                <>
                  <span>立即解锁我的词盒 🦄</span>
                </>
              )}
            </button>
          </form>

          {/* Guidelines / Tips section */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 text-left space-y-2.5">
            <h4 className="text-xs font-black text-slate-800">💡 卡密激活及服务小规则：</h4>
            <ul className="text-[11px] text-slate-500 space-y-1.5 font-bold leading-relaxed list-disc list-inside">
              <li><strong className="text-slate-700">双平台绑定：</strong>每一张卡密均限支持 <span className="text-emerald-500 font-extrabold">2</span> 台设备登录（例如手机、电脑可以各绑定 1 台）。</li>
              <li><strong className="text-slate-700">防重复使用：</strong>一旦成功激活并写满 2 台额度，无法在第 3 台非绑定设备重复登录，需要新卡密。</li>
              <li><strong className="text-slate-700">试用与永久卡：</strong>试用卡自<span className="text-[#FF6B6B] font-extrabold">首次激活时刻起</span>拥有 <span className="text-[#FF6B6B] font-extrabold">24 小时</span>时效，到期后需更换新卡密。</li>
              <li>请保护好您的专属授权码，如有疑问请联络您的专属分发管理员 🎒</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

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
                  wordBoxes={wordBoxes}
                  onAddWord={handleAddWord}
                  onAddWords={handleAddWords}
                  onEditWord={handleEditWord}
                  onDeleteWord={handleDeleteWord}
                  onAddWordBox={handleAddWordBox}
                  onDeleteWordBox={handleDeleteWordBox}
                  onAwardStars={handleAwardStars}
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
