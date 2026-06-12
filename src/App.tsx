import React, { useState, useEffect } from "react";
import { Word, WordBox } from "./types.js";
import { SEED_WORDS } from "./data/seeds.js";
import { StatsBanner } from "./components/StatsBanner.js";
import { WordList } from "./components/WordList.js";
import { MatchingGame } from "./components/MatchingGame.js";
import { QuizGame } from "./components/QuizGame.js";
import { 
  BookOpen, 
  Play, 
  Brain, 
  HeartHandshake, 
  Lock, 
  User, 
  Key, 
  Copy, 
  Check, 
  LogOut, 
  RefreshCw, 
  Search, 
  AlertTriangle,
  Monitor,
  CheckCircle2,
  ListRestart,
  Download
} from "lucide-react";
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

  // Device context & Identity
  const [deviceId, setDeviceId] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>("");
  const [successToast, setSuccessToast] = useState<string>("");

  // Card Key credentials state
  const [cardKeyInput, setCardKeyInput] = useState<string>("");
  const [activeCardKey, setActiveCardKey] = useState<string>("");

  // Account activation status
  const [isActivated, setIsActivated] = useState<boolean>(false);

  // Admin section state
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showAdminEntry, setShowAdminEntry] = useState<boolean>(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState<string>("");
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");
  
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [userSearchText, setUserSearchText] = useState<string>("");
  const [generateCount, setGenerateCount] = useState<number>(10);
  const [generating, setGenerating] = useState<boolean>(false);

  // Load words, stars, wordBoxes from localStorage
  const initLocalProgress = () => {
    // Words
    const localWords = localStorage.getItem("children_wordbox_words");
    if (localWords) {
      try {
        setWords(JSON.parse(localWords));
      } catch (e) {
        setWords(SEED_WORDS);
      }
    } else {
      setWords(SEED_WORDS);
      localStorage.setItem("children_wordbox_words", JSON.stringify(SEED_WORDS));
    }

    // Stars
    const localStars = localStorage.getItem("children_wordbox_stars");
    if (localStars) {
      setStars(Number(localStars) || 20);
    } else {
      setStars(20);
      localStorage.setItem("children_wordbox_stars", "20");
    }

    // Boxes
    const localBoxes = localStorage.getItem("children_wordbox_boxes");
    if (localBoxes) {
      try {
        setWordBoxes(JSON.parse(localBoxes));
      } catch (e) {
        setWordBoxes(BASE_BOXES);
      }
    } else {
      setWordBoxes(BASE_BOXES);
      localStorage.setItem("children_wordbox_boxes", JSON.stringify(BASE_BOXES));
    }
  };

  // Synchronize helper (purely local storage now)
  const saveLocalProgress = (currentWords: Word[], currentStars: number, currentBoxes: WordBox[]) => {
    localStorage.setItem("children_wordbox_words", JSON.stringify(currentWords));
    localStorage.setItem("children_wordbox_stars", String(currentStars));
    localStorage.setItem("children_wordbox_boxes", JSON.stringify(currentBoxes));
  };

  // Pure card-key verification client
  const triggerKeyVerification = async (key: string, currentDevId: string, isStartup = false) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationKey: key.trim().toUpperCase(),
          deviceId: currentDevId
        })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("children_wordbox_active_key", key.trim().toUpperCase());
        setActiveCardKey(key.trim().toUpperCase());
        setIsActivated(true);
        initLocalProgress();
        showToast(isStartup ? "成功读取激活状态，欢迎回来！✨" : "卡密激活成功，英语冒险之旅开启！🎒");
      } else {
        localStorage.removeItem("children_wordbox_active_key");
        setIsActivated(false);
        setAuthError(data.message || "您输入的卡密已被激活或已失效，请联系管理员！");
      }
    } catch (err) {
      if (isStartup) {
        // Safe offline use mode
        const cachedKey = localStorage.getItem("children_wordbox_active_key");
        if (cachedKey) {
          setActiveCardKey(cachedKey);
          setIsActivated(true);
          initLocalProgress();
          showToast("离线模式：已加载本地词库大冒险 ✨");
        } else {
          setAuthError("网路连接不佳，卡密校验失败，请重试！📶");
        }
      } else {
        setAuthError("连接服务器超时，无法验证该卡密，请稍后再试！📶");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Load hardware/browser device fingerprint
  useEffect(() => {
    let storedDeviceId = localStorage.getItem("children_wordbox_device_id");
    if (!storedDeviceId) {
      storedDeviceId = "dev-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
      localStorage.setItem("children_wordbox_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Read stored key
    const cachedKey = localStorage.getItem("children_wordbox_active_key");
    if (cachedKey) {
      triggerKeyVerification(cachedKey, storedDeviceId, true);
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Handle explicit automatic or manual logout
  const handleExplicitLogout = (msg?: string) => {
    localStorage.removeItem("children_wordbox_active_key");
    setActiveCardKey("");
    setIsActivated(false);
    if (msg) {
      setAuthError(msg);
    } else {
      setAuthError("");
    }
  };

  // Helper show successful feedback notification
  const showToast = (text: string) => {
    setSuccessToast(text);
    setTimeout(() => {
      setSuccessToast("");
    }, 2800);
  };

  // Export words backup structure downloader (.txt format)
  const handleExportWordsTxt = () => {
    if (words.length === 0) {
      alert("当前没有可导出的单词！🌸");
      return;
    }

    let resultTxt = "";

    // Group words by boxId and print according to strict schema
    wordBoxes.forEach((box) => {
      const boxWords = words.filter(w => w.boxId === box.id || (box.id === "box-default" && !w.boxId));
      if (boxWords.length > 0) {
        const wordsStr = boxWords.map(w => w.word.trim()).join(",");
        resultTxt += `【${box.icon} ${box.name}】\n`;
        resultTxt += `${wordsStr}\n\n`;
      }
    });

    // Handle any orphaned categories
    const boxIds = wordBoxes.map(b => b.id);
    const orphanWords = words.filter(w => w.boxId && !boxIds.includes(w.boxId));
    if (orphanWords.length > 0) {
      const orphanStr = orphanWords.map(w => w.word.trim()).join(",");
      resultTxt += `【🎒 未分类/其他单词】\n`;
      resultTxt += `${orphanStr}\n\n`;
    }

    // Trim trailing newlines
    resultTxt = resultTxt.trim();

    // Spawn a direct browser blob streaming download
    const blob = new Blob([resultTxt], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `冒险词盒备份_${new Date().toISOString().substring(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("卡片备份：单词已成功导出为纯文本文件！📝");
  };

  // UI state-altering word additions
  const handleAddWord = (wordObj: Word) => {
    const updated = [wordObj, ...words];
    setWords(updated);
    const updatedStars = stars + 5; // 5 stars for custom additions
    setStars(updatedStars);
    saveLocalProgress(updated, updatedStars, wordBoxes);
    showToast("添加自定义卡片，额外获得 5 颗能量小星星！🍪");
  };

  const handleAddWords = (newWords: Word[]) => {
    const existingLabels = new Set(words.map(w => w.word.toLowerCase()));
    const filteredNew = newWords.map(w => ({
      ...w,
      boxId: w.boxId || "box-default"
    })).filter(w => !existingLabels.has(w.word.toLowerCase()));

    const updated = [...filteredNew, ...words];
    setWords(updated);
    const updatedStars = stars + (5 * filteredNew.length);
    setStars(updatedStars);
    saveLocalProgress(updated, updatedStars, wordBoxes);
    showToast(`批量获取生动词汇，获得 ${5 * filteredNew.length} 颗闪耀能量星！🌟`);
  };

  const handleEditWord = (wordId: string, updatedFields: Partial<Word>) => {
    const updated = words.map(w => w.id === wordId ? { ...w, ...updatedFields } : w);
    setWords(updated);
    saveLocalProgress(updated, stars, wordBoxes);
  };

  const handleDeleteWord = (wordId: string) => {
    const updated = words.filter(w => w.id !== wordId);
    setWords(updated);
    saveLocalProgress(updated, stars, wordBoxes);
    showToast("成功移除该单词。✨");
  };

  const handleAddWordBox = (newBox: WordBox) => {
    const updatedBoxes = [...wordBoxes, newBox];
    setWordBoxes(updatedBoxes);
    const updatedStars = stars + 10; // Extra star reward
    setStars(updatedStars);
    saveLocalProgress(words, updatedStars, updatedBoxes);
    showToast("成功装载全新词箱，获得 10 颗能量星！🦁");
  };

  const handleDeleteWordBox = (boxId: string) => {
    if (boxId === "box-default") return;
    const updatedBoxes = wordBoxes.filter(b => b.id !== boxId);
    setWordBoxes(updatedBoxes);
    // Move orphaned words back to defaults
    const updatedWords = words.map(w => w.boxId === boxId ? { ...w, boxId: "box-default" } : w);
    setWords(updatedWords);
    saveLocalProgress(updatedWords, stars, updatedBoxes);
  };

  const handleToggleProgress = (wordId: string) => {
    let earnedAdd = 0;
    const updated = words.map(w => {
      if (w.id === wordId) {
        const next = w.progress === 'mastered' ? 'learning' : 'mastered';
         if (next === 'mastered') {
           earnedAdd = 15; // 15 stars for mastery
         }
         return { ...w, progress: next };
      }
      return w;
    });
    setWords(updated);
    const updatedStars = stars + earnedAdd;
    if (earnedAdd > 0) {
      setStars(updatedStars);
    }
    saveLocalProgress(updated, updatedStars, wordBoxes);
    if (earnedAdd > 0) {
      showToast("棒极了！您又学会了一个单词，获得 15 颗星星奖励！💮");
    }
  };

  const handleAwardStars = (count: number) => {
    const updatedStars = stars + count;
    setStars(updatedStars);
    saveLocalProgress(words, updatedStars, wordBoxes);
    showToast(`哇！完成趣味大练习，小勇士收获了 ${count} 颗星星！🍭`);
  };


  // -----------------------------------------------------------------
  // ADMIN PORTAL SERVICES
  // -----------------------------------------------------------------
  const submitAdminLoginDirect = async (user: string, pass: string) => {
    setAdminError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.trim(),
          password: pass.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminToken(data.token);
        fetchAdminUsers(data.token);
        setAdminUsernameInput("");
        setAdminPasswordInput("");
        showToast("管理员登录成功，欢迎查看后台监控中心 🔒");
      } else {
        setAdminError(data.message || "账号或密码不匹配");
      }
    } catch (err) {
      setAdminError("远程后台连接请求超时！📶");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    submitAdminLoginDirect(adminUsernameInput, adminPasswordInput);
  };

  const handleQuickAdminLogin = () => {
    setAdminUsernameInput("admin");
    setAdminPasswordInput("admin123");
    submitAdminLoginDirect("admin", "admin123");
  };

  const fetchAdminUsers = async (token = adminToken) => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.users);
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    }
  };

  const handleGenerateUsers = async () => {
    if (!adminToken) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: adminToken,
          count: generateCount
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.users);
        showToast(`成功批量生成 ${data.count} 组全新卡通账号卡密！`);
      }
    } catch (e) {
      showToast("服务器忙，生成账号失败，请重试！");
    } finally {
      setGenerating(false);
    }
  };

  const copyTextToClipboard = (text: string, label = "复制成功！") => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        showToast(`${label} ✨`);
      } else {
        throw new Error();
      }
    } catch (err) {
      // Robust standard copy-to-input selection fallback
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
        showToast(`${label} 📎`);
      } catch (e) {
        showToast("浏览器不支持卡密自动复制，请手动选中复制");
      }
      document.body.removeChild(el);
    }
  };

  const copyAllUnused = () => {
    const unused = adminUsers.filter(u => !u.activated);
    if (unused.length === 0) {
      showToast("当前没有未激活的数据可以被分发 🎒");
      return;
    }

    let out = "🎒 ===== 英语单词乐园 · 专属账号卡密分发单 =====\n";
    unused.forEach((u, i) => {
      out += `${i + 1}. 账号: ${u.username}   密码: ${u.passwordPlain}   激活卡密: ${u.activationKey}\n`;
    });
    out += "===============================================\n💡 账号首次登录进入乐园时输入该卡密激活即可永久使用设备绑定！";

    copyTextToClipboard(out, "一键复制全部分发文本成功！");
  };

  const copyRow = (row: any) => {
    const t = `账号: ${row.username}  密码: ${row.passwordPlain}  卡密: ${row.activationKey}`;
    copyTextToClipboard(t, "卡片信息复制成功！");
  };

  const handleRevokeKey = async (username: string, revoke: boolean) => {
    if (!adminToken) return;
    try {
      const res = await fetch("/api/admin/revoke-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: adminToken,
          username,
          revoke
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.users);
        showToast(revoke ? "该卡密已成功作废，不可继续激活绑定！🚫" : "已成功恢复该卡密为可用状态！❇️");
      } else {
        showToast(data.message || "操作失败，请重试！");
      }
    } catch (e) {
      showToast("网络请求超时，无法提交作废操作。📶");
    }
  };


  // -----------------------------------------------------------------
  // VIEW RENDERER LOGIC
  // -----------------------------------------------------------------

  // SUCCESS TOAST COMPONENT
  const ToastNotification = () => (
    <AnimatePresence>
      {successToast && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 bg-[#FF7B94] border-4 border-black text-white rounded-2xl shadow-neo font-black tracking-wide flex items-center gap-2 text-sm max-w-sm w-[90%]"
        >
          <span className="text-xl">🍭</span>
          <span>{successToast}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // AUTH STATE: LOADING
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center justify-center p-4 font-sans select-none relative">
        <ToastNotification />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD93D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="bg-white border-4 border-black p-8 rounded-[32px] shadow-neo max-w-sm w-full text-center relative z-10">
          <div className="w-20 h-20 bg-[#FFD93D] text-black border-2 border-black rounded-2xl flex items-center justify-center text-4xl shadow-neo-sm mx-auto mb-6 animate-bounce">
            🍪
          </div>
          <h2 className="text-xl font-black mb-2 tracking-tight">欢乐词盒加载中...</h2>
          <p className="text-xs text-slate-500 font-bold mb-5">正在连接卡通云端数据库... 🚀</p>
          <div className="w-full bg-[#FEF2F2] border-2 border-black h-4 rounded-full overflow-hidden">
            <div 
              className="bg-[#6BCB77] h-full transition-all duration-300"
              style={{ width: "90%", animation: "pulse 1.5s infinite" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // PORTAL STATE: ADMIN SECTION
  if (showAdminEntry) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 antialiased font-sans relative">
        <ToastNotification />
        
        {/* Admin Header */}
        <header className="p-4 bg-slate-900 text-white border-b-4 border-black flex justify-between items-center whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span className="font-mono font-black text-xs sm:text-sm tracking-widest uppercase">VOCAB ADMIN PANEL</span>
          </div>
          <button 
            onClick={() => {
              setShowAdminEntry(false);
              setAdminToken(null);
              setAdminError("");
            }}
            className="px-3 py-1 bg-rose-500 hover:bg-rose-600 font-bold text-xs text-white border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000] cursor-pointer"
          >
            退出后台
          </button>
        </header>

        {/* ADMIN LOGIN */}
        {!adminToken ? (
          <div className="max-w-md mx-auto px-4 mt-16">
            <div className="bg-white border-4 border-black p-6 sm:p-8 rounded-[32px] shadow-[6px_6px_0px_0px_#000]">
              <div className="w-12 h-12 bg-amber-400 border-2 border-black rounded-xl flex items-center justify-center text-xl shadow-[3px_3px_0px_0px_#000] mb-4">
                🔐
              </div>
              <h2 className="text-xl font-black mb-2 flex items-center gap-1.5 leading-none">
                管理员身份认证
              </h2>
              <div className="bg-amber-50 border-2 border-amber-300 p-3 rounded-xl text-[11px] font-bold text-amber-800 space-y-1.5 mb-4 leading-normal">
                <p className="font-extrabold text-xs">💡 推荐内置管理员凭证：</p>
                <div className="flex justify-between"><span>账号 username:</span> <code className="bg-amber-100 px-1 py-0.5 rounded font-mono select-all">admin</code></div>
                <div className="flex justify-between"><span>密码 password:</span> <code className="bg-amber-100 px-1 py-0.5 rounded font-mono select-all">admin123</code></div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-black mb-1.5 text-slate-700">管理员账号</label>
                  <input
                    type="text"
                    required
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    placeholder="请输入管理员账号"
                    className="w-full px-4 py-2.5 font-bold bg-slate-50 border-2 border-black rounded-xl text-sm focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5 text-slate-700">安全密钥密码</label>
                  <input
                    type="password"
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="请输入管理员密码"
                    className="w-full px-4 py-2.5 font-bold bg-slate-50 border-2 border-black rounded-xl text-sm focus:outline-none focus:ring-0"
                  />
                </div>

                {adminError && (
                  <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-400 hover:bg-amber-500 border-2 border-black text-black font-black text-xs sm:text-sm rounded-xl shadow-[3px_3px_0px_0px_#000] cursor-pointer"
                  >
                    确认登录后台 🔑
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickAdminLogin}
                    className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-black rounded-xl font-black text-xs shadow-[3px_3px_0px_0px_#000] cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>⚡ 一键填入默认凭证并登录 ⚡</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* ADMIN DASHBOARD */
          <div className="max-w-4xl mx-auto px-4 mt-8">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                  探险家词盒账号控制台 🚀
                </h1>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  在此可以批量派发账号、密码与一站式永久专属激活激活码并跟踪使用状态。
                </p>
              </div>
              <button
                onClick={() => fetchAdminUsers()}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 border-2 border-black rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>刷新数据</span>
              </button>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_0px_#000]">
                <div className="text-xs text-slate-500 font-bold">已注册总账号</div>
                <div className="text-2xl font-black mt-1 text-slate-900">{adminUsers.length}</div>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_0px_#000]">
                <div className="text-xs text-slate-500 font-bold">已激活学生账户</div>
                <div className="text-2xl font-black mt-1 text-emerald-500">
                  {adminUsers.filter(u => u.activated).length}
                </div>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[3px_3px_0px_0px_#000] col-span-2 md:col-span-1">
                <div className="text-xs text-slate-500 font-bold">未使用/可派发</div>
                <div className="text-2xl font-black mt-1 text-indigo-500">
                  {adminUsers.filter(u => !u.activated).length}
                </div>
              </div>
            </div>

            {/* CONTROL PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Generate New Credentials Column */}
              <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_#000] md:col-span-5">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-1.5 pb-2 border-b-2 border-slate-100">
                  <span>🛠️ 批量生成学生钥匙</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">生成学生数量</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(Number(e.target.value) || 10)}
                        className="w-24 px-3 py-1.5 text-center font-black bg-slate-50 border-2 border-black rounded-lg focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-slate-400 self-center">（每次限 1-100 组）</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateUsers}
                    disabled={generating}
                    className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-black rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000] cursor-pointer disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>正在生成中...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀 确认批量生成 🚀</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={copyAllUnused}
                    className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-black rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>一键复制所有未使用账号分发文本</span>
                  </button>
                </div>
              </div>

              {/* View / Clipboard Table List Column */}
              <div className="bg-white border-4 border-black p-5 rounded-[24px] shadow-[4px_4px_0px_0px_#000] md:col-span-7">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-2 border-b-2 border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span>📋 账号密码与卡密库列表</span>
                  </h3>
                  
                  {/* Search inside dashboard */}
                  <div className="relative w-full sm:w-48 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="搜搜索账号..."
                      value={userSearchText}
                      onChange={(e) => setUserSearchText(e.target.value.toLowerCase())}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border-2 border-black rounded-lg text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* USER ROW LIST */}
                <div className="overflow-y-auto max-h-[400px] pr-1 space-y-3">
                  {adminUsers
                    .filter(u => !userSearchText || u.username.toLowerCase().includes(userSearchText))
                    .map((user, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-50 border-2 border-black p-3.5 rounded-xl flex flex-col justify-between items-start gap-3 md:flex-row md:items-center"
                      >
                        <div className="space-y-1 font-mono text-xs w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-sans font-black text-xs text-slate-800">账号：</span>
                            <span className="bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded border border-indigo-200">
                              {user.username}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>密码：</span>
                            <span className="font-extrabold text-slate-600">{user.passwordPlain}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>激活卡密：</span>
                            <span className="font-black text-[#FF6B6B] bg-[#FFF5F5] border border-red-200 px-1 py-0.2 rounded">
                              {user.activationKey}
                            </span>
                          </div>
                          
                          {/* Devices active count tracking */}
                          {user.activated && user.lastActiveDates && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Monitor className="w-3 h-3 text-slate-400" />
                                <span>在线状态：</span>
                              </span>
                              <span>
                                {Object.values(user.lastActiveDates).filter((t: any) => Date.now() - t < 10*60*1000).length}台设备在线
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center w-full md:w-auto shrink-0 pt-2 border-t border-dashed border-slate-200 md:pt-0 md:border-0 md:flex-col md:gap-2">
                          {user.revoked ? (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded border flex items-center gap-1 bg-slate-200 text-slate-500 border-slate-400">
                              <span>🚫 已作废</span>
                            </span>
                          ) : user.activated ? (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded border flex items-center gap-1 bg-blue-50 text-blue-600 border-blue-400">
                              <CheckCircle2 className="w-3 h-3 text-blue-500" />
                              <span>已激活</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded border flex items-center gap-1 bg-emerald-50 text-emerald-600 border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>未激活</span>
                            </span>
                          )}

                          <div className="flex gap-2 md:flex-col md:w-full">
                            <button
                              onClick={() => copyRow(user)}
                              className="px-2 py-1 bg-[#6BCB77] hover:bg-[#59b865] text-white text-[10px] font-black border-2 border-black rounded-lg flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer active:translate-y-px"
                            >
                              <Copy className="w-3 h-3" />
                              <span>复制</span>
                            </button>

                            {user.revoked ? (
                              <button
                                onClick={() => handleRevokeKey(user.username, false)}
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black border-2 border-black rounded-lg flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer active:translate-y-px"
                              >
                                <span>激活卡密</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRevokeKey(user.username, true)}
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-600 text-[10px] font-black border-2 border-black rounded-lg flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer active:translate-y-px"
                              >
                                <span>作废卡密</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {adminUsers.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold font-sans">
                      🛸 空空如也，请先点击生成账号！
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PORTAL STATE: LOGIN INTERFACE (NOT UNLOCKED/ACTIVATED)
  if (!isActivated) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex flex-col items-center justify-center p-4 font-sans select-none relative">
        <ToastNotification />
        
        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD93D]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-white border-4 border-black p-6 sm:p-8 rounded-[36px] shadow-neo max-w-md w-full relative z-10 transition">
          <div className="w-16 h-16 bg-[#FF6B6B] text-white border-2 border-black rounded-2xl flex items-center justify-center text-3xl shadow-neo-sm mx-auto mb-5 transform hover:rotate-6 transition">
            🎒
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black mb-1.5 text-center text-black tracking-tight">
            单词乐园 · 冒险起航
          </h1>
          <p className="text-slate-500 font-bold text-xs text-center mb-6">
            每一位单词小探险家，输入您的专属永久卡密即可解锁词盒
          </p>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!cardKeyInput.trim()) {
                setAuthError("请输入合法的专属永久卡密 💮");
                return;
              }
              triggerKeyVerification(cardKeyInput, deviceId, false);
            }} 
            className="space-y-4"
          >
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-black text-slate-600 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                <span>专属永久卡密</span>
              </label>
              <input
                type="text"
                required
                value={cardKeyInput}
                onChange={(e) => {
                  setCardKeyInput(e.target.value.toUpperCase());
                  setAuthError("");
                }}
                placeholder="KID-XXXX-XXXX"
                className="w-full px-4 py-3 bg-[#FFFBEB] border-4 border-black rounded-2xl font-mono text-sm text-center text-black font-black uppercase tracking-wider focus:outline-none focus:ring-0 placeholder-slate-400 cursor-text animate-pulse-once"
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-rose-50 border-2 border-rose-400 text-rose-600 rounded-xl text-xs font-black text-left flex items-start gap-1"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-[#6BCB77] hover:bg-[#59b865] text-white font-black text-sm rounded-2xl border-4 border-black shadow-neo-sm hover:translate-y-0.5 active:translate-y-1 transition duration-150 cursor-pointer flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>正在验证中...</span>
                </>
              ) : (
                <span>【验证进入】 🚀</span>
              )}
            </button>
          </form>

          {/* Guideline reminder (Rule 4) */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200">
            <h4 className="text-xs font-black text-slate-800 text-left">💡 注意卡密激活规则：</h4>
            <ul className="text-[11px] text-slate-500 text-left mt-1.5 space-y-1.5 font-bold list-disc list-inside leading-normal">
              <li>卡密仅可激活一次，永久使用，绑定当前设备或浏览器。</li>
              <li>本机不换设备/浏览器、不清缓存可永久正常使用，无需重复输卡密。</li>
              <li>更换设备请先导出备份。在新设备下使用需要输入有效卡密重新激活绑定。</li>
            </ul>
          </div>

          {/* Quick entry for Admin Login */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-200 text-center">
            <button
              onClick={() => {
                setShowAdminEntry(true);
                setAdminError("");
              }}
              className="text-xs font-black text-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>管理员后台入口</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PORTAL STATE: FULL ACCESS VOCAB APPLICATION (AUTHENTICATED)
  return (
    <div className="min-h-screen bg-[#FFFBEB] text-black pb-16 antialiased font-sans relative">
      <ToastNotification />
      
      {/* Background radial effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD93D]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF6B6B]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logged in bar */}
      <div className="bg-white border-b-4 border-black p-3 sticky top-0 z-40 shadow-neo-sm">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">👋</span>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-slate-800">小探险家</span>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-[#FF6B6B] leading-none">
                卡密: {activeCardKey ? `${activeCardKey.slice(0, 8)}...` : "已激活设备"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWordsTxt}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-extrabold text-xs border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex items-center gap-1 cursor-pointer active:translate-y-px"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导出单词备份</span>
              <span className="sm:hidden">导出</span>
            </button>

            <button
              onClick={() => handleExplicitLogout()}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-600 font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出状态</span>
            </button>
          </div>
        </div>
      </div>

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
                  onToggleProgress={handleToggleProgress}
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

      {/* Footer credits and Admin toggle button */}
      <footer className="mt-20 text-center select-none flex flex-col items-center justify-center gap-2 text-[11px] text-slate-400 font-medium tracking-wide">
        <div className="flex items-center gap-1 px-4">
          <HeartHandshake className="w-4.5 h-4.5 text-rose-300" />
          <span>专为孩子们设计，随时添加词汇开启奇妙的英语大冒险！数据将自动保存在免费安全的国内和云端数据库中。 🚀</span>
        </div>
        <button
          onClick={() => {
            setShowAdminEntry(true);
            setAdminError("");
          }}
          className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-400 hover:text-slate-600 font-bold rounded-lg border-2 border-slate-200 cursor-pointer flex items-center gap-1 shadow-sm transition"
        >
          <Lock className="w-2.5 h-2.5" />
          <span>🔐 进入管理后台控制台</span>
        </button>
      </footer>
    </div>
  );
}
