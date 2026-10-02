import React, { useState } from 'react';
import { ActionPropsCommon } from '../types';
import { CommonActionFooter } from '../CommonActionFooter';
import { FileText, FolderOpen, Copy, Check, Terminal, Sparkles } from '../../../common/Icons';

export const FB_POST_EXTRACTOR_JS = `// =======================================================
// TRÍCH XUẤT NỘI DUNG VÀ ẢNH FACEBOOK DIALOG (ĐA NGÔN NGỮ)
// =======================================================

// 1. Khóa chặt phạm vi vào Dialog đang hiển thị ngoài cùng
const dialogs = document.querySelectorAll('div[role="dialog"]');
const root = dialogs.length > 0 ? dialogs[dialogs.length - 1] : document.body;

// 2. Click "Xem thêm" / "See more" hỗ trợ mọi quốc gia
const seeMoreBtns = root.querySelectorAll('div[role="button"]');
const seeMoreKeywords = [
  'xem thêm', 'see more', 'ver más', 'voir plus', 'ver mais', 
  'mehr anzeigen', 'altro', 'ещё', '查看更多', 'もっと見る', '더 보기', 'ดูเพิ่มเติม', 'lihat selengkapnya'
];

for (const btn of seeMoreBtns) {
  const txt = (btn.innerText || '').trim().toLowerCase();
  const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
  const isMatch = seeMoreKeywords.some(kw => txt === kw || label === kw || txt.includes(kw) || label.includes(kw));
  if (isMatch) {
    try { btn.click(); } catch(e) {}
    break;
  }
}

// 3. Trích xuất nội dung văn bản (Content)
let content = '';
const msgEl = root.querySelector('div[data-ad-rendering-role="story_message"]') ||
              root.querySelector('div[data-ad-preview="message"]') ||
              root.querySelector('div[data-ad-comet-preview="message"]');

if (msgEl) {
  content = msgEl.innerText.trim();
} else {
  // Bộ lọc từ khóa hệ thống đa ngôn ngữ (loại bỏ like, comment, share, header)
  const excludePatterns = [
    'thích', 'like', 'me gusta', 'j’aime', 'curtir', 'gefällt mir', 'mi piace', 'нравится', '赞', 'いいね', '좋아요',
    'bình luận', 'comment', 'comentar', 'comentario', 'commentaire', 'kommentar', 'commento', 'комментарий', '评论', 'コメント', '댓글',
    'chia sẻ', 'share', 'compartir', 'partager', 'compartilhar', 'teilen', 'condividi', 'поделиться', '分享', 'シェア', '공유',
    'xem bản dịch', 'see translation', 'ver traducción', 'voir la traduction', 'ver tradução', 'übersetzung anzeigen',
    'bài viết của', "'s post", 'publicación de', 'publication de', 'publicação de', 'beitrag von'
  ];

  const autoEls = Array.from(root.querySelectorAll('div[dir="auto"]'));
  for (const el of autoEls) {
    const t = el.innerText.trim();
    const tLower = t.toLowerCase();
    const isExcluded = excludePatterns.some(p => tLower.includes(p));
    
    if (t.length > content.length && !isExcluded) {
      content = t;
    }
  }
}

// 4. Trích xuất ảnh bài viết (Hỗ trợ Ảnh đơn, Lưới Album, Thumbnail chia sẻ link)
const imgSet = new Set();
const allImgs = Array.from(root.querySelectorAll('img'));

for (const img of allImgs) {
  const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
  if (!src || src.startsWith('data:image/svg')) continue;
  
  // 4.1. Bỏ qua icon cảm xúc, emoji và hình trang trí Facebook
  if (src.includes('emoji.php') || src.includes('rsrc.php')) continue;

  // 4.2. Bỏ qua avatar người dùng (nằm trong thẻ SVG mask hoặc container avatar)
  if (img.closest('svg') || img.closest('mask') || img.closest('div[class*="x1vqgdyp"]')) continue;

  // 4.3. Lọc theo kích thước hiển thị trực tiếp (Nếu có)
  const rect = img.getBoundingClientRect();
  const w = img.naturalWidth || rect.width || parseInt(img.getAttribute('width') || '0', 10);
  const h = img.naturalHeight || rect.height || parseInt(img.getAttribute('height') || '0', 10);
  
  // Chỉ bỏ qua nếu chắc chắn kích thước là icon rất nhỏ (dưới 50px)
  if (w > 0 && h > 0 && (w < 50 || h < 50)) continue;

  // 4.4. Nhận diện ảnh bài viết theo cấu trúc thực tế:
  // - Ảnh có data-imgperflogname="feedImage"
  // - Nằm trong khối data-ad-rendering-role="image" (ảnh thumbnail link video/báo)
  // - Nằm trong thẻ a trỏ link /photo/ (ảnh đơn hoặc lưới album)
  // - Ảnh từ CDN scontent/fbcdn/external không thuộc avatar
  const isFeedImg = img.getAttribute('data-imgperflogname') === 'feedImage';
  const isInImageRole = !!img.closest('div[data-ad-rendering-role="image"]');
  const isInPhotoLink = !!img.closest('a[href*="/photo"]') || !!img.closest('a[href*="/photos/"]');
  const isCdnValid = src.includes('scontent') || src.includes('fbcdn.net') || src.includes('external-');

  if (isFeedImg || isInImageRole || isInPhotoLink || (isCdnValid && !img.closest('div[role="button"]'))) {
    imgSet.add(src);
  }
}

const images = Array.from(imgSet);

// 5. Trả về kết quả
return JSON.stringify({
  content: content,
  images: images,
  first_image: images[0] || "",
  image_count: images.length
});`;

