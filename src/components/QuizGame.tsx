import React, { useState, useEffect } from "react";
import { Word, QuizQuestion } from "../types";
import { playSpeech } from "../utils/audio";
import { CheckCircle2, XCircle, Volume2, Sparkles, RefreshCw, Trophy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuizGameProps {
  words: Word[];
  onAwardStars: (count: number) => void;
}

export const QuizGame: React.FC<QuizGameProps> = ({ words, onAwardStars }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizMode, setQuizMode] = useState<'clue' | 'cloze'>('clue');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Wrong answers tracking states
  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);
  const [isWrongPracticeMode, setIsWrongPracticeMode] = useState(false);

  // Cloze illustration visibility & General image zoom utilities
  const [isClozeImageRevealed, setIsClozeImageRevealed] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ type: 'svg' | 'url'; value: string } | null>(null);

  // Reset cloze reveal state when current index or mode changes
  useEffect(() => {
    setIsClozeImageRevealed(false);
  }, [currentIndex, quizMode]);

  // Initialize questions
  useEffect(() => {
    generateQuiz();
  }, [words, quizMode]);

  const generateQuiz = (modeParam?: 'clue' | 'cloze') => {
    const targetMode = modeParam || quizMode;
    if (words.length < 2) {
      setQuestions([]);
      return;
    }

    // Shuffle and pick up to 5 words for this quiz round
    const pool = [...words].sort(() => Math.random() - 0.5).slice(0, 5);
    const newQuestions: QuizQuestion[] = pool.map((item) => {
      // Pick 3 distractors
      const distractors = words
        .filter((w) => w.id !== item.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.word);

      // Distractors must be at least 3, if not enough words, fill with random ones
      while (distractors.length < 3) {
        distractors.push("learning", "word", "study", "friend", "happy")[distractors.length];
      }

      // Mix options
      const options = [item.word, ...distractors].sort(() => Math.random() - 0.5);

      return {
        id: `q-${item.id}-${Math.random()}`,
        wordId: item.id,
        correctWord: item.word,
        definition: item.definition,
        example: item.example,
        svgCode: item.svgCode,
        imageUrl: item.imageUrl,
        options,
      };
    });

    setQuestions(newQuestions);
    setWrongQuestions([]); // Reset mistake collection
    setIsWrongPracticeMode(false); // Clear practice flag
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setIsFinished(false);
  };

  const startWrongPractice = () => {
    if (wrongQuestions.length === 0) return;

    // Reshuffle options for the mistakes to make it fresh
    const practiceQuestions = wrongQuestions.map((q) => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    }));

    setQuestions(practiceQuestions);
    setWrongQuestions([]); // Clear fresh list for current practice round
    setIsWrongPracticeMode(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setIsFinished(false);
  };

  // Turn word placeholder matching in example
  const makeClozeSentence = (exampleStr: string, wordStr: string) => {
    if (!exampleStr) return "Look at this _____ on the ground!";
    const escaped = wordStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    let clozeText = exampleStr.replace(regex, '_____');
    if (clozeText === exampleStr) {
      // Fallback substring matcher if boundary test fails
      clozeText = exampleStr.replace(new RegExp(escaped, 'gi'), '_____');
    }
    return clozeText;
  };

  if (words.length < 2) {
    return (
      <div className="bg-white rounded-[32px] p-8 text-center text-black shadow-neo border-4 border-black font-sans max-w-xl mx-auto my-8">
        <Sparkles className="w-16 h-16 text-[#FFD93D] mx-auto mb-4 animate-spin" />
        <h3 className="font-display text-xl font-black text-black">选项材料不足哦</h3>
        <p className="text-sm font-bold text-slate-700 mt-2">玩这个情景选择题，词库里需要<b>至少有 2 个单词</b>哦！</p>
        <p className="text-xs text-slate-500 font-bold mt-1">快去“我的词箱”里多添加或者导入几个新单词吧！🎒</p>
      </div>
    );
  }

  if (questions.length === 0) return null;

  if (isFinished) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#FFFBEB] rounded-[32px] p-8 text-center shadow-neo border-4 border-black font-sans max-w-xl mx-auto my-8"
      >
        <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-neo-sm">
          <Trophy className="w-12 h-12 text-[#FFD93D] fill-[#FFD93D] stroke-[1.5px]" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 bg-[#FF6B6B] p-1.5 rounded-full border-2 border-black text-white"
          >
            <Sparkles className="w-4 h-4 text-white" />
          </motion.div>
        </div>

        <h2 className="font-display text-3xl font-black text-black">
          {isWrongPracticeMode ? "错题消灭大捷！ 🎯" : "训练大通关！ 🌟"}
        </h2>
        <p className="text-slate-800 mt-2 font-bold text-base">
          {isWrongPracticeMode 
            ? "你顺利完成了错题重练，扫清了所有盲区哦！" 
            : `你完成了测试，答对数: ${correctCount} / ${questions.length}`}
        </p>

        {/* Dynamic cheering speech */}
        <div className="mt-4 inline-block px-4 py-2 bg-[#6BCB77] border-2 border-black rounded-xl text-sm text-white font-extrabold shadow-neo-sm">
          {correctCount === questions.length ? "哇！大满贯！你真是个绝顶聪明的小天才！🎯" : "做得很好！多做练习，错题会全部变成你的拿手词哦！💪"}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => generateQuiz()}
            className="px-6 py-3 bg-[#6BCB77] hover:bg-[#5bbb66] text-white rounded-2xl font-black border-4 border-black shadow-neo flex items-center gap-2 transition hover:translate-y-0.5 active:translate-y-1 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.5px]" />
            <span>再玩一次</span>
          </button>
          
          {wrongQuestions.length > 0 && (
            <button
              onClick={startWrongPractice}
              className="px-6 py-3 bg-[#FF6B6B] hover:bg-[#eb5a5a] text-white rounded-2xl font-black border-4 border-black shadow-neo flex items-center gap-2 transition hover:translate-y-0.5 active:translate-y-1 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5px]" />
              <span>错题重练 ({wrongQuestions.length})</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuestion.correctWord;
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      onAwardStars(10); // Award 10 stars for correct answer
      playSpeech("Correct! Great job!", { rate: 1.0 });
    } else {
      playSpeech("Oops, look closer!", { rate: 0.95 });
      // Add word index to wrong answers stash
      if (!wrongQuestions.some((q) => q.wordId === currentQuestion.wordId)) {
        setWrongQuestions((prev) => [...prev, currentQuestion]);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 border-4 border-black shadow-neo max-w-2xl mx-auto font-sans">
      
      {/* Quiz Mode Selector tab group at the very top */}
      <div className="bg-[#FFFBEB] p-1.5 rounded-2xl border-4 border-black flex items-center justify-center gap-1.5 mb-6 max-w-sm mx-auto shadow-neo-sm">
        <button
          onClick={() => {
            setQuizMode('clue');
            generateQuiz('clue');
          }}
          className={`flex-1 py-1 px-3 text-xs font-black rounded-lg border-2 transition-all cursor-pointer ${
            quizMode === 'clue' 
              ? 'bg-[#FF6B6B] border-black text-white' 
              : 'border-transparent text-slate-700 hover:bg-black/5'
          }`}
        >
          📷 情景选择题
        </button>
        <button
          onClick={() => {
            setQuizMode('cloze');
            generateQuiz('cloze');
          }}
          className={`flex-1 py-1 px-3 text-xs font-black rounded-lg border-2 transition-all cursor-pointer ${
            quizMode === 'cloze' 
              ? 'bg-[#4D96FF] border-black text-white' 
              : 'border-transparent text-slate-700 hover:bg-black/5'
          }`}
        >
          📝 选词填空题
        </button>
      </div>

      {/* Quiz Progress Header */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-black text-black uppercase tracking-widest bg-[#FFD93D] border-2 border-black px-4 py-1.5 rounded-full shadow-neo-sm">
          {isWrongPracticeMode ? "🔧 错题重做中: " : "题目 "}{currentIndex + 1} / {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white bg-[#6BCB77] border-2 border-black px-4 py-1.5 rounded-full shadow-neo-sm">
            答对数: {correctCount}
          </span>
          <button 
            onClick={() => generateQuiz()} 
            title="重新生成题目"
            className="p-1.5 px-3.5 bg-[#FF6B6B] hover:bg-[#eb5a5a] text-white text-xs rounded-full cursor-pointer flex items-center gap-1 font-extrabold shadow-neo-sm border-2 border-black transition hover:translate-y-0.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white stroke-[2.5px]" /> 换一组
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Pictures Representation (Visual Situation Layout) */}
        <div className="md:col-span-5 flex flex-col justify-center items-center">
          <div className="w-44 h-44 bg-white rounded-3xl border-4 border-black p-2 shadow-neo-sm overflow-hidden flex items-center justify-center relative">
            {quizMode === 'cloze' && !isClozeImageRevealed ? (
              <button
                type="button"
                onClick={() => setIsClozeImageRevealed(true)}
                className="w-full h-full bg-[#FFFBEB] hover:bg-[#FFF2CC] flex flex-col items-center justify-center border-2 border-dashed border-black rounded-2xl group transition duration-150 cursor-pointer p-3 animate-pulse"
                title="点击显示情景插图"
              >
                <span className="text-3xl mb-1.5 group-hover:scale-110 transition duration-150">🖼️</span>
                <span className="text-[11px] font-black text-black">点击显现插图线索</span>
                <span className="text-[9px] font-bold text-slate-500 mt-0.5">Show Illustration</span>
              </button>
            ) : (
              <>
                {/* Draw custom SVG code or display picture URL */}
                {currentQuestion.imageUrl ? (
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Scene" 
                    className="w-full h-full object-cover rounded-2xl cursor-zoom-in hover:scale-105 transition duration-200"
                    referrerPolicy="no-referrer"
                    title="点击放大观察"
                    onClick={() => setZoomImage({ type: 'url', value: currentQuestion.imageUrl! })}
                  />
                ) : currentQuestion.svgCode ? (
                  <div 
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:rounded-2xl shrink-0 cursor-zoom-in hover:scale-105 transition duration-200" 
                    dangerouslySetInnerHTML={{ __html: currentQuestion.svgCode }} 
                    title="点击放大观察"
                    onClick={() => setZoomImage({ type: 'svg', value: currentQuestion.svgCode! })}
                  />
                ) : (
                  <div className="text-xs text-slate-400 font-bold p-4 text-center">正在加载精致情景...</div>
                )}
              </>
            )}

            {/* Glowing stars animation anchor */}
            {isAnswered && selectedOption === currentQuestion.correctWord && (
              <motion.div 
                animate={{ scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.6 }}
                className="absolute top-2 right-2 bg-[#FFD93D] p-1.5 rounded-full border-2 border-black text-white shadow-md z-10"
              >
                <Sparkles className="w-5 h-5 fill-white text-white" />
              </motion.div>
            )}
          </div>
          <p className="text-xs text-slate-700 mt-3 font-extrabold bg-slate-100 border-2 border-black px-2 py-0.5 rounded-md shadow-neo-sm mt-4">
            {quizMode === 'cloze' && !isClozeImageRevealed 
              ? "点击上方盒子显现线索插图哦 🔍" 
              : "观察/点击情景插图辅助作答 🔬"}
          </p>
        </div>

        {/* Right Side: Simple Clue Bubble & 4 Choices */}
        <div className="md:col-span-7 flex flex-col gap-5">
          
          {/* Audio read-aloud button wrapped in Definition Bubble */}
          <div className="bg-[#4D96FF]/10 rounded-2xl p-4 border-2 border-black relative shadow-neo-sm text-left">
            <button
              onClick={() => {
                const speechText = quizMode === 'cloze' ? currentQuestion.example : currentQuestion.definition;
                playSpeech(speechText, { rate: 0.85 });
              }}
              className="absolute top-3 right-3 p-1.5 bg-white hover:bg-slate-100 text-black border-2 border-black rounded-lg shadow-neo-sm transition overflow-hidden cursor-pointer"
              title="大声朗读"
            >
              <Volume2 className="w-4 h-4 stroke-[2px]" />
            </button>
            {quizMode === 'cloze' ? (
              <>
                <p className="text-[10px] text-[#FF6B6B] font-extrabold uppercase tracking-wider mb-1 block">选词填空 (Fill in the Blank)</p>
                <p className="font-sans font-black text-black text-sm leading-relaxed pr-8">
                  "{makeClozeSentence(currentQuestion.example, currentQuestion.correctWord)}"
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-2 bg-white/60 p-1.5 rounded border border-black/5 inline-block">提示: {currentQuestion.definition}</p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-[#FF6B6B] font-extrabold uppercase tracking-wider mb-1 block">情景线索 (Simple Clue)</p>
                <p className="font-sans font-bold text-black text-sm leading-relaxed pr-8">
                  "{currentQuestion.definition}"
                </p>
              </>
            )}
          </div>

          {/* Option Badges */}
          <div className="flex flex-col gap-3 text-left">
            <p className="text-xs text-slate-600 font-black">选择最适合当前语境的单词：</p>
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt;
              const isCorrectTarget = opt === currentQuestion.correctWord;
              
              let btnStyle = "bg-white border-4 border-black hover:bg-[#FFFBEB] text-black shadow-neo-sm hover:translate-y-0.5";
              let iconElement = null;

              if (isAnswered) {
                if (isCorrectTarget) {
                  // Beautiful green check on correction
                  btnStyle = "bg-[#6BCB77] border-4 border-black text-white font-black shadow-neo-sm cursor-default";
                  iconElement = <CheckCircle2 className="w-5 h-5 text-white stroke-[3px]" />;
                } else if (isSelected) {
                  // Red cross on user wrong choice
                  btnStyle = "bg-[#FF6B6B] border-4 border-black text-white font-black shadow-neo-sm cursor-default";
                  iconElement = <XCircle className="w-5 h-5 text-white stroke-[3px]" />;
                } else {
                  btnStyle = "bg-slate-100 border-4 border-black text-slate-400 opacity-50 cursor-default";
                }
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={isAnswered}
                  className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-between text-left transition font-display text-lg font-black select-none border-4 border-black cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {iconElement}
                </button>
              );
            })}
          </div>

          {/* Next Button Animation */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-2"
              >
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 bg-[#4D96FF] hover:bg-[#3d83ec] text-white font-display text-lg font-black rounded-2xl border-4 border-black flex items-center justify-center gap-2 shadow-neo transition hover:translate-y-0.5 active:translate-y-1 cursor-pointer"
                >
                  CONTINUE 下一题
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white border-4 border-black p-4 sm:p-6 rounded-[32px] shadow-neo max-w-lg w-full relative"
          >
            {/* Target Content */}
            <div className="w-full h-80 sm:h-96 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-black p-2 relative shadow-inner">
              {zoomImage.type === 'url' ? (
                <img 
                  src={zoomImage.value} 
                  alt="Zoomed Scene" 
                  className="w-full h-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:rounded-xl" 
                  dangerouslySetInnerHTML={{ __html: zoomImage.value }} 
                />
              )}
            </div>
            
            {/* Close Bar */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs font-black text-slate-500">✨ 点击空白处也可以关闭哦</p>
              <button
                onClick={() => setZoomImage(null)}
                className="px-4 py-2 bg-[#FF6B6B] text-white hover:bg-[#eb5a5a] font-black rounded-xl border-2 border-black shadow-neo-sm active:translate-y-0.5 transition cursor-pointer text-xs"
              >
                关闭大图
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
