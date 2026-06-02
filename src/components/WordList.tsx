import React, { useState, useRef } from "react";
import { Word } from "../types";
import { playSpeech } from "../utils/audio";
import { 
  Plus, 
  Upload, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Search, 
  Languages, 
  BookOpen, 
  Quote, 
  Volume2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  FileText,
  X,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WordListProps {
  words: Word[];
  onAddWord: (wordObj: Word) => void;
  onAddWords: (newWords: Word[]) => void;
  onEditWord: (wordId: string, updated: Partial<Word>) => void;
  onDeleteWord: (wordId: string) => void;
}

export const WordList: React.FC<WordListProps> = ({ 
  words, 
  onAddWord, 
  onAddWords,
  onEditWord, 
  onDeleteWord 
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [progressFilter, setProgressFilter] = useState<'all' | 'learning' | 'mastered' | 'favorite'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dialog modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);

  // Single word form states
  const [newWord, setNewWord] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [syllables, setSyllables] = useState("");
  const [translation, setTranslation] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [imageType, setImageType] = useState<'upload' | 'svg' | 'default'>('default');
  const [svgCode, setSvgCode] = useState("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  
  // Loading and Error Status
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // File drag ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Batch import states
  const [batchRawText, setBatchRawText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null); // 'idle', 'processing', 'completed'
  const [importQueue, setImportQueue] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importingWord, setImportingWord] = useState("");

  // Speech helper
  const handleSpeak = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSpeech(text, { rate: 0.9 });
  };

  // Convert uploaded image to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageBase64(reader.result as string);
        setImageType('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Drop event for custom drag upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImageBase64(reader.result as string);
        setImageType('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  // Automated dot splitter helper for manual words
  const handleWordFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewWord(val);
    if (!useAI && syllables === "") {
      // Prompt auto-dot placeholders
      setSyllables(approximateSyllables(val));
    }
  };

  const approximateSyllables = (word: string): string => {
    const clean = word.toLowerCase().trim();
    if (!clean) return "";
    const res = clean.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*(?![aeiouy]))?/gi);
    if (!res || res.length <= 1) return clean;
    return res.join("•");
  };

  // Submit standard single add form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanWord = newWord.trim();
    if (!cleanWord) {
      setFormError("请输入具体单词。");
      return;
    }

    setIsLoading(true);

    try {
      let finalSyllables = approximateSyllables(cleanWord);
      let finalTranslation = translation.trim() || cleanWord;
      let finalDefinition = `Meaning of ${cleanWord}.`;
      let finalExample = `This is a sentence with ${cleanWord}.`;
      let finalSvgCode: string | undefined = undefined;

      try {
        const response = await fetch("/api/word/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: cleanWord }),
        });

        if (response.ok) {
          const data = await response.json();
          finalSyllables = data.syllables || finalSyllables;
          finalTranslation = translation.trim() || data.translation || finalTranslation;
          finalDefinition = data.definition || finalDefinition;
          finalExample = data.example || finalExample;
          finalSvgCode = data.svgIllustration || undefined;
        }
      } catch (err) {
        console.warn("AI analyzer error, using default fallback parameters.", err);
      }

      const wordObj: Word = {
        id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        word: cleanWord.toLowerCase(),
        syllables: finalSyllables,
        translation: finalTranslation,
        definition: finalDefinition,
        example: finalExample,
        imageType: uploadedImageBase64 ? 'upload' : (finalSvgCode ? 'svg' : 'default'),
        svgCode: finalSvgCode,
        imageUrl: uploadedImageBase64 || undefined,
        progress: 'learning',
        createdAt: Date.now()
      };

      onAddWord(wordObj);

      // Reset Single Add States
      setNewWord("");
      setTranslation("");
      setUploadedImageBase64(null);
      setIsAddOpen(false);
    } catch (err: any) {
      setFormError(err.message || "由于服务器网络原因遇到错误，请重新尝试。");
    } finally {
      setIsLoading(false);
    }
  };

  // Handles Sequential Queue Batch Import
  const handleBatchImport = async () => {
    // Collect words from raw string, splitting by comma, spaces, newlines, semicolons, etc.
    const rawWords = batchRawText
      .split(/[,\n;，\s\r\t|；，、・（）【】\[\]\\/]+/g)
      .map(w => w.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "")) // clean surrounding numbers or Chinese characters/brackets from margins
      .filter(w => w.length > 0 && /[a-zA-Z]/.test(w));

    if (rawWords.length === 0) {
      alert("没有识别到合法的英文字符单词，请检查拼写哦。");
      return;
    }

    setImportStatus('processing');
    setImportQueue(rawWords);
    setImportProgress(0);

    const importedWords: Word[] = [];

    for (let i = 0; i < rawWords.length; i++) {
      const targetWord = rawWords[i].toLowerCase();
      setImportingWord(targetWord);

      try {
        const response = await fetch("/api/word/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word: targetWord }),
        });

        if (response.ok) {
          const data = await response.json();
          const wordObj: Word = {
            id: `word-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            word: targetWord,
            syllables: data.syllables || targetWord,
            translation: data.translation || "导入单词",
            definition: data.definition || `English explanation of ${targetWord}`,
            example: data.example || `An exciting example of ${targetWord}`,
            imageType: 'svg',
            svgCode: data.svgIllustration || undefined,
            progress: 'learning',
            createdAt: Date.now() + i // slight stagger to keep order
          };
          importedWords.push(wordObj);
        } else {
          // Sync fallback
          const targetSyll = approximateSyllables(targetWord);
          const wordObj: Word = {
            id: `word-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            word: targetWord,
            syllables: targetSyll,
            translation: targetWord,
            definition: `Meaning of ${targetWord}.`,
            example: `This is an example with ${targetWord}.`,
            imageType: 'default',
            progress: 'learning',
            createdAt: Date.now() + i
          };
          importedWords.push(wordObj);
        }
      } catch (e) {
        console.error("Batch import item failure for word: " + targetWord, e);
        // Fallback split append to guarantee continuation
        const targetSyll = approximateSyllables(targetWord);
        const wordObj: Word = {
          id: `word-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          word: targetWord,
          syllables: targetSyll,
          translation: `导入卡词`,
          definition: `Meaning of ${targetWord}.`,
          example: `Example with ${targetWord}.`,
          imageType: 'default',
          progress: 'learning',
          createdAt: Date.now() + i
        };
        importedWords.push(wordObj);
      }

      setImportProgress(Math.round(((i + 1) / rawWords.length) * 100));
    }

    if (importedWords.length > 0) {
      onAddWords(importedWords);
    }

    setImportStatus('completed');
    setBatchRawText("");
  };

  // Close Import Dialog Reset States
  const closeImportDialog = () => {
    setIsImportOpen(false);
    setImportStatus(null);
    setImportQueue([]);
    setImportProgress(0);
    setImportingWord("");
  };

  // Filtered Cards Array
  const filteredWords = words
    .filter(w => {
      const matchesSearch = w.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            w.translation.includes(searchTerm);
      
      let matchesProgress = true;
      if (progressFilter === 'favorite') {
        matchesProgress = !!w.isFavorite;
      } else if (progressFilter !== 'all') {
        matchesProgress = w.progress === progressFilter;
      }
      return matchesSearch && matchesProgress;
    })
    .sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="font-sans">
      
      {/* Search Input and action controller toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FEF2F2] p-5 rounded-[24px] border-4 border-black mb-8 shadow-neo">
        
        {/* Search Input block */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-black" />
          <input
            type="text"
            placeholder="搜索我的卡通单词盒..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border-2 border-black rounded-xl focus:outline-none focus:ring-0 shadow-neo-sm font-bold text-black"
          />
        </div>

        {/* Filters and action toggles */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Status filters toggler */}
          <div className="bg-white p-1 rounded-xl flex items-center gap-1 border-2 border-black shadow-neo-sm">
            <button
              onClick={() => setProgressFilter('all')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer select-none border-2 ${
                progressFilter === 'all' 
                  ? 'bg-[#FFD93D] border-black text-black' 
                  : 'text-slate-600 border-transparent hover:bg-black/5'
              }`}
            >
              全部 ({words.length})
            </button>
            <button
              onClick={() => setProgressFilter('learning')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer select-none border-2 ${
                progressFilter === 'learning' 
                  ? 'bg-[#4D96FF] border-black text-white' 
                  : 'text-slate-600 border-transparent hover:bg-black/5'
              }`}
            >
              学习中 ({words.filter(w=>w.progress==='learning').length})
            </button>
            <button
              onClick={() => setProgressFilter('mastered')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer select-none border-2 ${
                progressFilter === 'mastered' 
                  ? 'bg-[#6BCB77] border-black text-white' 
                  : 'text-slate-600 border-transparent hover:bg-black/5'
              }`}
            >
              已掌握 ({words.filter(w=>w.progress==='mastered').length})
            </button>
            <button
              onClick={() => setProgressFilter('favorite')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer select-none border-2 ${
                progressFilter === 'favorite' 
                  ? 'bg-[#FF9F43] border-black text-white' 
                  : 'text-slate-600 border-transparent hover:bg-black/5'
              }`}
            >
              ⭐ 已收藏 ({words.filter(w=>w.isFavorite).length})
            </button>
          </div>

          <div className="flex gap-2.5">
            {/* Quick single Add button */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-[#6BCB77] text-white border-2 border-black rounded-xl text-xs font-black shadow-neo-sm hover:translate-y-0.5 hover:shadow-neo-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white stroke-[3px]" /> <span>造词条</span>
            </button>

            {/* Batch Import button */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 bg-[#FFD93D] text-black border-2 border-black rounded-xl text-xs font-black shadow-neo-sm hover:translate-y-0.5 hover:shadow-neo-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-black stroke-[2.5px]" /> <span>批量导入</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Vocabulary Cards Grid */}
      {filteredWords.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center text-black shadow-neo border-4 border-black max-w-xl mx-auto my-8">
          <BookOpen className="w-16 h-16 text-[#4D96FF] mx-auto mb-4" />
          <h3 className="font-display text-xl font-black text-black">空空如也，怎么搜索也是光秃秃的呢</h3>
          <p className="text-sm font-bold mt-1 text-slate-700">没有符合过滤条件的单词小卡片，快添加或重新搜索吧！✨</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWords.map((word) => (
            <motion.div
              layoutId={word.id}
              key={word.id}
              className="bg-white rounded-[32px] p-5 border-4 border-black shadow-neo hover-slide transition-all flex flex-col justify-between"
            >
              {/* Card top bar */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-3xl font-display font-black text-black capitalize leading-none tracking-wide">
                      {word.word}
                    </h3>
                    <button
                      onClick={(e) => handleSpeak(word.word, e)}
                      className="p-1 px-1.5 bg-[#4D96FF] text-white hover:bg-[#397de0] border-2 border-black rounded-lg shadow-neo-sm hover:translate-y-0.5 active:translate-y-1 transition duration-150 cursor-pointer flex items-center justify-center"
                      title="单词发音"
                    >
                      <Volume2 className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditWord(word.id, { isFavorite: !word.isFavorite });
                      }}
                      className="p-1 hover:scale-115 transition text-[#FFD93D] flex items-center justify-center cursor-pointer"
                      title={word.isFavorite ? "取消收藏" : "加入收藏"}
                    >
                      <Star className={`w-5 h-5 stroke-black stroke-[3px] ${word.isFavorite ? 'fill-[#FFD93D]' : 'fill-none'}`} />
                    </button>
                  </div>
                  {/* Syllable Dots display */}
                  <span className="text-xs font-black text-[#FF6B6B] font-mono tracking-wider bg-[#FFFBEB] px-2 py-0.5 rounded-md border-2 border-black inline-block mt-1">
                    {word.syllables}
                  </span>
                </div>
                
                {/* State Progress Selector controller */}
                <span 
                  onClick={() => onEditWord(word.id, { progress: word.progress === 'mastered' ? 'learning' : 'mastered' })}
                  className={`px-3 py-1 rounded-full text-xs font-black cursor-pointer select-none border-2 transition shadow-neo-sm ${
                    word.progress === 'mastered' 
                      ? 'bg-[#6BCB77] text-white border-black hover:bg-[#5bbf67]' 
                      : 'bg-[#FFD93D] text-black border-black hover:bg-[#ecc32c]'
                  }`}
                >
                  {word.progress === 'mastered' ? '已掌握 ✓' : '学习中'}
                </span>
              </div>

              {/* Cartoon image / user uploaded drawing in card body */}
              <div className="flex items-start gap-4 my-2.5 bg-[#FFFBEB] p-3 rounded-2xl border-2 border-black">
                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border-2 border-black p-1 shrink-0 overflow-hidden text-center justify-self-center self-center shadow-neo-sm">
                  {word.imageType === 'upload' && word.imageUrl ? (
                    <img 
                      src={word.imageUrl} 
                      alt="Local situational" 
                      className="w-full h-full object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : word.svgCode ? (
                    <div 
                      className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:rounded-lg shrink-0" 
                      dangerouslySetInnerHTML={{ __html: word.svgCode }} 
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-lg text-[10px] text-slate-400 font-bold p-1">暂无插图</div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-center select-none text-left min-h-[80px]">
                  <div className="flex items-center gap-1 text-black font-black mb-1">
                    <Languages className="w-4 h-4 text-[#FF6B6B] stroke-[2.5px]" />
                    <span className="text-base font-black font-display">{word.translation}</span>
                  </div>
                  <div className="flex items-start gap-0.5 group">
                    <button 
                      onClick={(e) => handleSpeak(word.definition, e)}
                      className="p-1 text-black hover:text-[#4D96FF] transition shrink-0 cursor-pointer"
                      title="发音"
                    >
                      <Volume2 className="w-3.5 h-3.5 stroke-[2.5px]" />
                    </button>
                    <p className="text-xs text-slate-700 font-bold leading-normal">
                      {word.definition}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage Example sentence block with speak play */}
              <div className="bg-[#4D96FF]/10 p-2.5 rounded-xl border-2 border-dashed border-black flex items-start gap-2 mb-4 leading-relaxed hover:bg-slate-50 transition">
                <button
                  onClick={(e) => handleSpeak(word.example, e)}
                  className="p-1 text-[#4D96FF] hover:text-black transition shrink-0 mt-0.5 cursor-pointer"
                  title="句子供读"
                >
                  <Volume2 className="w-4 h-4 stroke-[2.5px]" />
                </button>
                <div className="text-left select-none leading-none">
                  <span className="text-[10px] text-[#FF6B6B] uppercase tracking-wider font-extrabold block mb-0.5">例句 / Situation</span>
                  <p className="text-xs text-black italic font-bold leading-normal">
                    "{word.example}"
                  </p>
                </div>
              </div>

              {/* Foot toolbar controls */}
              <div className="flex justify-between items-center border-t-2 border-dashed border-black pt-3">
                <span className="text-[10px] text-slate-600 font-bold font-mono">
                  {new Date(word.createdAt).toLocaleDateString()}
                </span>
                
                <div className="flex items-center gap-1 bg-[#FEF2F2] p-1 rounded-lg border border-black shadow-neo-sm">
                  {/* Delete trigger */}
                  {deleteConfirmId === word.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWord(word.id);
                        setDeleteConfirmId(null);
                      }}
                      onMouseLeave={() => setDeleteConfirmId(null)}
                      className="px-2.5 py-0.5 bg-[#FF6B6B] text-white text-[10px] rounded border border-black font-black cursor-pointer animate-pulse"
                      title="确认删除"
                    >
                      不可逆，确认删除？
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(word.id);
                      }}
                      className="p-1.5 hover:bg-rose-100 text-[#FF6B6B] rounded-md transition cursor-pointer"
                      title="删除词条"
                    >
                      <Trash2 className="w-4 h-4 text-[#FF6B6B] stroke-[2px]" />
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADD SINGLE WORD DIALOG */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 shadow-neo-xl w-full max-w-lg border-4 border-black max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-[#4D96FF] text-white border-2 border-black rounded-xl shadow-neo-sm">
                    <Sparkles className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-black">绘制新单词卡</h2>
                    <p className="text-xs font-bold text-slate-600">添加英语词条，配上情景插画</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 bg-white border-2 border-black hover:bg-[#FEF2F2] text-black rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5px]" />
                </button>
              </div>

              {formError && (
                <div className="bg-[#FF6B6B]/15 text-black p-3.5 rounded-xl flex items-center gap-2 mb-4 text-xs font-black border-2 border-[#FF6B6B] shadow-neo-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-[#FF6B6B]" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {/* English Spelling input */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5">1. 英文单词 / English word</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: bicycle, dinosaur, pencil..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#FFFBEB] border-2 border-black rounded-xl focus:outline-none transition font-sans font-bold text-black capitalize shadow-neo-sm"
                  />
                </div>

                {/* Optional Chinese Translation Overwrite */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5">2. 中文翻译 / Translation (可选哦)</label>
                  <input
                    type="text"
                    placeholder="例如: 自行车, 恐龙 (选填，不填也会由AI自动拆解！)"
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#FFFBEB] border-2 border-black rounded-xl focus:outline-none transition font-sans font-bold text-black shadow-neo-sm"
                  />
                </div>

                {/* Upload Manual Drag-and-Drop Image Dropzone */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5">
                    3. 上传配套情景插画 / Cover Image (可选哦)
                  </label>
                  
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black bg-[#FFFBEB]/50 hover:bg-[#FFFBEB] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[110px] shadow-neo-sm"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {uploadedImageBase64 ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={uploadedImageBase64} 
                          alt="preview" 
                          className="w-14 h-14 object-cover rounded-xl border-2 border-black shadow-neo-sm"
                        />
                        <div className="text-left text-xs font-black text-black">
                          <p className="text-[#6BCB77] flex items-center gap-1">✓ 手动配图上传成功</p>
                          <p className="text-[10px] text-slate-600 font-bold mt-0.5">点击或者拖拽其他文件可以换一张</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-black mb-1 animate-bounce" style={{ animationDuration: '3s' }} />
                        <span className="text-xs font-black text-black">点击上传 或 拖拽图片到这里</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">电脑拍下的情境卡在可以直接挑选哦</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Confirm button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#6BCB77] text-white font-black rounded-2xl shadow-neo border-2 border-black transition flex items-center justify-center gap-2 cursor-pointer hover:translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>正在智能翻阅词典中...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 stroke-[2.5px]" />
                      <span>制作新卡片 🎨</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: BATCH WORDS IMPORT DIALOG */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 shadow-neo-xl w-full max-w-lg border-4 border-black"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-[#FFD93D] text-black border-2 border-black rounded-xl shadow-neo-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-black">批量快速导入单词</h2>
                    <p className="text-xs font-bold text-slate-600">支持拷贝文本由 AI 高速整理</p>
                  </div>
                </div>
                <button
                  onClick={closeImportDialog}
                  disabled={importStatus === 'processing'}
                  className="p-1.5 bg-white border-2 border-black hover:bg-slate-100 text-black rounded-full transition disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2px]" />
                </button>
              </div>

              {/* Status 1: Idle input stage */}
              {importStatus !== 'processing' && importStatus !== 'completed' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-black font-black block mb-2 leading-normal">
                      请输入一串英语单词，单词可以用：斜杠、空格、逗号或者换行来隔开：
                      <b className="text-black bg-[#FFFBEB] border border-black px-1.5 py-0.5 rounded ml-1">apple, banana, dinosaur, stars</b>
                    </label>
                    <textarea
                      rows={5}
                      placeholder="复制黏贴单词到这里..."
                      value={batchRawText}
                      onChange={(e) => setBatchRawText(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-[#FFFBEB] border-2 border-black rounded-2xl focus:outline-none font-bold text-black shadow-neo-sm"
                    />
                  </div>

                  <button
                    onClick={handleBatchImport}
                    disabled={!batchRawText.trim()}
                    className="w-full py-3 bg-[#FFD93D] text-black font-black border-2 border-black rounded-2xl shadow-neo transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 hover:translate-y-0.5"
                  >
                    <Sparkles className="w-5 h-5 fill-white text-black" />
                    <span>开始全自动 AI 加工 🚀</span>
                  </button>
                </div>
              )}

              {/* Status 2: Processing animated loader */}
              {importStatus === 'processing' && (
                <div className="text-center py-10 space-y-5">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center border-4 border-black rounded-full bg-[#FFFBEB] shadow-neo-sm">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <span className="absolute text-xs font-black text-black">{importProgress}%</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black">正在拼命精析单词：<span className="text-[#FF6B6B] capitalize">"{importingWord}"</span></h3>
                    <p className="text-xs text-slate-600 font-bold mt-1">AI 正在进行音节 dots 黑点、中英文情景图手绘设计中...</p>
                  </div>
                  {/* Progress tracker bar */}
                  <div className="w-full bg-slate-200 rounded-full h-3 max-w-sm mx-auto overflow-hidden border border-black p-0.5">
                    <div 
                      className="bg-[#6BCB77] h-full rounded-full transition-all duration-300" 
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status 3: Completed success badge */}
              {importStatus === 'completed' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 bg-[#6BCB77] border-2 border-black text-white rounded-full flex items-center justify-center mx-auto shadow-neo-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black">批量卡片导入全部完成！ 🎉</h3>
                    <p className="text-xs font-bold text-slate-600 mt-1">
                      成功把所有导入的卡片进行了翻倍强化拆分解构。快去开启闪卡卡片记忆训练吧！
                    </p>
                  </div>
                  <button
                    onClick={closeImportDialog}
                    className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-neo border-2 border-black transition cursor-pointer"
                  >
                    回到单词盒
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
