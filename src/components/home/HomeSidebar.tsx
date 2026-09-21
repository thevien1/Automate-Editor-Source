import React from 'react';
import { Folder, ShoppingBag, Settings } from '../common/Icons';
import { AppLogo } from '../common/AppLogo';

interface HomeSidebarProps {
  onOpenSettings: () => void;
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({ onOpenSettings }) => {
  return (
    <div className="w-56 bg-white dark:bg-[#080d19] border-r border-[#e2e8f0] dark:border-[#162236] flex flex-col justify-between py-5 px-3 select-none text-left transition-colors duration-200">
      {/* Top Logo & Branding */}
      <div>
        <div className="flex items-center space-x-3 px-3 mb-6">
          <AppLogo size={38} />
          <div>
            <div className="text-sm font-bold text-[#1e293b] dark:text-[#f1f5f9] tracking-tight leading-none">
              SV Browser
            </div>
            <div className="text-[11px] text-[#64748b] mt-1 font-normal">
              3.0.9-stable
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-[#eff6ff] dark:bg-[#0e1e3b] text-[#1677ff] dark:text-[#38bdf8] font-medium text-xs transition-colors border border-[#bfdbfe] dark:border-[#1d4ed8]/30 shadow-xs cursor-pointer">
            <Folder className="w-4 h-4 fill-current" />
            <span>Recent Project</span>
          </button>

          <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-[#111c30] hover:text-[#1e293b] dark:hover:text-white text-xs transition-colors cursor-pointer">
            <ShoppingBag className="w-4 h-4" />
            <span>App Store</span>
          </button>
        </div>
      </div>

      {/* Bottom Socials & Settings */}
      <div className="border-t border-[#e2e8f0] dark:border-[#162236] pt-4 px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-[#94a3b8] dark:text-[#64748b]">
            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ef4444] transition-colors"
              title="YouTube"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            {/* TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black dark:hover:text-white transition-colors"
              title="TikTok"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-6.61 6.31A6.34 6.34 0 0 0 10.05 22a6.34 6.34 0 0 0 6.33-6.33V9.05a8.28 8.28 0 0 0 4.88 1.57V7.18a4.83 4.83 0 0 1-1.67-.49z"/>
              </svg>
            </a>
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#1677ff] dark:hover:text-[#38bdf8] transition-colors"
              title="Facebook"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 text-xs text-[#64748b] dark:text-[#94a3b8] hover:text-[#1677ff] dark:hover:text-[#38bdf8] transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
