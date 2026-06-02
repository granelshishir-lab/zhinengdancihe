import React from "react";
import { Word } from "../types";
import { Star, Trophy, Award, BookOpen } from "lucide-react";
import { motion } from "motion/react";

interface StatsBannerProps {
  words: Word[];
  stars: number;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ words, stars }) => {
  const total = words.length;
  const mastered = words.filter(w => w.progress === 'mastered').length;
  const learning = total - mastered;
  const percentMastered = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div className="bg-[#FFEAA7] rounded-[32px] p-6 border-4 border-black shadow-neo mb-6 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Kid Greeting & Star Trophy Indicator */}
        <div className="flex items-center gap-4">
          <motion.div 
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="p-3 bg-[#FF6B6B] rounded-2xl shadow-neo-sm text-white flex items-center justify-center border-4 border-black"
          >
            <Trophy className="w-8 h-8 fill-amber-300 text-black" />
          </motion.div>
          <div>
            <h1 className="font-display font-black text-3xl text-black tracking-tight flex items-center gap-1">
              智能单词盒<span className="text-[#FF6B6B]">!</span>
            </h1>
            <p className="text-xs text-black/80 font-bold uppercase tracking-wider">我的英语探险乐园 • 收集满天星 ✨</p>
          </div>
        </div>

        {/* Stars Counter Medal */}
        <div className="bg-white rounded-2.5xl p-4 border-4 border-black flex items-center justify-between shadow-neo-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFD93D] rounded-full flex items-center justify-center border-2 border-black shadow-inner relative">
              <Star className="w-6 h-6 fill-amber-100 text-black animate-pulse" />
              <motion.span 
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-1 -right-1 flex h-3 w-3"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </motion.span>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-black uppercase">我的小星星</div>
              <div className="text-2xl font-display font-black text-black leading-none">{stars} <span className="text-xs text-slate-500 font-sans">颗</span></div>
            </div>
          </div>
          <div className="h-10 w-1 bg-black"></div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-[#6BCB77]" />
            <div>
              <div className="text-[10px] text-slate-500 font-black uppercase">荣誉称号</div>
              <div className="text-sm font-black text-[#FF6B6B]">
                {stars >= 150 ? "单词百宝王 👑" : stars >= 80 ? "词汇探险者 🎒" : stars >= 30 ? "小小练习生 📝" : "英语小新星 🌱"}
              </div>
            </div>
          </div>
        </div>

        {/* Learning Circular Tracker / Progress bar */}
        <div className="bg-white rounded-2.5xl p-4 border-4 border-black flex items-center gap-4 shadow-neo-sm justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-600 mb-2">
              <span>探索进度</span>
              <span className="text-[#4D96FF] text-xs font-display font-black">{mastered}/{total} 个已掌握</span>
            </div>
            
            {/* Playful progress bar */}
            <div className="w-full bg-[#FFFBEB] rounded-full h-4 overflow-hidden border-2 border-black p-0.5">
              <motion.div 
                className="bg-gradient-to-r from-[#6BCB77] to-[#4D96FF] h-2.5 rounded-full border-r border-black"
                initial={{ width: 0 }}
                animate={{ width: `${percentMastered}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-black">
              <BookOpen className="w-4 h-4 text-[#4D96FF]" />
              <span>探索中: <b className="text-black font-display text-sm">{learning}</b></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
