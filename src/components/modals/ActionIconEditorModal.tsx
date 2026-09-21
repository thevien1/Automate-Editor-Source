import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Search,
  Copy,
  RotateCcw,
  Palette,
} from '../common/Icons';
import {
  getStoredCustomIcons,
  saveCustomIconOverride,
  deleteCustomIconOverride,
  CustomIconOverride,
  getActionIconConfig,
} from '../common/ActionIcon';

interface ActionIconEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName: string;
  actionType?: number;
}

// Danh sách các icon Bootstrap phổ biến nhất cho Automation
const POPULAR_BOOTSTRAP_ICONS = [
  'cursor',
  'cursor-fill',
  'arrows-move',
  'mouse',
  'mouse2',
  'mouse3',
  'hand-index',
  'hand-index-thumb',
  'play-fill',
  'pause-fill',
  'stop-fill',
  'arrow-repeat',
  'arrow-clockwise',
  'globe2',
  'link-45deg',
  'link',
  'clock',
  'hourglass-split',
  'camera',
  'image',
  'search',
  'file-earmark-text',
  'file-earmark-excel',
  'file-earmark-image',
  'folder2',
  'folder-plus',
  'folder-check',
  'diagram-3',
  'scissors',
  'key-fill',
  'shield-check',
  'terminal',
  'display',
  'phone',
  'keyboard',
  'gear-fill',
  'sliders',
  'code-slash',
  'code-square',
  'lightning-charge-fill',
  'stars',
  'box-seam',
  'check-circle-fill',
  'exclamation-triangle-fill',
  'plus-lg',
  'dash-lg',
  'shuffle',
  'calculator',
  'dice-5',
  'envelope',
  'clipboard-check',
  'download',
  'floppy',
  'robot',
  'cpu',
  'wifi',
];

const PRESET_COLORS = [
  { label: 'Blue (Xanh dương)', hex: '#1677ff' },
  { label: 'Sky (Xanh biển)', hex: '#0284c7' },
  { label: 'Emerald (Xanh lá)', hex: '#10b981' },
  { label: 'Amber (Cam vàng)', hex: '#f59e0b' },
  { label: 'Red (Đỏ)', hex: '#ef4444' },
  { label: 'Purple (Tím)', hex: '#a855f7' },
  { label: 'Pink (Hồng)', hex: '#ec4899' },
  { label: 'Slate (Xám)', hex: '#64748b' },
  { label: 'White (Trắng)', hex: '#ffffff' },
  { label: 'Dark (Tối)', hex: '#0f172a' },
];

const getBootstrapIconForAction = (name: string, type?: number): string => {
  const n = (name || '').toLowerCase();
  if (n === 'for' || n.includes('for')) return 'repeat';
  if (n === 'while' || n.includes('while')) return 'arrow-repeat';
  if (n === 'if' || n.includes('else if')) return 'diagram-3';
  if (n.includes('else')) return 'arrow-return-right';
  if (n.includes('block')) return 'box-seam';
  if (n === 'mouse move' || type === 50) return 'arrows-move';
  if (n.includes('mouse') || n.includes('click') || type === 48 || type === 49) return 'cursor';
  if (n.includes('key') || type === 54) return 'keyboard';
  if (n.includes('url') || type === 39) return 'link-45deg';
  if (n.includes('delay') || n.includes('wait url') || type === 7) return 'clock';
  if (n.includes('wait') || type === 44 || type === 107) return 'hourglass-split';
  if (n.includes('stop') || type === 76) return 'stop-fill';
  if (n.includes('tab') || type === 36) return 'copy';
  if (n.includes('excel') || (type && [21, 22, 71, 74].includes(type))) return 'file-earmark-excel';
  if (n.includes('file') || (type && [13, 14, 15, 16, 17, 18, 19, 20].includes(type))) return 'file-earmark-text';
  if (n.includes('folder') || (type && [23, 24, 25, 26, 72].includes(type))) return 'folder2';
  if (n.includes('split') || type === 9) return 'scissors';
  if (n.includes('random') || type === 8 || type === 11) return 'dice-5';
  if (n.includes('math') || type === 12) return 'calculator';
  if (n.includes('2fa') || type === 81) return 'key-fill';
  if (n.includes('image') || (type && [108, 109, 110].includes(type))) return 'image';
  if (n.includes('search')) return 'search';
  if (n.includes('download') || type === 30) return 'download';
  if (n.includes('variable') || (type && [1, 2, 3, 4].includes(type))) return 'code-square';
  return 'play-fill';
};