const CODE_PRESETS = [
  {
    name: '🔥 Facebook: Lấy Content & Toàn bộ Ảnh',
    code: FB_POST_EXTRACTOR_JS,
  },
  {
    name: '📄 Lấy Title trang',
    code: 'return document.title;',
  },
  {
    name: '🔗 Lấy URL trang hiện tại',
    code: 'return window.location.href;',
  },
  {
    name: '📜 Cuộn trang xuống mượt mà',
    code: 'window.scrollBy({ top: 600, behavior: "smooth" });\nreturn "scrolled";',
  },
  {
    name: '🖱 Click phần tử bằng Selector',
    code: 'const el = document.querySelector("button[type=\'submit\']");\nif (el) { el.click(); return "clicked"; }\nreturn "not_found";',
  },
  {
    name: '🍪 Lấy Cookie toàn bộ trang',
    code: 'return document.cookie;',
  },
];

export const ExecuteJsCodeProps: React.FC<ActionPropsCommon> = ({
  actionNode,
  getRawVal,
  handleRawInputByKey,
  updateNode,
}) => {
  const [copied, setCopied] = useState(false);
  const codeVal = getRawVal('FILE_OR_CODE', 'return document.title;');

  const handleBrowseFile = async () => {
    try {
      if ((window as any).electronAPI?.openFileDialog) {
        const res = await (window as any).electronAPI.openFileDialog({
          title: 'Chọn file JavaScript (.js)',
          filters: [{ name: 'JavaScript Files', extensions: ['js'] }],
        });
        if (res && res.filePath) {
          handleRawInputByKey('FILE_OR_CODE', res.filePath);
        }
      }
    } catch (e) {
      console.error('Error opening file dialog:', e);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Code or File Path */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#1677ff] dark:text-[#38bdf8]" />
            Đường dẫn tới file js hoặc code
          </label>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handleBrowseFile}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border border-[#d9d9d9] dark:border-[#1e293b] text-[#475569] dark:text-[#94a3b8] hover:text-[#1677ff] dark:hover:text-[#38bdf8] hover:border-[#1677ff] dark:hover:border-[#38bdf8] transition-colors"
              title="Chọn file .js từ máy tính"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Browse .js</span>
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border border-[#d9d9d9] dark:border-[#1e293b] text-[#475569] dark:text-[#94a3b8] hover:text-[#1677ff] dark:hover:border-[#38bdf8] transition-colors"
              title="Sao chép toàn bộ code"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã chép' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Code Snippets Dropdown */}
        <div className="mb-2">
          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleRawInputByKey('FILE_OR_CODE', e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-2.5 py-1 text-[11px] bg-[#f8fafc] dark:bg-[#070d18] text-[#1e293b] dark:text-[#cbd5e1] border border-[#e2e8f0] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer appearance-none pr-7"
            >
              <option value="" disabled>
                ⚡ Chèn mã mẫu có sẵn (Facebook, DOM, URL...)...
              </option>
              {CODE_PRESETS.map((preset, idx) => (
                <option key={idx} value={preset.code}>
                  {preset.name}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b]">
              <Sparkles className="w-3 h-3 text-[#1677ff] dark:text-[#38bdf8]" />
            </div>
          </div>
        </div>

        {/* Multiline Code Textarea */}
        <div className="relative">
          <textarea
            value={codeVal}
            onChange={(e) => handleRawInputByKey('FILE_OR_CODE', e.target.value)}
            rows={12}
            spellCheck={false}
            placeholder={`// Viết mã JavaScript ở đây\n// Bắt buộc phải kết thúc bằng return <giá_trị>;\nreturn document.title;`}
            className="w-full px-3 py-2 text-xs font-mono bg-[#fdfdfd] dark:bg-[#0a0f1d] text-[#0f172a] dark:text-[#38bdf8] border border-[#cbd5e1] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none resize-y leading-relaxed"
          />
        </div>

        <div className="mt-1.5 p-2 bg-[#f0f9ff] dark:bg-[#081b2e] border border-[#bae6fd] dark:border-[#0369a1]/40 rounded text-[10px] text-[#0369a1] dark:text-[#7dd3fc] leading-tight flex items-start gap-1.5">
          <span className="font-bold">⚠️ Lưu ý GPM:</span>
          <span>Bắt buộc có lệnh <b>return</b> ở cuối để lưu kết quả vào biến đầu ra. Biến string nhúng dạng <code className="font-mono bg-white/60 dark:bg-black/40 px-1 rounded">`$var`</code>, biến số nhúng dạng <code className="font-mono bg-white/60 dark:bg-black/40 px-1 rounded">$index</code>.</span>
        </div>
      </div>

      {/* Output Variable Name */}
      <div>
        <label className="block text-[11px] font-medium text-[#475569] dark:text-[#94a3b8] mb-1.5">
          Tên biến đầu ra (Output Variable Name)
        </label>
        <div className="relative">
          <input
            type="text"
            value={actionNode.output_variable_name || ''}
            onChange={(e) => updateNode(actionNode.id, { output_variable_name: e.target.value })}
            placeholder="vd: post_data hoặc js_result"
            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none"
          />
        </div>
      </div>

      {/* Common Footer (Delay, Continue on Error, Note) */}
      <CommonActionFooter actionNode={actionNode} updateNode={updateNode} />
    </div>
  );
};
