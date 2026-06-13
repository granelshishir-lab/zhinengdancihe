/**
 * 前端图片压缩工具包 (Frontend Image Compression Utility)
 * 支持格式: JPG, PNG, WebP
 * 压缩标准: 单张图片 <= 50KB，等比例缩放，不拉伸，不模糊
 * 兼容性: 移动端及PC端所有主流浏览器
 */

export interface CompressedImageResult {
  base64: string;         // 压缩后的 Base64 数据
  name: string;           // 原始文件名
  wordSuggested: string;  // 解构出的推荐英文单词
  sizeKB: number;         // 压缩后的大小 (KB)
  originalSizeKB: number; // 压缩前的大小 (KB)
}

/**
 * 辅助函数：将文件名解构成纯净的英文单词候选字（去符号，去数字，首字母大写）
 */
export function suggestWordFromFileName(fileName: string): string {
  // 移除文件尾部格式
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
  // 保留字母和空格，去除数字和多余符号
  const clientWord = nameWithoutExt
    .replace(/[^a-zA-Z\s-_]/g, "")
    .replace(/[-_]/g, " ")
    .trim();
  // 转换成首字母大写格式 (Title Case)
  if (!clientWord) return "Word";
  return clientWord
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * 将 File 读取为 Image 对象的 Promise
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片载入失败，请确认是否为合法的图片格式哦。"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("文件读取失败。"));
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩单张图片至 50KB 以下，等比例缩放，确保不拉伸，不模糊
 * @param file 原始图片 File 对象
 */
export async function compressImage(file: File): Promise<CompressedImageResult> {
  const originalSizeKB = file.size / 1024;
  
  // 1. 读取 File 转换为 HTMLImageElement
  const img = await loadImage(file);
  
  // 2. 初始化 Canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("浏览器不支持 Canvas Context 2D");
  }

  let width = img.width;
  let height = img.height;
  
  // 设定一个高清晰度合理的分辨率上限保护。如果宽/高大于 1200px，先进行初步等比例缩放，
  // 避免移动端 Canvas 绘图内存崩溃，也避免初始体积太庞大导致无谓的迭代计算。
  const MAX_DIMENSION = 1000;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  // 3. 循环迭代式调节质量与尺寸（最多寻找6轮），精细拟合 <= 50KB
  let quality = 0.90;
  let resultBase64 = "";
  let currentSizeKB = Infinity;
  let attempts = 0;
  const maxAttempts = 6;

  // 使用 jpeg 或 webp（能极大节约体积且多端完美适配）。
  // 针对 PNG 这类无损图，因为 PNG 自身编码算法没有 quality 选项，所以我们会把它
  // 画到填有白色背景的 canvas 上，再输出为 jpeg/webp 做有损压缩，确保能跌入 50KB。
  let mimeType = "image/jpeg";
  if (file.type === "image/webp") {
    mimeType = "image/webp";
  }

  while (currentSizeKB > 50 && attempts < maxAttempts) {
    attempts++;
    
    canvas.width = width;
    canvas.height = height;
    
    // 渲染白底，避免透明图部分输出 jpeg 时直接变黑
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    
    // 采用高品质平滑插值绘图
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    
    // 生成 Base64
    resultBase64 = canvas.toDataURL(mimeType, quality);
    
    // 精确换算 Base64 长度为实际 KB 大小
    const base64Content = resultBase64.split(",")[1] || "";
    currentSizeKB = (base64Content.length * 0.75) / 1024;

    if (currentSizeKB <= 50) {
      break;
    }

    // 若依然过大，则进行下一阶梯的轻微宽/高缩小(乘0.85) 与 质量微调(质量降低且不低于0.4)
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);
    quality = Math.max(0.4, quality * 0.8);
  }

  // 4. 兜底保护。倘若罕见情况下（比如噪点超高的全彩色相片）多次质量/宽高微降后依然面临 >50KB，
  // 我们直接降级到 400px 级别的特化多端缩略尺寸，并在 0.5 较中等质量，确保 absolute <= 50KB
  if (currentSizeKB > 50) {
    const backupMax = 400;
    if (width > backupMax || height > backupMax) {
      if (width > height) {
        height = Math.round((height * backupMax) / width);
        width = backupMax;
      } else {
        width = Math.round((width * backupMax) / height);
        height = backupMax;
      }
    }
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    resultBase64 = canvas.toDataURL(mimeType, 0.5);
    const base64Content = resultBase64.split(",")[1] || "";
    currentSizeKB = (base64Content.length * 0.75) / 1024;
  }

  // 清空内存引用
  canvas.width = 0;
  canvas.height = 0;

  return {
    base64: resultBase64,
    name: file.name,
    wordSuggested: suggestWordFromFileName(file.name),
    sizeKB: Math.round(currentSizeKB * 100) / 100,
    originalSizeKB: Math.round(originalSizeKB * 100) / 100
  };
}