export const ActionIconEditorModal: React.FC<ActionIconEditorModalProps> = ({
  isOpen,
  onClose,
  actionName,
  actionType,
}) => {
  const cleanKey = actionName.trim().toLowerCase();
  const defaultConfig = getActionIconConfig(actionName, actionType);
  const initialIcon = getBootstrapIconForAction(actionName, actionType);

  const [selectedColor, setSelectedColor] = useState<string>(defaultConfig.color);
  const [iconMode, setIconMode] = useState<'bootstrap_grid' | 'bootstrap_class' | 'svg'>('bootstrap_grid');
  const [selectedBootstrapIcon, setSelectedBootstrapIcon] = useState<string>(initialIcon);
  const [customClassInput, setCustomClassInput] = useState<string>(`bi-${initialIcon}`);
  const [customSvgInput, setCustomSvgInput] = useState<string>('');
  const [iconFilter, setIconFilter] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Nạp cấu hình đã lưu (nếu có)
  useEffect(() => {
    if (!isOpen) return;
    const initialDefaultIcon = getBootstrapIconForAction(actionName, actionType);
    const stored = getStoredCustomIcons()[cleanKey];
    if (stored) {
      setSelectedColor(stored.color || defaultConfig.color);
      if (stored.iconType === 'svg') {
        setIconMode('svg');
        setCustomSvgInput(stored.iconValue);
      } else {
        setIconMode('bootstrap_grid');
        setSelectedBootstrapIcon(stored.iconValue.replace(/^bi-/, ''));
        setCustomClassInput(stored.iconValue);
      }
    } else {
      setSelectedColor(defaultConfig.color);
      setSelectedBootstrapIcon(initialDefaultIcon);
      setCustomClassInput(`bi-${initialDefaultIcon}`);
      setCustomSvgInput('');
    }
    setCopiedCode(false);
    setSavedSuccess(false);
  }, [isOpen, cleanKey, defaultConfig.color, actionName, actionType]);

  if (!isOpen) return null;

  const currentIconValue =
    iconMode === 'svg'
      ? customSvgInput
      : iconMode === 'bootstrap_class'
      ? customClassInput
      : selectedBootstrapIcon;

  const handleSave = () => {
    const override: CustomIconOverride = {
      color: selectedColor,
      iconType: iconMode === 'svg' ? 'svg' : 'bootstrap',
      iconValue: currentIconValue,
    };
    saveCustomIconOverride(cleanKey, override);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    deleteCustomIconOverride(cleanKey);
    setSelectedColor(defaultConfig.color);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
  };

  const generateCodeSnippet = () => {
    let iconJsx = '';
    if (iconMode === 'svg') {
      iconJsx = customSvgInput || `<svg viewBox="0 0 24 24">...</svg>`;
    } else {
      const cls = currentIconValue.startsWith('bi-') ? currentIconValue : `bi-${currentIconValue}`;
      iconJsx = `<i className="bi ${cls}" />`;
    }

    return `'${cleanKey}': {
  color: '${selectedColor}',
  icon: ${iconJsx},
  label: '${actionName}',
},`;
  };

  const handleCopyCode = () => {
    const snippet = generateCodeSnippet();
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredIcons = POPULAR_BOOTSTRAP_ICONS.filter((name) =>
    name.toLowerCase().includes(iconFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0b1120] border border-[#cbd5e1] dark:border-[#1e293b] rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden text-left text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#080d19]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#1677ff] dark:text-[#38bdf8]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#0f172a] dark:text-[#f8fafc]">
                Đổi Icon & Màu sắc
              </div>
              <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                Action: <span className="font-semibold text-[#1677ff] dark:text-[#38bdf8]">{actionName}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Live Preview Card */}
          <div className="p-3 rounded-lg border border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#060a14] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block mb-1">
                Xem trước (Live Preview):
              </span>
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-8 h-8 rounded-lg bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] flex items-center justify-center text-base shadow-2xs"
                  style={{ color: selectedColor }}
                >
                  {iconMode === 'svg' && customSvgInput ? (
                    <span
                      className="w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{ __html: customSvgInput }}
                    />
                  ) : (
                    <i
                      className={`bi ${
                        currentIconValue.startsWith('bi-') ? currentIconValue : `bi-${currentIconValue}`
                      }`}
                    />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-xs text-[#0f172a] dark:text-[#f8fafc]">
                    {actionName}
                  </div>
                  <div className="text-[10px] font-mono text-[#64748b]">
                    Màu: <span style={{ color: selectedColor }}>{selectedColor}</span> | Icon: {currentIconValue}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
              Tự động lưu & áp dụng
            </div>
          </div>

          {/* Color Chooser */}
          <div className="space-y-1.5">
            <label className="font-bold text-[11px] text-[#334155] dark:text-[#cbd5e1] block">
              1. Chọn màu hiển thị (Color):
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 relative flex items-center justify-center ${
                    selectedColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-[#0f172a] dark:border-white shadow-sm scale-105'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {selectedColor.toLowerCase() === c.hex.toLowerCase() && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        c.hex === '#ffffff' ? 'text-black' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              ))}

              <div className="flex items-center space-x-1 ml-auto">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-gray-300 p-0"
                  title="Màu tùy chọn"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-xs font-mono border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white"
                  placeholder="#1677ff"
                />
              </div>
            </div>
          </div>

          {/* Icon Chooser Mode Tabs */}
          <div className="space-y-2 pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
            <label className="font-bold text-[11px] text-[#334155] dark:text-[#cbd5e1] block">
              2. Chọn Icon mới:
            </label>
            <div className="flex border-b border-[#e2e8f0] dark:border-[#1e293b] space-x-2">
              <button
                type="button"
                onClick={() => setIconMode('bootstrap_grid')}
                className={`pb-1.5 font-medium border-b-2 transition-colors ${
                  iconMode === 'bootstrap_grid'
                    ? 'border-[#1677ff] text-[#1677ff] dark:text-[#38bdf8]'
                    : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Thư viện Bootstrap Icons
              </button>
              <button
                type="button"
                onClick={() => setIconMode('bootstrap_class')}
                className={`pb-1.5 font-medium border-b-2 transition-colors ${
                  iconMode === 'bootstrap_class'
                    ? 'border-[#1677ff] text-[#1677ff] dark:text-[#38bdf8]'
                    : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Nhập class trực tiếp (bi-...)
              </button>
              <button
                type="button"
                onClick={() => setIconMode('svg')}
                className={`pb-1.5 font-medium border-b-2 transition-colors ${
                  iconMode === 'svg'
                    ? 'border-[#1677ff] text-[#1677ff] dark:text-[#38bdf8]'
                    : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Mã SVG tùy biến
              </button>
            </div>

            {/* Mode 1: Searchable Grid of Bootstrap Icons */}
            {iconMode === 'bootstrap_grid' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={iconFilter}
                    onChange={(e) => setIconFilter(e.target.value)}
                    placeholder="Tìm icon (mouse, cursor, arrows, gear, globe...)"
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded focus:border-[#1677ff] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-8 gap-1.5 max-h-44 overflow-y-auto p-1 border border-[#e2e8f0] dark:border-[#1e293b] rounded bg-white dark:bg-[#080d19]">
                  {filteredIcons.map((ic) => {
                    const isSelected = selectedBootstrapIcon === ic;
                    return (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setSelectedBootstrapIcon(ic)}
                        className={`p-2 rounded flex flex-col items-center justify-center border transition-all text-base ${
                          isSelected
                            ? 'border-[#1677ff] bg-blue-50 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] shadow-xs'
                            : 'border-transparent hover:border-gray-200 dark:hover:border-gray-800 text-[#334155] dark:text-[#cbd5e1] hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                        title={ic}
                      >
                        <i className={`bi bi-${ic}`} />
                        <span className="text-[8px] truncate max-w-[40px] font-mono mt-0.5 opacity-70">
                          {ic}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Direct Bootstrap Class Input */}
            {iconMode === 'bootstrap_class' && (
              <div className="space-y-1.5 p-2 bg-[#f8fafc] dark:bg-[#080d19] rounded border border-[#e2e8f0] dark:border-[#1e293b]">
                <span className="text-[11px] text-[#64748b]">
                  Nhập tên class từ trang{' '}
                  <a
                    href="https://icons.getbootstrap.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1677ff] underline"
                  >
                    icons.getbootstrap.com
                  </a>
                  :
                </span>
                <input
                  type="text"
                  value={customClassInput}
                  onChange={(e) => setCustomClassInput(e.target.value)}
                  placeholder="ví dụ: bi-arrows-move hoặc arrows-move"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded focus:border-[#1677ff] focus:outline-none"
                />
              </div>
            )}

            {/* Mode 3: SVG code */}
            {iconMode === 'svg' && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-[#64748b]">
                  Dán mã XML SVG (có thẻ <code className="font-mono">&lt;svg&gt;...&lt;/svg&gt;</code>):
                </span>
                <textarea
                  rows={4}
                  value={customSvgInput}
                  onChange={(e) => setCustomSvgInput(e.target.value)}
                  placeholder='<svg viewBox="0 0 24 24" fill="currentColor">...</svg>'
                  className="w-full p-2 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded focus:border-[#1677ff] focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0] dark:border-[#1e293b] bg-[#f8fafc] dark:bg-[#080d19]">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded border border-[#cbd5e1] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-[#64748b] hover:text-[#0f172a] transition-colors flex items-center space-x-1"
              title="Khôi phục icon và màu mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Mặc định</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1.5 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#1677ff] dark:text-[#38bdf8] transition-colors flex items-center space-x-1"
              title="Sao chép đoạn mã TypeScript để dán trực tiếp vào file ActionIcon.tsx"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Đã copy code!' : 'Copy code'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-[#d9d9d9] dark:border-[#334155] hover:bg-gray-100 dark:hover:bg-gray-800 text-[#475569] dark:text-[#94a3b8] transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-[#1677ff] hover:bg-[#4096ff] text-white font-medium shadow-xs transition-colors flex items-center space-x-1.5"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-white animate-bounce" /> : null}
              <span>{savedSuccess ? 'Đã lưu vĩnh viễn!' : 'Lưu áp dụng'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionIconEditorModal;
