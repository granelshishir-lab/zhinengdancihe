import React, { useState, useEffect } from "react";
import { Word, MatchPair } from "../types";
import { playSpeech } from "../utils/audio";
import { Sparkles, Trophy, RotateCcw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MatchingGameProps {
  words: Word[];
  onAwardStars: (count: number) => void;
}

export const MatchingGame: React.FC<MatchingGameProps> = ({ words, onAwardStars }) => {
  const [gameMode, setGameMode] = useState<'meaning' | 'image'>('meaning');
  const [cards, setCards] = useState<MatchPair[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // holds matched wordIds
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [failFlashId, setFailFlashId] = useState<string | null>(null);

  useEffect(() => {
    startNewGame();
  }, [words, gameMode]);

  const startNewGame = () => {
    if (words.length < 3) return;

    // Pick 4 unique random words
    let pool = [...words];
    if (gameMode === 'image') {
      const wordsWithImages = pool.filter(w => w.svgCode || (w.imageType === 'upload' && w.imageUrl));
      if (wordsWithImages.length >= 3) {
        pool = wordsWithImages;
      }
    }

    const chosenWords = pool
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    const matchType = gameMode === 'meaning' ? 'translation' : 'image';

    const leftCards: MatchPair[] = chosenWords.map(w => ({
      id: `word-${w.id}`,
      text: w.word,
      type: 'word',
      matchedId: w.id
    }));

    const rightCards: MatchPair[] = chosenWords.map(w => ({
      id: `match-${w.id}`,
      text: gameMode === 'meaning' ? w.translation : w.word,
      type: matchType,
      matchedId: w.id,
      svgCode: w.svgCode,
      imageUrl: w.imageUrl,
      imageType: w.imageType
    }));

    // Shuffle each independently or combined. Shuffling them combined creates a fun, flexible jigsaw board.
    const shuffledDeck = [...leftCards, ...rightCards].sort(() => Math.random() - 0.5);

    setCards(shuffledDeck);
    setSelectedId(null);
    setMatchedPairs([]);
    setIsFinished(false);
    setScore(0);
  };

  const truncateText = (str: string, max: number) => {
    return str.length > max ? str.substring(0, max) + "..." : str;
  };

  if (words.length < 3) {
    return (
      <div className="bg-white rounded-[32px] p-8 text-center text-black shadow-neo border-4 border-black font-sans max-w-xl mx-auto my-8">
        <AlertCircle className="w-16 h-16 text-[#FF6B6B] mx-auto mb-4" />
        <h3 className="font-display text-xl font-black text-black">词库中的卡片太少啦</h3>
        <p className="text-sm font-bold text-slate-700 mt-2">词义对碰游戏需要<b>至少由 3 个单词</b>组成哦。</p>
        <p className="text-xs text-slate-500 font-medium mt-1">快去“我的词箱”添加几个有趣的新单词吧！🌱</p>
      </div>
    );
  }

  const handleCardClick = (clickedCard: MatchPair) => {
    // If already matched, ignore
    if (matchedPairs.includes(clickedCard.matchedId)) return;

    // If no card was selected yet
    if (selectedId === null) {
      setSelectedId(clickedCard.id);
      
      // If it's a word card, read it
      if (clickedCard.type === 'word') {
        playSpeech(clickedCard.text, { rate: 1.0 });
      }
      return;
    }

    // Double clicking same card triggers deselect
    if (selectedId === clickedCard.id) {
      setSelectedId(null);
      return;
    }

    const firstCard = cards.find(c => c.id === selectedId);

    if (!firstCard) {
      setSelectedId(null);
      return;
    }

    // Check if they are of different types and share the same matchedId (success!)
    if (firstCard.type !== clickedCard.type && firstCard.matchedId === clickedCard.matchedId) {
      // Find matching word
      const wordObj = words.find(w => w.id === clickedCard.matchedId);
      if (wordObj) {
        playSpeech(`Perfect! ${wordObj.word}`, { rate: 1.0 });
      }

      setMatchedPairs(prev => [...prev, clickedCard.matchedId]);
      setSelectedId(null);
      onAwardStars(10); // Reward 10 stars for every matching pair

      // Check if that was the final match
      if (matchedPairs.length + 1 === 4) {
        setIsFinished(true);
      }
    } else {
      // Wrong pairing trigger flash
      setFailFlashId(clickedCard.id);
      setSelectedId(clickedCard.id); // set current select
      playSpeech("Try again!", { rate: 1.1 });
      setTimeout(() => setFailFlashId(null), 500);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 border-4 border-black shadow-neo max-w-2xl mx-auto font-sans text-center">
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 max-w-lg mx-auto">
        <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-1.5">
          <span>连线消除 • {gameMode === 'meaning' ? "词义对碰" : "词图对碰"} 🧩</span>
        </h3>
        <button
          onClick={startNewGame}
          className="p-1 px-4 bg-[#FF6B6B] hover:bg-[#fa5555] text-white hover:text-[#FFFBEB] text-xs rounded-full cursor-pointer flex items-center gap-1 font-black shadow-neo-sm border-2 border-black transition hover:translate-y-0.5 active:translate-y-1"
        >
          <RotateCcw className="w-3.5 h-3.5 text-white stroke-[2.5px]" /> 换一局
        </button>
      </div>

      {/* Playful Neo-Brutalist Mode Switcher */}
      <div className="flex justify-center items-center gap-2 mb-6 max-w-xs mx-auto bg-slate-100 p-1.5 rounded-2xl border-2 border-black shadow-neo-sm">
        <button
          onClick={() => setGameMode('meaning')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            gameMode === 'meaning'
              ? 'bg-[#FFD93D] border-2 border-black text-black shadow-neo-sm'
              : 'text-slate-600 hover:text-black hover:bg-slate-200/50'
          }`}
        >
          词义对碰 🧩
        </button>
        <button
          onClick={() => setGameMode('image')}
          className={`flex-1 py-1 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            gameMode === 'image'
              ? 'bg-[#FFD93D] border-2 border-black text-black shadow-neo-sm'
              : 'text-slate-600 hover:text-black hover:bg-slate-200/50'
          }`}
        >
          词图对碰 🖼️
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isFinished ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FFFBEB] rounded-[32px] p-8 py-10 shadow-neo border-4 border-black max-w-md mx-auto my-4 text-center"
          >
            <div className="w-20 h-20 bg-white border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-neo-sm">
              <Trophy className="w-10 h-10 text-[#FFD93D] fill-[#FFD93D] stroke-[1.5px]" />
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-1 -right-1 bg-[#FF6B6B] border-2 border-black p-1 rounded-full text-white"
              >
                <Sparkles className="w-4 h-4 fill-white text-white" />
              </motion.div>
            </div>

            <h2 className="font-display text-3xl font-black text-black">对碰大成功！ 🌱</h2>
            <p className="text-slate-800 text-sm font-bold mt-2">
              你太棒了！所有的{gameMode === 'meaning' ? "单词和释义" : "单词和插画"}都准确连对啦！荣誉星星已加满！
            </p>

            <button
              onClick={startNewGame}
              className="mt-8 px-8 py-3 bg-[#6BCB77] hover:bg-[#5bbb66] text-white font-display text-base font-black rounded-2xl border-4 border-black shadow-neo cursor-pointer transition flex items-center gap-2 mx-auto active:translate-y-1"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5px]" />
              <span>重新开始</span>
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            {cards.map((card) => {
              const isMatched = matchedPairs.includes(card.matchedId);
              const isSelected = selectedId === card.id;
              const isFail = failFlashId === card.id;

              let cardStyle = "bg-white border-4 border-black hover:bg-[#FFFBEB] text-black shadow-neo-sm cursor-pointer hover:translate-y-0.5";
              if (isMatched) {
                cardStyle = "bg-[#6BCB77] border-4 border-black text-white font-black opacity-60 scale-95 shadow-inner cursor-default pointer-events-none";
              } else if (isSelected) {
                cardStyle = "bg-[#FFD93D] border-4 border-black text-black font-black scale-[1.03] shadow-neo-sm cursor-pointer";
              } else if (isFail) {
                cardStyle = "bg-[#FF6B6B] border-4 border-black text-white font-black scale-95 cursor-pointer antialiased animate-shake";
              }

              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`p-4 h-24 rounded-2.5xl flex items-center justify-center text-center transition-all duration-200 select-none ${cardStyle}`}
                  whileTap={!isMatched ? { scale: 0.95 } : undefined}
                >
                  <div className="flex flex-col justify-center items-center h-full w-full">
                    {card.type === 'image' ? (
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border-2 border-black overflow-hidden shadow-neo-sm shrink-0">
                        {card.imageType === 'upload' && card.imageUrl ? (
                          <img 
                            src={card.imageUrl} 
                            alt="Situational" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : card.svgCode ? (
                          <div 
                            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full p-0.5" 
                            dangerouslySetInnerHTML={{ __html: card.svgCode }} 
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-bold p-1">暂无</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-display font-black tracking-wide leading-relaxed block overflow-hidden line-clamp-2">
                        {card.text}
                      </span>
                    )}

                    {card.type === 'word' && !isMatched && (
                      <span className="text-[9px] text-white font-black bg-[#4D96FF] px-1.5 py-0.5 rounded-md border border-black mt-1.5 inline-block uppercase tracking-wider">英文词</span>
                    )}
                    {card.type === 'translation' && !isMatched && (
                      <span className="text-[9px] text-black font-black bg-[#FFD93D] px-1.5 py-0.5 rounded-md border border-black mt-1.5 inline-block uppercase tracking-wider">词义</span>
                    )}
                    {card.type === 'image' && !isMatched && (
                      <span className="text-[9px] text-white font-black bg-[#9B72CF] px-1.5 py-0.5 rounded-md border border-black mt-1.5 inline-block uppercase tracking-wider">插图</span>
                    )}
                    {isMatched && (
                      <span className="text-[9px] text-white font-black bg-[#6BCB77] px-1.5 py-0.5 rounded-md border border-black mt-1.5 inline-block uppercase tracking-wider">已消除 ✓</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <div className="text-slate-700 text-xs mt-6 font-extrabold bg-[#FFFBEB] p-2.5 rounded-xl border-2 border-black border-dashed">
        💡 指引：点击一个卡片，再点击和它配对的卡片。<b>词义对碰</b>需匹配单词和释义，<b>词图对碰</b>需匹配单词及对应彩色形象图。消除成功可收获小星星奖励！⭐
      </div>
    </div>
  );
};
