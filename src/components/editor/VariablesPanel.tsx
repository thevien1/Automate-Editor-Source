import React, { useState } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Check,
} from '../common/Icons';
import { VariableBadge } from '../common/VariableTooltip';
import {
  useProject,
  EXCEL_VARIABLES,
  TXT_VARIABLES,
  COMMON_DATA_VARIABLES,
  BROWSER_SYSTEM_VARIABLES,
} from '../../context/ProjectContext';

interface VariablesPanelProps {
  className?: string;
  showHeader?: boolean;
  title?: string;
}

export const VariablesPanel: React.FC<VariablesPanelProps> = ({
  className = '',
  showHeader = true,
  title = 'System & Excel Variables',
}) => {
  const { customVariables } = useProject();
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [varSearchTerm, setVarSearchTerm] = useState('');

  // Trạng thái mở/đóng các nhóm Biến (Accordion) - Mặc định ĐÓNG toàn bộ như Ảnh 1
  const [expandedVarGroups, setExpandedVarGroups] = useState<Record<string, boolean>>({});

  // Chế độ xem biến Excel: 'grid' (lưới gọn) hoặc 'list' (danh sách)
  const [excelViewMode, setExcelViewMode] = useState<'grid' | 'list'>('grid');

  const toggleVarGroup = (groupTitle: string) => {
    setExpandedVarGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const handleCopyVar = (vName: string) => {
    const textToCopy = vName.startsWith('$') ? vName : `$${vName}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedVar(textToCopy);
    setTimeout(() => setCopiedVar(null), 1800);
  };

  const varGroups = [
    {
      title: 'Excel Data Mapping',
      icon: '📊',
      badgeColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      vars: EXCEL_VARIABLES,
      desc: 'Ánh xạ tự động từ các cột trong file Excel',
      isExcel: true,
    },
    {
      title: 'Text File Line',
      icon: '📄',
      badgeColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      vars: TXT_VARIABLES,
      desc: 'Dòng text nguyên bản & các phần tử sau khi Split text',
      isExcel: false,
    },
    {
      title: 'Account & Credentials',
      icon: '🔑',
      badgeColor: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
      vars: COMMON_DATA_VARIABLES,
      desc: 'Biến thông tin đăng nhập (email, password, 2fa, url...)',
      isExcel: false,
    },
    {
      title: 'Browser & System',
      icon: '⚙',
      badgeColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      vars: BROWSER_SYSTEM_VARIABLES,
      desc: 'Thông tin runtime profile, luồng và cổng debug',
      isExcel: false,
    },
    ...(customVariables.length > 0
      ? [
          {
            title: 'Workflow Output Variables',
            icon: '🎯',
            badgeColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
            vars: customVariables,
            desc: 'Biến được sinh ra từ các Action trong kịch bản',
            isExcel: false,
          },
        ]
      : []),
  ];

  return (
    <div className={`flex flex-col h-full overflow-hidden text-xs text-left select-none ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#e2e8f0] dark:border-[#162236] bg-[#fafbfc] dark:bg-[#0a0f1d]">
          <div className="flex items-center space-x-1.5 font-bold text-xs text-[#1e293b] dark:text-[#f1f5f9]">
            <span className="font-mono text-[#1677ff] dark:text-[#38bdf8] text-sm">{'{ $ }'}</span>
            <span>{title}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1677ff] dark:text-[#38bdf8] border border-blue-200 dark:border-blue-900/60 font-medium">
            1-Click Copy
          </span>
        </div>
      )}

      {/* Search Box */}
      <div className="p-2.5 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#94a3b8] dark:text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={varSearchTerm}
            onChange={(e) => setVarSearchTerm(e.target.value)}
            placeholder="Search variables ($col_A, email...)"
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none transition-colors placeholder-[#94a3b8]"
          />
        </div>
        {copiedVar && (
          <div className="mt-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center justify-between animate-in fade-in">
            <span>
              Copied <b>{copiedVar}</b>
            </span>
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
        )}
      </div>

      {/* Variables Groups List (Accordion & Compact Views) */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2">
        {varGroups.map((grp) => {
          const isExpanded = !!expandedVarGroups[grp.title];
          const matchedVars = grp.vars.filter(
            (v) =>
              v.toLowerCase().includes(varSearchTerm.toLowerCase()) ||
              `$${v}`.toLowerCase().includes(varSearchTerm.toLowerCase())
          );
          if (varSearchTerm && matchedVars.length === 0) return null;

          return (
            <div
              key={grp.title}
              className="border border-[#e2e8f0] dark:border-[#162236] rounded-lg overflow-hidden bg-[#fbfcfd] dark:bg-[#0c1424]"
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleVarGroup(grp.title)}
                className="flex items-center justify-between px-2.5 py-2 hover:bg-[#f1f5f9] dark:hover:bg-[#15233c] cursor-pointer group transition-colors"
              >
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#334155] dark:text-[#cbd5e1]">
                  <span>{grp.icon}</span>
                  <span className="truncate">{grp.title}</span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {grp.isExcel && isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExcelViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-[#475569] dark:text-[#94a3b8] hover:text-[#1677ff] dark:hover:text-[#38bdf8] transition-colors"
                      title="Chuyển đổi dạng xem Lưới gọn / Danh sách"
                    >
                      {excelViewMode === 'grid' ? 'Lưới' : 'List'}
                    </button>
                  )}
                  <span className="text-[10px] text-[#64748b] bg-white dark:bg-[#0f172a] px-1.5 py-0.2 rounded-full border border-[#e2e8f0] dark:border-[#1e293b]">
                    {matchedVars.length}
                  </span>
                  <span className="text-[#94a3b8] group-hover:text-[#1677ff] transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-1.5 border-t border-[#e2e8f0] dark:border-[#162236] bg-white dark:bg-[#080d19]">
                  {grp.isExcel && excelViewMode === 'grid' ? (
                    /* Compact Grid of Pills for Excel (Tiết kiệm diện tích) */
                    <div className="grid grid-cols-3 gap-1">
                      {matchedVars.map((v) => (
                        <VariableBadge
                          key={v}
                          varName={v}
                          badgeColor={grp.badgeColor}
                          isGrid={true}
                          onCopy={handleCopyVar}
                          isCopied={copiedVar === `$${v}`}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Detailed List View */
                    <div className="space-y-1">
                      {matchedVars.map((v) => (
                        <VariableBadge
                          key={v}
                          varName={v}
                          badgeColor={grp.badgeColor}
                          isGrid={false}
                          onCopy={handleCopyVar}
                          isCopied={copiedVar === `$${v}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Guidance Tooltip Box */}
      <div className="p-2.5 border-t border-[#e2e8f0] dark:border-[#162236] bg-[#fafbfc] dark:bg-[#0a0f1d] text-[10px] text-[#64748b] dark:text-[#94a3b8] space-y-1">
        <div className="flex items-center space-x-1 text-[#334155] dark:text-[#cbd5e1] font-semibold">
          <span>💡 Hướng dẫn sử dụng:</span>
        </div>
        <div>
          • <b>Rê chuột</b> vào bất kỳ biến nào để xem mô tả, ví dụ và cách dùng chi tiết.
        </div>
        <div>
          • <b>Nhấp chuột</b> để copy nhanh biến dạng <code className="text-[#1677ff] font-mono font-bold">$tên_biến</code>.
        </div>
        <div>
          • Gõ ký tự <code className="text-[#1677ff] font-bold">$</code> vào bất kỳ ô nhập liệu nào để hiện gợi ý tự động.
        </div>
      </div>
    </div>
  );
};

export default VariablesPanel;
