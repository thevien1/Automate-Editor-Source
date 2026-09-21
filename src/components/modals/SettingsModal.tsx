import React, { useState, useEffect } from 'react';
import { X, Settings, Palette, Key, Sparkles, Check, Eye, EyeOff, Save, RefreshCw } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'SV Blue', value: '#1677ff' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Crimson', value: '#ef4444' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    themePreference,
    setTheme,
    accentColor,
    setAccentColor,
    updateInfo,
    isCheckingUpdate,
    checkAppUpdate,
    setShowUpdateModal,
  } = useProject();

  const [updateStatusText, setUpdateStatusText] = useState<string>('');

  // Settings State with LocalStorage persistence
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return themePreference || 'light';
  });

  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem('gpm_language') || 'English';
  });

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return accentColor || localStorage.getItem('gpm_accent_color') || '#1677ff';
  });

  // License state
  const [showLicenseInput, setShowLicenseInput] = useState<boolean>(false);
  const [licenseKey, setLicenseKey] = useState<string>(() => {
    return localStorage.getItem('gpm_license_key') || '';
  });
  const [licenseStatus, setLicenseStatus] = useState<'free' | 'pro'>(() => {
    return localStorage.getItem('gpm_license_key') ? 'pro' : 'free';
  });

  // AI API Keys
  const [openaiKey, setOpenaiKey] = useState<string>(() => {
    return localStorage.getItem('gpm_ai_openai_key') || '';
  });
  const [claudeKey, setClaudeKey] = useState<string>(() => {
    return localStorage.getItem('gpm_ai_claude_key') || '';
  });
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return localStorage.getItem('gpm_ai_gemini_key') || '';
  });

  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedColor(accentColor || '#1677ff');
      setSelectedTheme(themePreference || 'light');
      setSaveSuccess(false);
    }
  }, [isOpen, accentColor, themePreference]);

  if (!isOpen) return null;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setAccentColor(color);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setTheme(selectedTheme);
    localStorage.setItem('gpm_language', selectedLanguage);
    localStorage.setItem('gpm_accent_color', selectedColor);
    setAccentColor(selectedColor);

    if (licenseKey.trim()) {
      localStorage.setItem('gpm_license_key', licenseKey.trim());
      setLicenseStatus('pro');
    }

    localStorage.setItem('gpm_ai_openai_key', openaiKey.trim());
    localStorage.setItem('gpm_ai_claude_key', claudeKey.trim());
    localStorage.setItem('gpm_ai_gemini_key', geminiKey.trim());

    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 350);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 select-none p-4 text-left animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1220] rounded-2xl shadow-2xl w-full max-w-[580px] overflow-hidden border border-[#cbd5e1] dark:border-[#1e293b] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Top Window Title Bar matching Image 1 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#e2e8f0] dark:border-[#1a2538] bg-[#f8fafc] dark:bg-[#080d19] text-xs text-[#64748b] dark:text-[#94a3b8]">
          <div className="flex items-center space-x-2 font-semibold text-[#1e293b] dark:text-[#f1f5f9]">
            <div className="w-4 h-4 rounded bg-[#1677ff] text-white flex items-center justify-center font-bold text-[10px]">
              G
            </div>
            <span>Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Header matching Image 1 */}
        <div className="p-5 pb-3 border-b border-[#e2e8f0] dark:border-[#1e293b] flex items-center space-x-3 bg-white dark:bg-[#0c1220]">
          <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-[#1677ff] dark:text-[#38bdf8] shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1e293b] dark:text-[#f8fafc]">
              Settings
            </h2>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
              Customize appearance, language, AI and license.
            </p>
          </div>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[72vh]">
          
          {/* Section 1: Appearance matching Image 1 */}
          <div className="bg-[#fafbfc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#334155] dark:text-[#cbd5e1]">
              <Palette className="w-4 h-4 text-[#64748b]" />
              <span>Appearance</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Theme Dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] mb-1.5">
                  Theme
                </label>
                <div className="relative">
                  <select
                    value={selectedTheme}
                    onChange={(e) => handleThemeChange(e.target.value as any)}
                    className="w-full appearance-none px-3 py-1.5 pr-8 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer shadow-2xs"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b] text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Language Dropdown */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] mb-1.5">
                  Language
                </label>
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full appearance-none px-3 py-1.5 pr-8 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff] cursor-pointer shadow-2xs"
                  >
                    <option value="English">English</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748b] text-[10px]">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Accent Color Palette (có thể đổi màu) */}
            <div className="pt-2 border-t border-[#e2e8f0] dark:border-[#1e293b]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                  Theme Accent Color (Màu chủ đạo)
                </label>
                <span className="text-[10px] font-mono text-[#64748b] uppercase font-semibold">
                  {selectedColor}
                </span>
              </div>

              <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                {ACCENT_COLORS.map((c) => {
                  const isChosen = selectedColor.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleColorChange(c.value)}
                      title={c.name}
                      style={{ backgroundColor: c.value }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                        isChosen
                          ? 'ring-2 ring-offset-2 ring-[#1677ff] dark:ring-offset-[#0a0f1d] scale-110'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                    >
                      {isChosen && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: License matching Image 1 */}
          <div className="bg-[#fafbfc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#334155] dark:text-[#cbd5e1]">
                <Key className="w-4 h-4 text-[#64748b]" />
                <span>License</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                licenseStatus === 'pro'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-200 dark:bg-slate-800 text-[#64748b]'
              }`}>
                {licenseStatus === 'pro' ? 'PRO License' : 'Free Edition'}
              </span>
            </div>

            {!showLicenseInput ? (
              <button
                type="button"
                onClick={() => setShowLicenseInput(true)}
                className="flex items-center space-x-2 px-3.5 py-1.5 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] hover:border-[#1677ff] rounded-lg text-xs font-semibold text-[#1e293b] dark:text-[#f1f5f9] transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                <Key className="w-3.5 h-3.5 text-[#64748b]" />
                <span>Enter license</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Paste your license key here..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-xs font-mono text-[#1e293b] dark:text-[#f1f5f9] focus:outline-none focus:border-[#1677ff]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (licenseKey.trim()) {
                      localStorage.setItem('gpm_license_key', licenseKey.trim());
                      setLicenseStatus('pro');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#1677ff] hover:bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Activate
                </button>
              </div>
            )}
          </div>

          {/* Section 3: AI Providers matching Image 1 */}
          <div className="bg-[#fafbfc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3.5 shadow-2xs">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#334155] dark:text-[#cbd5e1]">
                <Sparkles className="w-4 h-4 text-[#1677ff]" />
                <span>AI Providers</span>
              </div>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                Provide API keys from AI providers to enable smart XPath suggestion while recording. Keys are stored locally in your setting file.
              </p>
            </div>

            <div className="space-y-3">
              {/* ChatGPT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-md bg-[#10a37f] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                      <span className="scale-75">🤖</span>
                    </div>
                    <span className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">ChatGPT</span>
                  </div>
                  <span className={`text-[10px] font-medium ${openaiKey.trim() ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[#94a3b8]'}`}>
                    {openaiKey.trim() ? 'configured' : 'not configured'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="Paste API key here — leave empty if unused"
                    className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-xs font-mono text-[#1e293b] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#1677ff] shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((prev) => ({ ...prev, openai: !prev.openai }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white cursor-pointer"
                  >
                    {showKeys.openai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Claude */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-md bg-[#d97706] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                      ★
                    </div>
                    <span className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Claude</span>
                  </div>
                  <span className={`text-[10px] font-medium ${claudeKey.trim() ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[#94a3b8]'}`}>
                    {claudeKey.trim() ? 'configured' : 'not configured'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showKeys.claude ? 'text' : 'password'}
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    placeholder="Paste API key here — leave empty if unused"
                    className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-xs font-mono text-[#1e293b] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#1677ff] shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((prev) => ({ ...prev, claude: !prev.claude }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white cursor-pointer"
                  >
                    {showKeys.claude ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Gemini */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-md bg-[#2563eb] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                      ✦
                    </div>
                    <span className="font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">Gemini</span>
                  </div>
                  <span className={`text-[10px] font-medium ${geminiKey.trim() ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[#94a3b8]'}`}>
                    {geminiKey.trim() ? 'configured' : 'not configured'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showKeys.gemini ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Paste API key here — leave empty if unused"
                    className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#1e293b] rounded-lg text-xs font-mono text-[#1e293b] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#1677ff] shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys((prev) => ({ ...prev, gemini: !prev.gemini }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white cursor-pointer"
                  >
                    {showKeys.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Version & Software Updates */}
          <div className="bg-[#fafbfc] dark:bg-[#0a0f1d] border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#334155] dark:text-[#cbd5e1]">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Phiên bản & Cập nhật (Version & Updates)</span>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                v{updateInfo?.currentVersion || '3.0.9'}-stable
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b]">
              <div className="space-y-0.5 text-left">
                <div className="text-xs font-medium text-[#1e293b] dark:text-[#f1f5f9]">
                  {isCheckingUpdate ? (
                    'Đang kiểm tra phiên bản mới từ GitHub...'
                  ) : updateInfo?.hasUpdate ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center space-x-1">
                      <span>🚀 Đã có bản mới: v{updateInfo.latestVersion}</span>
                    </span>
                  ) : updateStatusText ? (
                    updateStatusText
                  ) : (
                    'Tự động kiểm tra bản cập nhật từ GitHub.'
                  )}
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  Repository: github.com/thevien1/Automate-Editor
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {updateInfo?.hasUpdate ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setShowUpdateModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xs cursor-pointer transition-all animate-pulse"
                  >
                    Cập nhật ngay
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isCheckingUpdate}
                    onClick={async () => {
                      const res = await checkAppUpdate(true);
                      if (res && !res.hasUpdate) {
                        setUpdateStatusText('Bạn đang sử dụng phiên bản mới nhất!');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-semibold text-[#1677ff] dark:text-[#38bdf8] hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions matching Image 1 */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#e2e8f0] dark:border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#1e293b] text-xs font-semibold text-[#475569] dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-xs font-semibold text-white flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer active:scale-98"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
