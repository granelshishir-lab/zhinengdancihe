import React, { useState, useRef } from "react";
import { Word, WordBox } from "../types";
import { playSpeech } from "../utils/audio";
import { compressImage, CompressedImageResult } from "../utils/imageCompressor";
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
  Star,
  RefreshCw,
  Copy,
  Check,
  FolderPlus,
  Trophy,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WordListProps {
  words: Word[];
  wordBoxes: WordBox[];
  onAddWord: (wordObj: Word) => void;
  onAddWords: (newWords: Word[]) => void;
  onEditWord: (wordId: string, updated: Partial<Word>) => void;
  onDeleteWord: (wordId: string) => void;
  onAddWordBox: (newBox: WordBox) => void;
  onDeleteWordBox: (boxId: string) => void;
  onAwardStars: (count: number) => void;
}

export const WordList: React.FC<WordListProps> = ({ 
  words, 
  wordBoxes,
  onAddWord, 
  onAddWords,
  onEditWord, 
  onDeleteWord,
  onAddWordBox,
  onDeleteWordBox,
  onAwardStars
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [progressFilter, setProgressFilter] = useState<'all' | 'learning' | 'mastered' | 'favorite'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // WordBox / Category management states
  const [selectedBoxId, setSelectedBoxId] = useState<string>("all");
  const [isCreateBoxOpen, setIsCreateBoxOpen] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxIcon, setNewBoxIcon] = useState("🍪");
  const [newBoxColor, setNewBoxColor] = useState("#FEF2F2");
  
  // Custom single word belongs-to-box-id dropdown state
  const [targetBoxId, setTargetBoxId] = useState<string>("box-default");

  // Deletion confirmation state for boxes
  const [boxToDelete, setBoxToDelete] = useState<WordBox | null>(null);

  // Detailed Card zoom-up modal state
  const [activeZoomWord, setActiveZoomWord] = useState<Word | null>(null);
  const [zoomImage, setZoomImage] = useState<{ type: 'svg' | 'url'; value: string } | null>(null);
  const [revealedTranslationIds, setRevealedTranslationIds] = useState<Record<string, boolean>>({});
  const [zoomTranslationRevealed, setZoomTranslationRevealed] = useState(false);

  // Helper to split translations by semicolons, commas, dots, slashes supporting polysemy
  const getTranslationsArray = (translationStr: string): string[] => {
    if (!translationStr) return [];
    return translationStr
      .split(/[;；,，、|/]+/g)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  };

  const toggleReveal = (wordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedTranslationIds(prev => ({
      ...prev,
      [wordId]: !prev[wordId]
    }));
  };

  // Syllable spelling exercise states
  const [spellingDifficulty, setSpellingDifficulty] = useState<'all' | 'tricky'>('tricky');
  const [spellingInputs, setSpellingInputs] = useState<string[]>([]);
  const [trickyIndices, setTrickyIndices] = useState<number[]>([]);
  const [spellingStatus, setSpellingStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [showSpellingReveal, setShowSpellingReveal] = useState(false);
  const [hasAwardedPoints, setHasAwardedPoints] = useState(false); // only award points once per interactive session

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

  // Batch compressed images state
  const [batchCompressedImages, setBatchCompressedImages] = useState<CompressedImageResult[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Helper to batch process and compress drag-and-drop or select files
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    setFormError(null);
    
    try {
      const results: CompressedImageResult[] = [];
      const fileArray = Array.from(files);
      
      // Compress in parallel for speed
      await Promise.all(
        fileArray.map(async (file) => {
          if (!file.type.match(/image\/(jpeg|jpg|png|webp)/i)) {
            return;
          }
          try {
            const result = await compressImage(file);
            // If the user has already typed a word, prioritize associating that typed word
            if (newWord.trim()) {
              result.wordSuggested = newWord.trim();
            }
            results.push(result);
          } catch (compressErr) {
            console.error("Failed to compress file: " + file.name, compressErr);
          }
        })
      );

      if (results.length === 0) {
        setFormError("未识别到有效的图片格式（仅支持 JPG、PNG、WebP 图片）。🌿");
        return;
      }

      setBatchCompressedImages(prev => [...prev, ...results]);
      
      // Set the first one's preview to support backward compatibility
      if (results.length > 0) {
        setUploadedImageBase64(results[0].base64);
        setImageType('upload');
      }
    } catch (err: any) {
      setFormError("图片处理及自动压缩过程中发生故障，请重试！");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpdateBatchWord = (idx: number, newVal: string) => {
    setBatchCompressedImages(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        wordSuggested: newVal
      };
      return copy;
    });
  };

  const handleUpdateBatchTranslation = (idx: number, newVal: string) => {
    setBatchTranslations(prev => ({
      ...prev,
      [idx]: newVal
    }));
  };

  const handleRemoveBatchImage = (idx: number) => {
    setBatchCompressedImages(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length > 0) {
        setUploadedImageBase64(updated[0].base64);
      } else {
        setUploadedImageBase64(null);
        setImageType('default');
      }
      return updated;
    });
  };

  // Convert uploaded image to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Handle Drop event for custom drag upload
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Syllable spelling interactive challenge handlers
  const handleOpenZoomWord = (word: Word) => {
    setActiveZoomWord(word);
    setZoomTranslationRevealed(false);
    
    const sylls = word.syllables.split("•").map(s => s.trim().toLowerCase());
    
    // Define tricky indices for vowel combinations or longest structural modules
    const indices: number[] = [];
    if (sylls.length === 1) {
      indices.push(0);
    } else {
      let maxLen = 0;
      let maxIdx = 0;
      sylls.forEach((s, idx) => {
        if (s.length > maxLen) {
          maxLen = s.length;
          maxIdx = idx;
        }
      });
      indices.push(maxIdx);
      
      if (sylls.length >= 4) {
        let secondIdx = (maxIdx + 1) % sylls.length;
        indices.push(secondIdx);
      }
    }
    
    setTrickyIndices(indices);
    
    // Choose what values populate based on starting difficulty level
    const initialInputs = sylls.map((s, idx) => {
      if (spellingDifficulty === 'all') return "";
      return indices.includes(idx) ? "" : s;
    });

    setSpellingInputs(initialInputs);
    setSpellingStatus('idle');
    setShowSpellingReveal(false);
    setHasAwardedPoints(false);
  };

  const handleDifficultyToggle = (difficulty: 'all' | 'tricky') => {
    if (!activeZoomWord) return;
    setSpellingDifficulty(difficulty);
    const sylls = activeZoomWord.syllables.split("•").map(s => s.trim().toLowerCase());
    const initialInputs = sylls.map((s, idx) => {
      if (difficulty === 'all') return "";
      return trickyIndices.includes(idx) ? "" : s;
    });
    setSpellingInputs(initialInputs);
    setSpellingStatus('idle');
    setShowSpellingReveal(false);
  };

  const checkSpelling = () => {
    if (!activeZoomWord) return;
    const sylls = activeZoomWord.syllables.split("•").map(s => s.trim().toLowerCase());
    
    let isAllCorrect = true;
    const currentInputsClean = spellingInputs.map(s => s.trim().toLowerCase());
    
    currentInputsClean.forEach((userVal, idx) => {
      if (userVal !== sylls[idx]) {
        isAllCorrect = false;
      }
    });

    if (isAllCorrect) {
      setSpellingStatus('success');
      playSpeech("Amazing! Correct spelling!", { rate: 1.1 });
      if (!hasAwardedPoints) {
        onAwardStars(3); // award 3 stars for nailing spelling!
        setHasAwardedPoints(true);
      }
    } else {
      setSpellingStatus('fail');
      playSpeech("Let's try that again", { rate: 1.1 });
    }
  };

  const handleResetSpelling = () => {
    if (!activeZoomWord) return;
    const sylls = activeZoomWord.syllables.split("•").map(s => s.trim().toLowerCase());
    const initialInputs = sylls.map((s, idx) => {
      if (spellingDifficulty === 'all') return "";
      return trickyIndices.includes(idx) ? "" : s;
    });
    setSpellingInputs(initialInputs);
    setSpellingStatus('idle');
    setShowSpellingReveal(false);
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
    const clean = word.trim();
    if (!clean) return "";
    const res = clean.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*(?![aeiouy]))?/gi);
    if (!res || res.length <= 1) return clean;
    return res.join("•");
  };

  const [batchTranslations, setBatchTranslations] = useState<Record<number, string>>({});

  // Submit standard single add or multi-image batch add form
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Case 1: Multiple compressed pictures are present. Custom process for each!
    if (batchCompressedImages.length > 0) {
      setIsLoading(true);
      try {
        const batchCreatedWords: Word[] = [];
        
        // Process each image in parallel where possible, or sequential with simple loops
        for (let i = 0; i < batchCompressedImages.length; i++) {
          const item = batchCompressedImages[i];
          const rawWord = item.wordSuggested.trim();
          if (!rawWord) continue;

          let finalSyllables = approximateSyllables(rawWord);
          const overrideTrans = batchTranslations[i]?.trim();
          let finalTranslation = overrideTrans || rawWord;
          let finalDefinition = `Meaning of ${rawWord}.`;
          let finalExample = `This is a sentence with ${rawWord}.`;
          let finalSvgCode: string | undefined = undefined;

          try {
            const response = await fetch("/api/word/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ word: rawWord }),
            });

            if (response.ok) {
              const data = await response.json();
              finalSyllables = data.syllables || finalSyllables;
              finalTranslation = overrideTrans || data.translation || finalTranslation;
              finalDefinition = data.definition || finalDefinition;
              finalExample = data.example || finalExample;
              finalSvgCode = data.svgIllustration || undefined;
            }
          } catch (err) {
            console.warn("AI analyzer error for word: " + rawWord, err);
          }

          const wordObj: Word = {
            id: `word-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            word: rawWord,
            syllables: finalSyllables,
            translation: finalTranslation,
            definition: finalDefinition,
            example: finalExample,
            imageType: 'upload',
            imageUrl: item.base64,
            progress: 'learning',
            createdAt: Date.now() + i,
            boxId: targetBoxId
          };

          batchCreatedWords.push(wordObj);
        }

        if (batchCreatedWords.length > 0) {
          onAddWords(batchCreatedWords);
        }

        // Reset All Add States
        setNewWord("");
        setTranslation("");
        setUploadedImageBase64(null);
        setBatchCompressedImages([]);
        setBatchTranslations({});
        setIsAddOpen(false);
      } catch (err: any) {
        setFormError(err.message || "批量图片制作单词卡片时发生意外错误，请重新尝试。");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Case 2: Standard single-card manual text creation
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
        word: cleanWord,
        syllables: finalSyllables,
        translation: finalTranslation,
        definition: finalDefinition,
        example: finalExample,
        imageType: uploadedImageBase64 ? 'upload' : (finalSvgCode ? 'svg' : 'default'),
        svgCode: finalSvgCode,
        imageUrl: uploadedImageBase64 || undefined,
        progress: 'learning',
        createdAt: Date.now(),
        boxId: targetBoxId // assign the wordbox category!
      };

      onAddWord(wordObj);

      // Reset Single Add States
      setNewWord("");
      setTranslation("");
      setUploadedImageBase64(null);
      setBatchCompressedImages([]);
      setBatchTranslations({});
      setIsAddOpen(false);
    } catch (err: any) {
      setFormError(err.message || "由于服务器网络原因遇到错误，请重新尝试。");
    } finally {
      setIsLoading(false);
    }
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setNewWord("");
    setTranslation("");
    setUploadedImageBase64(null);
    setBatchCompressedImages([]);
    setBatchTranslations({});
    setFormError(null);
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
      const targetWord = rawWords[i];
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
            imageType: data.svgIllustration ? 'svg' : 'default',
            svgCode: data.svgIllustration || undefined,
            progress: 'learning',
            createdAt: Date.now() + i, // slight stagger to keep order
            boxId: targetBoxId
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
            createdAt: Date.now() + i,
            boxId: targetBoxId
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
          createdAt: Date.now() + i,
          boxId: targetBoxId
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

      let matchesBox = true;
      if (selectedBoxId !== 'all') {
        matchesBox = (w.boxId || "box-default") === selectedBoxId;
      }
      return matchesSearch && matchesProgress && matchesBox;
    })
    .sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="font-sans">

      {/* 分类词盒选择器 Dashboard */}
      <div className="mb-6 bg-white p-5 rounded-[28px] border-4 border-black shadow-neo relative overflow-hidden">
        {/* Playful background cookies decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD93D]/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-[#FFD93D] text-black border-2 border-black rounded-xl shadow-neo-sm">
              <span className="text-xl leading-none">🍪</span>
            </div>
            <div>
              <h4 className="text-base font-black text-black">曲奇家族 / Cookie Families</h4>
              <p className="text-[11px] text-slate-500 font-bold">分类整理你的词汇，切换词盒筛选卡片！全新自定词盒能赢 10 颗小星星奖励！✨</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNewBoxName("");
              setNewBoxColor("#FEF2F2");
              setNewBoxIcon("🍪");
              setIsCreateBoxOpen(true);
            }}
            className="px-4 py-2 bg-[#6BCB77] text-white border-2 border-black rounded-xl text-xs font-black shadow-neo-sm hover:translate-y-0.5 hover:shadow-neo-sm transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
          >
            <FolderPlus className="w-4 h-4 text-white stroke-[2.5px]" />
            <span>制作新词盒</span>
          </button>
        </div>
        
        {/* Horizontal scrollable row for category box cards */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin select-none">
          <button
            onClick={() => setSelectedBoxId('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 border-2 border-black transition shadow-neo-sm flex items-center gap-2 cursor-pointer ${
              selectedBoxId === 'all'
                ? 'bg-black text-white hover:bg-slate-900'
                : 'bg-white text-black hover:bg-slate-50'
            }`}
          >
            <span>🍪</span>
            <span>显示全部 ({words.length})</span>
          </button>

          {wordBoxes.map(box => {
            const boxCount = words.filter(w => (w.boxId || "box-default") === box.id).length;
            const isSelected = selectedBoxId === box.id;
            return (
              <div key={box.id} className="relative shrink-0 flex items-center group">
                <button
                  onClick={() => setSelectedBoxId(box.id)}
                  style={{ backgroundColor: isSelected ? box.color : '#FFFFFF' }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black border-2 border-black transition shadow-neo-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] ${
                    isSelected ? 'ring-2 ring-black font-extrabold translate-y-[1px]' : 'bg-white'
                  }`}
                >
                  <span className="text-base leading-none">{box.icon}</span>
                  <span>{box.name} ({boxCount})</span>
                </button>
                
                {/* Word boxes can be deleted except default */}
                {box.id !== "box-default" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBoxToDelete(box);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full border-2 border-black text-xs font-black flex items-center justify-center cursor-pointer hover:bg-red-600 transition"
                    title="删除此盒"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Search Input and action controller toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FEF2F2] p-5 rounded-[24px] border-4 border-black mb-8 shadow-neo">
        
        {/* Search Input block */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-black" />
          <input
            type="text"
            placeholder="搜索我的卡通单词卡..."
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
              onClick={() => handleOpenZoomWord(word)}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-[32px] p-5 border-4 border-black shadow-neo hover-slide transition-all flex flex-col justify-between cursor-pointer hover:bg-slate-50/80"
            >
              {/* Card top bar */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-3xl font-display font-black text-black leading-none tracking-wide">
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
                  <div className="inline-flex flex-wrap items-center gap-1 mt-1 z-10">
                    {word.syllables.split("•").map((syllable, sIdx, sArr) => {
                      const cleanSyll = syllable.trim();
                      return (
                        <React.Fragment key={sIdx}>
                          <span 
                            className="text-xs font-black text-[#FF6B6B] font-mono tracking-wider bg-[#FFFBEB] px-2 py-0.5 rounded-md border-2 border-black inline-block select-none"
                          >
                            {cleanSyll}
                          </span>
                          {sIdx < sArr.length - 1 && (
                            <span className="text-xs font-black text-slate-400 select-none">•</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
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
                <div 
                  className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border-2 border-black p-1 shrink-0 overflow-hidden text-center justify-self-center self-center shadow-neo-sm cursor-zoom-in hover:scale-105 transition duration-150"
                  title="点击放大观察"
                  onClick={() => {
                    if (word.imageType === 'upload' && word.imageUrl) {
                      setZoomImage({ type: 'url', value: word.imageUrl });
                    } else if (word.svgCode) {
                      setZoomImage({ type: 'svg', value: word.svgCode });
                    }
                  }}
                >
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
                  {revealedTranslationIds[word.id] ? (
                    <div 
                      onClick={(e) => toggleReveal(word.id, e)}
                      className="flex flex-col gap-1 cursor-pointer w-full"
                      title="点击隐藏"
                    >
                      <div className="flex items-center gap-1 text-black font-black mb-1">
                        <Languages className="w-4 h-4 text-[#FF6B6B] stroke-[2.5px]" />
                        <span className="text-[10px] text-slate-400 font-bold">(点击隐藏)</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-full">
                        {getTranslationsArray(word.translation).map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#FFD93D] text-black border-2 border-black rounded-lg text-xs font-black shadow-neo-sm">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={(e) => toggleReveal(word.id, e)}
                      className="flex items-center gap-1.5 p-1.5 bg-[#FEF2F2]/60 hover:bg-[#FEF2F2] border-2 border-slate-300 hover:border-black border-dashed rounded-xl cursor-pointer select-none transition"
                      title="点击显示中文释义"
                    >
                      <Languages className="w-4 h-4 text-[#FF6B6B] stroke-[2.5px]" />
                      <span className="text-xs font-black text-slate-600">点击显示中译 👁️</span>
                    </div>
                  )}
                  <div className="flex items-start gap-0.5 group mt-2">
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
                  onClick={closeAddModal}
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
                {/* Image Compression Status text indicator */}
                {isCompressing && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-sky-50 border-2 border-black text-slate-800 rounded-2xl text-xs font-bold shadow-neo-sm animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                    <span>正在后台极速极高品质压缩您上传的图片（单张均确保≤50KB，无阻塞 & 静默）...</span>
                  </div>
                )}

                {/* Mode 1: Batch images list is present */}
                {batchCompressedImages.length > 0 ? (
                  <div className="space-y-3.5 pt-1.5">
                    <div className="flex justify-between items-center bg-[#FEF3C7] border-2 border-black p-3.5 rounded-2xl shadow-neo-sm">
                      <div className="text-left">
                        <h4 className="text-xs font-extrabold text-black">
                          📦 多图压缩列表 ({batchCompressedImages.length}张)
                        </h4>
                        <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                          所有图片已等比自顺缩放，硬性锁死在 <b>50KB 以下</b>！
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBatchCompressedImages([]);
                          setUploadedImageBase64(null);
                        }}
                        className="px-2.5 py-1 text-[10px] font-black text-white bg-[#FF6B6B] border-2 border-black rounded-lg shadow-neo-sm cursor-pointer transition active:translate-y-0.5"
                      >
                        清空多图
                      </button>
                    </div>

                    <div className="max-h-[240px] overflow-y-auto space-y-2.5 pr-1">
                      {batchCompressedImages.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="flex gap-3 bg-[#FFFBEB]/60 hover:bg-[#FFFBEB] border-2 border-black p-3 rounded-2xl shadow-neo-sm items-center relative transition"
                        >
                          {/* Left: Thumbnail with size indicator badge */}
                          <div className="relative shrink-0">
                            <img 
                              src={img.base64} 
                              alt="preview" 
                              className="w-14 h-14 object-cover rounded-xl border-2 border-black shadow-neo-sm bg-white"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-[#6BCB77] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-black shadow-neo-sm whitespace-nowrap">
                              {img.sizeKB}KB ✓
                            </span>
                          </div>

                          {/* Middle: Inputs and filename properties */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="grid grid-cols-2 gap-2 text-left">
                              <div>
                                <span className="text-[9px] text-slate-500 font-black tracking-widest block uppercase mb-0.5">对应单词 Word</span>
                                <input
                                  type="text"
                                  required
                                  value={img.wordSuggested}
                                  onChange={(e) => handleUpdateBatchWord(idx, e.target.value)}
                                  placeholder="对应英文"
                                  className="w-full px-2 py-1 text-xs bg-white border-2 border-black rounded-lg focus:outline-none font-sans font-bold text-black"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-black tracking-widest block uppercase mb-0.5">中文翻译 (选填)</span>
                                <input
                                  type="text"
                                  value={batchTranslations[idx] || ""}
                                  onChange={(e) => handleUpdateBatchTranslation(idx, e.target.value)}
                                  placeholder="AI 自动生成"
                                  className="w-full px-2 py-1 text-xs bg-white border-2 border-black rounded-lg focus:outline-none font-sans font-bold text-black"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                              <span className="font-mono">原大小: {img.originalSizeKB}KB</span>
                              <span className="text-[#6BCB77]">压缩率: {Math.max(1, Math.round((1 - img.sizeKB / img.originalSizeKB) * 100))}% ⚡</span>
                            </div>
                          </div>

                          {/* Right: Individual delete X button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveBatchImage(idx)}
                            className="p-1 text-slate-400 hover:text-[#FF6B6B] transition cursor-pointer self-center"
                            title="删除此张"
                          >
                            <X className="w-5 h-5 stroke-[2px]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Mode 2: Standard single card manual text creation */
                  <>
                    {/* English Spelling input */}
                    <div>
                      <label className="text-xs text-black font-black block mb-1.5">1. 英文单词 / English word</label>
                      <input
                        type="text"
                        required={batchCompressedImages.length === 0}
                        placeholder="例如: bicycle, dinosaur, pencil..."
                        value={newWord}
                        onChange={(e) => handleWordFieldChange(e)}
                        className="w-full px-4 py-2.5 text-sm bg-[#FFFBEB] border-2 border-black rounded-xl focus:outline-none transition font-sans font-bold text-black shadow-neo-sm"
                      />
                      
                      {/* Capitalization adjustments button row */}
                      <div className="flex gap-2.5 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (newWord) {
                              const first = newWord.charAt(0);
                              const toggled = first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase();
                              const updated = toggled + newWord.slice(1);
                              setNewWord(updated);
                              if (!useAI && syllables === "") {
                                setSyllables(approximateSyllables(updated));
                              }
                            }
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border-2 border-black rounded-lg text-[10px] font-black shadow-neo-sm transition flex items-center gap-1 cursor-pointer select-none"
                        >
                          <span>Aa 首字母大小写切换</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (newWord) {
                              const updated = newWord.toLowerCase();
                              setNewWord(updated);
                              if (!useAI && syllables === "") {
                                setSyllables(approximateSyllables(updated));
                              }
                            }
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border-2 border-black rounded-lg text-[10px] font-black shadow-neo-sm transition flex items-center gap-1 cursor-pointer select-none"
                        >
                          <span>aa 全小写</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (newWord) {
                              const updated = newWord.slice(0, 1).toUpperCase() + newWord.slice(1);
                              setNewWord(updated);
                              if (!useAI && syllables === "") {
                                setSyllables(approximateSyllables(updated));
                              }
                            }
                          }}
                          className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border-2 border-black rounded-lg text-[10px] font-black shadow-neo-sm transition flex items-center gap-1 cursor-pointer select-none"
                        >
                          <span>Aa 首字母大写</span>
                        </button>
                      </div>
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
                  </>
                )}

                {/* WordBox category assignment (Always Visible) */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5">3. 存入哪个曲奇词盒？ / Secret Cookie Box</label>
                  <select
                    value={targetBoxId}
                    onChange={(e) => setTargetBoxId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-black rounded-xl focus:outline-none transition font-sans font-bold text-black shadow-neo-sm cursor-pointer"
                  >
                    {wordBoxes.map(box => (
                      <option key={box.id} value={box.id}>
                        {box.icon} {box.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upload Manual Drag-and-Drop Image Dropzone & Multi-file support */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5">
                    4. {batchCompressedImages.length > 0 ? "添加更多配套自定插图 / Add More Images" : "上传配套自定插图 / Cover Image（可选且支持多选哦）"}
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
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {batchCompressedImages.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-7 h-7 text-green-600 mb-1 animate-bounce" />
                        <span className="text-xs font-black text-black">继续拖拽或点击可增加多张照片 🎨</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">支持批量等比例压缩 JPG、PNG、WebP (单图≤50KB)</span>
                      </div>
                    ) : uploadedImageBase64 ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={uploadedImageBase64} 
                          alt="preview" 
                          className="w-14 h-14 object-cover rounded-xl border-2 border-black shadow-neo-sm"
                        />
                        <div className="text-left text-xs font-black text-black">
                          <p className="text-[#6BCB77] flex items-center gap-1">✓ 自动防闪退压缩上传成功</p>
                          <p className="text-[10px] text-slate-600 font-bold mt-0.5">点击或者拖拽其他文件可以批量上传哦</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-black mb-1 animate-bounce" style={{ animationDuration: '3s' }} />
                        <span className="text-xs font-black text-black">点击上传 或 拖拽图片到这里（支持多选图片批量压缩！）</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">每张图片将静默、不卡顿自动锁死在 <b>50KB 以下</b></span>
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

                  {/* WordBox category assignment for batch imports */}
                  <div>
                    <label className="text-xs text-black font-black block mb-1.5 text-left font-sans">
                      存入哪个曲奇词盒？ / Secret Cookie Box
                    </label>
                    <select
                      value={targetBoxId}
                      onChange={(e) => setTargetBoxId(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border-2 border-black rounded-xl focus:outline-none transition font-sans font-bold text-black shadow-neo-sm cursor-pointer"
                    >
                      {wordBoxes.map(box => (
                        <option key={box.id} value={box.id}>
                          {box.icon} {box.name}
                        </option>
                      ))}
                    </select>
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

      {/* MODAL 4: CREATE CUSTOM WORDBOX MODAL */}
      <AnimatePresence>
        {isCreateBoxOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 shadow-neo-xl w-full max-w-md border-4 border-black"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-[#6BCB77] text-white border-2 border-black rounded-xl shadow-neo-sm">
                    <FolderPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-black text-black">制作专属曲奇词盒</h2>
                    <p className="text-xs font-bold text-slate-600">定制分类标签，让单词排队整齐</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateBoxOpen(false)}
                  className="p-1.5 bg-white border-2 border-black hover:bg-slate-100 text-black rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2px]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name field */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5 text-left font-sans">词盒名称 / Box Label</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="例如: 体育运动, 精选修饰..."
                    value={newBoxName}
                    onChange={(e) => setNewBoxName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-[#FFFBEB] border-2 border-black rounded-xl focus:outline-none font-bold text-black shadow-neo-sm font-sans"
                  />
                </div>

                {/* Selected icon emoji choice */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5 text-left font-sans">挑选一个好玩的图标 / Choose Icon</label>
                  <div className="grid grid-cols-6 gap-2 bg-[#FFFBEB]/45 p-2 rounded-2xl border-2 border-black">
                    {["🍪", "🐯", "🍎", "🎒", "🚗", "🍕", "🍦", "🎨", "🚀", "🧸", "⚽", "🧩"].map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewBoxIcon(icon)}
                        className={`py-2 text-2xl rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer select-none ${
                          newBoxIcon === icon
                            ? 'bg-[#FFD93D] border-black scale-110 shadow-neo-sm'
                            : 'bg-white border-transparent hover:bg-slate-100'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color scheme palettes */}
                <div>
                  <label className="text-xs text-black font-black block mb-1.5 text-left font-sans">挑选底色风格 / Select Palette Color</label>
                  <div className="flex gap-2.5 bg-slate-50 p-2.5 rounded-2xl border-2 border-black justify-around">
                    {[
                      { hex: "#FEF2F2", label: "草莓红" },
                      { hex: "#F0F9FF", label: "晴天蓝" },
                      { hex: "#FFF1F2", label: "樱花粉" },
                      { hex: "#F0FDFA", label: "薄荷绿" },
                      { hex: "#FEFEE2", label: "奶黄黄" },
                      { hex: "#F5F3FF", label: "薰衣紫" }
                    ].map(colorObj => (
                      <button
                        key={colorObj.hex}
                        type="button"
                        onClick={() => setNewBoxColor(colorObj.hex)}
                        style={{ backgroundColor: colorObj.hex }}
                        className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                          newBoxColor === colorObj.hex
                            ? 'border-black scale-115 ring-2 ring-black ring-offset-1'
                            : 'border-[#E2E8F0] hover:scale-105'
                        }`}
                        title={colorObj.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Create submit action button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!newBoxName.trim()) {
                      alert("请输入词盒的名字哦！");
                      return;
                    }
                    onAddWordBox({
                      id: `box-${Date.now()}`,
                      name: newBoxName.trim(),
                      color: newBoxColor,
                      icon: newBoxIcon,
                      createdAt: Date.now()
                    });
                    // Give stars!
                    onAwardStars(10);
                    setIsCreateBoxOpen(false);
                  }}
                  className="w-full mt-4 py-3 bg-[#6BCB77] text-white font-black rounded-xl border-2 border-black shadow-neo flex items-center justify-center gap-1.5 cursor-pointer hover:translate-y-0.5 font-sans"
                >
                  <Plus className="w-5 h-5 text-white stroke-[3.5px]" />
                  <span>正式生成专属词盒（+10🌟）🚀</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: DELETE BOX CONFIRMATION MODAL */}
      <AnimatePresence>
        {boxToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 shadow-neo-xl w-full max-w-md border-4 border-black text-center"
            >
              <div className="w-16 h-16 bg-[#FF6B6B] text-white border-2 border-black rounded-2xl flex items-center justify-center text-3xl shadow-neo-sm mx-auto mb-4 animate-bounce" style={{ animationDuration: '3s' }}>
                🗑️
              </div>
              <h3 className="text-xl font-black text-black mb-2 font-display">删除词盒确认</h3>
              <p className="text-sm font-bold text-slate-700 leading-relaxed mb-4">
                确定要删除这个「<span className="text-[#FF6B6B] font-black">{boxToDelete.icon} {boxToDelete.name}</span>」词盒吗？
                <br />
                <span className="text-xs text-slate-500 font-bold block mt-2">
                  💡 别担心，里面的所有单词卡都将自动安全转移到「默认词盒」中，完全不会丢失任何词条哦！🍪
                </span>
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteWordBox(boxToDelete.id);
                    if (selectedBoxId === boxToDelete.id) {
                      setSelectedBoxId('all');
                    }
                    setBoxToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-[#FF6B6B] text-white font-black rounded-xl border-2 border-black shadow-neo-sm transition cursor-pointer hover:bg-red-600 active:translate-y-0.5 font-sans text-xs"
                >
                  确认删除 🗑️
                </button>
                <button
                  type="button"
                  onClick={() => setBoxToDelete(null)}
                  className="px-5 py-2.5 bg-white text-black font-black rounded-xl border-2 border-black shadow-neo-sm transition cursor-pointer hover:bg-slate-100 active:translate-y-0.5 font-sans text-xs"
                >
                  我再想想 🌸
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: DETAIL ZOOM WORD & INTERACTIVE SYLLABLE PRACTICE MODAL */}
      <AnimatePresence>
        {activeZoomWord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 shadow-neo-xl w-full max-w-xl border-4 border-black max-h-[92vh] overflow-y-auto relative text-center"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#FFEBEE] border-2 border-black rounded-xl shadow-neo-sm animate-bounce" style={{ animationDuration: '4s' }}>
                    <span className="text-xl">🍪</span>
                  </div>
                  <div className="text-left font-sans">
                    <h2 className="text-lg font-black text-black">{activeZoomWord.word} 词包详情</h2>
                    <p className="text-xs font-bold text-slate-600">趣味曲奇音节解构拼读大闯关</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveZoomWord(null)}
                  className="p-1.5 bg-white border-2 border-black hover:bg-[#FFEBEE] text-black rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5px]" />
                </button>
              </div>

              {/* Layout Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 items-stretch">
                {/* Left Card graphic illustration */}
                <div className="bg-[#FFFBEB] rounded-2xl p-4 border-2 border-black flex flex-col items-center justify-center min-h-[180px] shadow-neo-sm relative">
                  <div 
                    className="w-36 h-36 bg-white rounded-2xl flex items-center justify-center border-2 border-black p-1.5 shadow-inner overflow-hidden mb-3 cursor-zoom-in hover:scale-105 transition duration-150"
                    title="点击放大观察"
                    onClick={() => {
                      if (activeZoomWord.imageType === 'upload' && activeZoomWord.imageUrl) {
                        setZoomImage({ type: 'url', value: activeZoomWord.imageUrl });
                      } else if (activeZoomWord.svgCode) {
                        setZoomImage({ type: 'svg', value: activeZoomWord.svgCode });
                      }
                    }}
                  >
                    {activeZoomWord.imageType === 'upload' && activeZoomWord.imageUrl ? (
                      <img 
                        src={activeZoomWord.imageUrl} 
                        alt={activeZoomWord.word} 
                        className="w-full h-full object-cover rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                    ) : activeZoomWord.svgCode ? (
                      <div 
                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:rounded-xl" 
                        dangerouslySetInnerHTML={{ __html: activeZoomWord.svgCode }} 
                      />
                    ) : (
                      <div className="text-xs text-slate-400 font-bold">暂无插图</div>
                    )}
                  </div>
                  
                  {/* Pronounce Trigger */}
                  <button
                    onClick={(e) => handleSpeak(activeZoomWord.word, e)}
                    className="px-4 py-2 bg-[#4D96FF] text-white hover:bg-[#2e7aea] border-2 border-black rounded-xl shadow-neo-sm text-xs font-black transition flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-white" />
                    <span>大声朗读 / Voice</span>
                  </button>
                </div>

                {/* Right Card textual meanings */}
                <div className="bg-sky-50 rounded-2xl p-5 border-2 border-black flex flex-col justify-between shadow-neo-sm text-left font-sans">
                  <div className="space-y-3.5 select-none font-bold">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">中译解释 Translation (点击可切换隐藏/显示)</span>
                      {zoomTranslationRevealed ? (
                        <div 
                          onClick={() => setZoomTranslationRevealed(false)}
                          className="flex flex-wrap gap-1.5 cursor-pointer py-1"
                        >
                          {getTranslationsArray(activeZoomWord.translation).map((t, idx) => (
                            <span key={idx} className="px-3 py-1 bg-[#FFD93D] text-black border-2 border-black rounded-xl text-sm font-black shadow-neo-sm">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div 
                          onClick={() => setZoomTranslationRevealed(true)}
                          className="flex items-center gap-1.5 p-2 bg-[#FEF2F2]/60 hover:bg-[#FEF2F2] border-2 border-slate-300 hover:border-black border-dashed rounded-xl cursor-pointer select-none transition"
                        >
                          <Languages className="w-4 h-4 text-[#FF6B6B] stroke-[2.5px]" />
                          <span className="text-xs font-black text-slate-600">点击显示中译 👁️</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">简明定义 Definition</span>
                      <p className="text-xs text-slate-700 leading-relaxed font-bold">
                        {activeZoomWord.definition}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#FF6B6B] uppercase tracking-widest block mb-1">情景例句 Context Sentence</span>
                      <p className="text-xs text-slate-800 italic leading-normal border-l-4 border-[#FF6B6B] pl-2 bg-white/40 py-1 rounded font-bold">
                        "{activeZoomWord.example}"
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-3 mt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>同步码ID: {activeZoomWord.id}</span>
                    <span>分类: {wordBoxes.find(b => b.id === (activeZoomWord.boxId || "box-default"))?.name || "默认"}</span>
                  </div>
                </div>
              </div>

              {/* Syllable Spelling Interactive Game Section */}
              <div className="border-4 border-black rounded-3xl p-5 bg-gradient-to-br from-[#FFEAA7]/30 to-[#FFEAA7]/10 relative overflow-hidden shadow-neo-sm text-center font-sans">
                
                {/* Challenge Header */}
                <div className="flex justify-between items-center mb-4 border-b-2 border-black border-dashed pb-3 text-left">
                  <div className="flex items-center gap-1.5 text-left">
                    <Trophy className="w-5 h-5 text-[#FFD93D] fill-[#FFD93D] stroke-black stroke-[2.5px]" />
                    <span className="text-sm font-black text-black">音节拼写大挑战 / Bubble Spelling</span>
                  </div>
                  
                  {/* Difficulty Mode Toggle buttons */}
                  <div className="flex items-center bg-white p-1 rounded-xl border-2 border-black shadow-neo-sm">
                    <button
                      type="button"
                      onClick={() => handleDifficultyToggle('tricky')}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        spellingDifficulty === 'tricky'
                          ? 'bg-[#FF9F43] text-white'
                          : 'text-slate-600 hover:bg-black/5'
                      }`}
                    >
                      易错部分
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDifficultyToggle('all')}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        spellingDifficulty === 'all'
                          ? 'bg-[#FF6B6B] text-white'
                          : 'text-slate-600 hover:bg-black/5'
                      }`}
                    >
                      全部拼写
                    </button>
                  </div>
                </div>

                <p className="text-center text-[11px] font-bold text-slate-700 mb-3.5 leading-normal">
                  💡 {spellingDifficulty === 'tricky' 
                    ? "老师提示：老师挑出了高难度、或容易拼错的字母，请仔细写出这一部分空缺音节！" 
                    : "满分挑战！拼写拼图框中的所有音节片，完全写对他会赢得 3 颗小星星哦！"}
                </p>

                {/* Main Interactive bubbles mapping */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  {activeZoomWord.syllables.split("•").map((syllable, idx) => {
                    const cleanSyllable = syllable.trim().toLowerCase();
                    const isTricky = trickyIndices.includes(idx);
                    const shouldInput = spellingDifficulty === 'all' || isTricky;

                    return (
                      <React.Fragment key={idx}>
                        {shouldInput ? (
                          <input
                            type="text"
                            maxLength={cleanSyllable.length}
                            value={spellingInputs[idx] || ""}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/[^a-z]/gi, '');
                              const updated = [...spellingInputs];
                              updated[idx] = val;
                              setSpellingInputs(updated);
                              setSpellingStatus('idle');
                            }}
                            placeholder="?"
                            className={`w-14 md:w-16 h-11 text-center font-mono font-black text-sm lowercase rounded-xl border-2 border-black shadow-neo-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                              spellingStatus === 'success'
                                ? 'bg-[#D4EDDA] border-[#28A745] text-emerald-800 font-extrabold'
                                : spellingStatus === 'fail'
                                ? 'bg-[#F8D7DA] border-[#DC3545] text-rose-800 font-extrabold'
                                : 'bg-[#FFFBEB] text-amber-940 border-[#E5BA2D]'
                            }`}
                            style={{ width: `${Math.max(4, cleanSyllable.length) * 11 + 22}px` }}
                          />
                        ) : (
                          <div 
                            className="px-3.5 h-11 bg-white border-2 border-black rounded-xl shadow-neo-sm flex items-center justify-center font-mono font-black text-sm lowercase text-slate-800 select-none"
                          >
                            {cleanSyllable}
                          </div>
                        )}

                        {idx < activeZoomWord.syllables.split("•").length - 1 && (
                          <span className="text-lg font-black text-slate-400 select-none">•</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Result notification alerts */}
                <div className="min-h-[42px] flex items-center justify-center mb-3">
                  <AnimatePresence>
                    {spellingStatus === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-emerald-50 border-2 border-[#6BCB77] text-[11px] font-black font-sans text-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-neo-sm text-left"
                      >
                        <Check className="w-4 h-4 text-[#6BCB77] stroke-[3px]" />
                        <span>超级出色！音节发音拼写完全一致！星星 +3 🌟</span>
                      </motion.div>
                    )}

                    {spellingStatus === 'fail' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-[#FFF0F2] border-2 border-rose-400 text-[11px] font-black font-sans text-rose-700 px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-neo-sm text-left"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span>哎呀，还差一点点，不要气馁哦！🌱</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submitting Check controllers row */}
                <div className="flex gap-2.5 items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={checkSpelling}
                    className="px-4 py-2 bg-[#FFD93D] text-black border-2 border-black rounded-xl text-xs font-black shadow-neo-sm hover:translate-y-0.5 hover:shadow-neo-sm transition-all cursor-pointer flex items-center gap-1 font-sans"
                  >
                    <Zap className="w-3.5 h-3.5 text-black fill-black" strokeWidth={3} />
                    <span>检查答案 / Check</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSpellingReveal(!showSpellingReveal)}
                    className="px-4 py-2 bg-white text-slate-700 hover:text-black border-2 border-black rounded-xl text-xs font-bold shadow-neo-sm hover:translate-y-0.5 transition cursor-pointer font-sans"
                  >
                    <span>{showSpellingReveal ? "隐藏拼写 🙈" : "偷看一眼 🙈"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSpelling}
                    className="px-4 py-2 bg-white text-slate-700 hover:text-black border-2 border-black rounded-xl text-xs font-bold shadow-neo-sm hover:translate-y-0.5 transition cursor-pointer font-sans"
                  >
                    <span>重新写 🔄</span>
                  </button>
                </div>

                {/* Reveal Answer Bubble */}
                <AnimatePresence>
                  {showSpellingReveal && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="mt-3.5 p-2 bg-slate-100 rounded-xl border border-dashed border-slate-400 text-center text-xs font-mono font-black"
                    >
                      <span className="text-slate-500">音节答案 / Guide Answer:</span>{" "}
                      <span className="text-emerald-700 lowercase tracking-widest text-sm bg-white border border-slate-300 rounded px-1.5 py-0.5 ml-1 inline-block">
                        {activeZoomWord.syllables.replace(/•/g, " • ").toLowerCase()}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 cursor-zoom-out"
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
