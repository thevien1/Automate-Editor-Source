import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { FolderOpen } from './Icons';

export interface VariableInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  browseType?: 'file' | 'folder' | 'saveFile' | 'image';
  browseTitle?: string;
  browseButtonText?: string;
  multiline?: boolean;
  rows?: number;
}

export const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  id,
  browseType,
  browseTitle,
  browseButtonText,
  multiline,
  rows,
}) => {
  const { allVariables } = useProject();
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dollarPos, setDollarPos] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  const filteredVars = allVariables.filter((v) =>
    v.toLowerCase().includes(filterText.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursor = e.target.selectionStart ?? newVal.length;
    onChange(newVal);

    // Check if $ was typed before cursor
    const textBeforeCursor = newVal.slice(0, cursor);
    const lastDollar = textBeforeCursor.lastIndexOf('$');

    if (lastDollar !== -1) {
      const textAfterDollar = textBeforeCursor.slice(lastDollar + 1);
      // Valid variable name query (alphanumeric, underscores, or empty)
      if (!/\s/.test(textAfterDollar)) {
        setDollarPos(lastDollar);
        setFilterText(textAfterDollar);
        setShowDropdown(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowDropdown(false);
  };

  const selectVariable = (varName: string) => {
    if (dollarPos === null || !inputRef.current) {
      onChange(value + `$${varName}`);
      setShowDropdown(false);
      return;
    }

    const cursor = inputRef.current.selectionStart ?? value.length;
    const beforeDollar = value.slice(0, dollarPos);
    const afterCursor = value.slice(cursor);

    const completed = `${beforeDollar}$${varName}${afterCursor}`;
    onChange(completed);
    setShowDropdown(false);

    // Restore focus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursor = beforeDollar.length + 1 + varName.length;
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!showDropdown || filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectVariable(filteredVars[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const promptFileInput = (accept?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        onChange(file.path || file.name);
      }
    };
    input.click();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (browseType === 'image') {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              e.preventDefault();
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onChange(event.target.result as string);
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
    }
  };

  const handleBrowse = async () => {
    try {
      if (browseType === 'folder') {
        if ((window as any).electronAPI?.openFolderDialog) {
          const res = await (window as any).electronAPI.openFolderDialog();
          if (res) onChange(res);
        }
      } else if (browseType === 'saveFile') {
        if ((window as any).electronAPI?.openFileDialog) {
          const res = await (window as any).electronAPI.openFileDialog({ title: browseTitle || 'Select File' });
          if (res) onChange(res);
        } else if ((window as any).electronAPI?.saveFileDialog) {
          const res = await (window as any).electronAPI.saveFileDialog({ title: browseTitle || 'Select File' });
          if (res) onChange(res);
        } else {
          promptFileInput();
        }
      } else if (browseType === 'image') {
        if ((window as any).electronAPI?.openFileDialog) {
          const res = await (window as any).electronAPI.openFileDialog({
            title: browseTitle || 'Select Image File',
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp'] }],
          });
          if (res) onChange(res);
        } else {
          promptFileInput('image/*');
        }
      } else {
        // browseType === 'file'
        if ((window as any).electronAPI?.openFileDialog) {
          const res = await (window as any).electronAPI.openFileDialog({ title: browseTitle || 'Select File' });
          if (res) onChange(res);
        } else {
          promptFileInput();
        }
      }
    } catch (err) {
      console.error('Browse dialog error:', err);
      promptFileInput();
    }
  };

  const inputElement = (
    <div ref={containerRef} className="relative flex-1 w-full">
      {multiline ? (
        <textarea
          ref={inputRef}
          id={id}
          rows={rows || 4}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={
            className ||
            'w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none resize-none'
          }
        />
      ) : (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={
            className ||
            'w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none'
          }
        />
      )}

      {/* Autocomplete Dropdown popup matching Image 2 */}
      {showDropdown && filteredVars.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-72 max-h-60 overflow-y-auto bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#1e293b] rounded-lg shadow-xl py-1 text-left text-xs">
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-[#94a3b8] uppercase border-b border-slate-100 dark:border-slate-800/80 mb-1 flex justify-between">
            <span>Available Variables</span>
            <span>{filteredVars.length} found</span>
          </div>
          {filteredVars.map((vName, idx) => {
            const isSelected = idx === selectedIndex;
            const clean = vName.replace(/^\$/, '');
            let badge = { label: 'Custom', color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' };
            if (/^col_[A-Za-z0-9]+$/i.test(clean) || /^[A-Z]$/.test(clean) || clean.startsWith('excel') || clean.startsWith('inputExcel')) {
              badge = { label: 'Excel', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' };
            } else if (clean.startsWith('txt_') || clean.startsWith('line') || clean.startsWith('data_')) {
              badge = { label: 'TXT', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' };
            } else if (['email', 'password', 'code_2fa', 'url', 'username', 'two_factor_code', 'otp', 'phone', 'cookie', 'token'].includes(clean)) {
              badge = { label: 'Data', color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400' };
            } else if (['profileName', 'profileId', 'profileProxy', 'loopIndex', 'threadId', 'runOrder', 'port'].includes(clean)) {
              badge = { label: 'System', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
            }

            return (
              <div
                key={vName}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectVariable(vName);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3 py-1.5 cursor-pointer text-xs transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#e6f4ff] dark:bg-[#15233c] text-[#1677ff] dark:text-[#38bdf8] font-semibold'
                    : 'text-[#334155] dark:text-[#cbd5e1] hover:bg-[#f8fafc] dark:hover:bg-[#111c30]'
                }`}
              >
                <div className="flex items-center space-x-1 font-mono">
                  <span className="text-[#1677ff] dark:text-[#38bdf8] font-bold">$</span>
                  <span>{vName}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (browseType) {
    return (
      <div className="flex items-center space-x-1.5 w-full">
        {inputElement}
        <button
          type="button"
          onClick={handleBrowse}
          className="h-[30px] px-2.5 bg-white dark:bg-[#0f172a] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1677ff] dark:hover:text-[#38bdf8] border border-[#d9d9d9] dark:border-[#1e293b] rounded-md hover:border-[#1677ff] dark:hover:border-[#38bdf8] transition-colors flex items-center justify-center shadow-xs flex-shrink-0"
          title={browseType === 'folder' ? 'Browse folder...' : browseType === 'image' ? 'Select image file...' : 'Browse file...'}
        >
          {browseButtonText ? (
            <span className="text-xs font-bold leading-none px-0.5">{browseButtonText}</span>
          ) : (
            <FolderOpen className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  }

  return inputElement;
};
