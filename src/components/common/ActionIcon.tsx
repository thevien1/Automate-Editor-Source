import React from 'react';
import {
  Repeat,
  RefreshCw,
  GitBranch,
  CornerDownRight,
  Box,
  Hourglass,
  Clock,
  Square,
  AlertTriangle,
  Shuffle,
  Scissors,
  FileText,
  Asterisk,
  Dices,
  Calculator,
  Key,
  FileCheck,
  Copy,
  FileEdit,
  Trash2,
  Pencil,
  FilePlus,
  FileSpreadsheet,
  FolderCheck,
  FolderPlus,
  FolderX,
  FolderTree,
  ClipboardCopy,
  ClipboardPaste,
  Download,
  Globe,
  LogOut,
  SkipForward,
  Link2,
  ArrowLeft,
  RotateCw,
  Code2,
  SlidersHorizontal,
  Pointer,
  Hand,
  HandFist,
  Mouse,
  Keyboard,
  Image as ImageIcon,
  FileImage,
  Search,
  Mail,
  PlayCircle,
  Eye,
  X,
  XCircle,
  Plus,
  Minus,
  Variable,
  ListOrdered,
  Home,
  Window,
  WindowStack,
  Cookie,
} from './Icons';
import sourceDefaultIcons from '../../config/customDefaultIcons.json';

/**
 * =========================================================================
 * CÁC MẪU SVG CHUẨN ĐẸP (KHÔNG BỊ LỆCH HAY BIẾN DẠNG NHƯ ICON FONT)
 * =========================================================================
 */

// Con trỏ chuột cổ điển (chuột máy tính thật, không bị ra hình máy bay giấy)
export const MousePointerSvg: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-3.5 h-3.5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="m13 13 6 6" />
  </svg>
);

// Chuột nhấn click (có vòng sóng tròn phát ra)
export const MouseClickSvg: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-3.5 h-3.5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path d="M12 2v4" />
    <path d="m4.93 4.93 2.83 2.83" />
    <path d="M2 12h4" />
    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="currentColor" />
  </svg>
);

// 4 Mũi tên di chuyển (Move 4-way)
export const MouseMoveSvg: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-3.5 h-3.5',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <polyline points="5 9 2 12 5 15" />
    <polyline points="9 5 12 2 15 5" />
    <polyline points="15 19 12 22 9 19" />
    <polyline points="19 9 22 12 19 15" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="22" />
  </svg>
);

/**
 * =========================================================================
 * BẢNG CẤU HÌNH ICON VÀ MÀU SẮC CHO TỪNG ACTION & BLOCK
 * -------------------------------------------------------------------------
 * BẠN CÓ THỂ DỄ DÀNG TỰ SỬA Ở ĐÂY:
 * 1. ĐỔI MÀU: Thay đổi chuỗi mã màu hex tại 'color' hoặc 'darkColor':
 *    Ví dụ: color: '#1677ff' -> đổi thành '#10b981' (xanh lá), '#ef4444' (đỏ), '#f59e0b' (vàng)...
 * 2. ĐỔI ICON:
 *    - Dùng icon Bootstrap: <i className="bi bi-arrows-move" /> hoặc <i className="bi bi-gear-fill" />
 *    - Dùng SVG riêng: <svg viewBox="0 0 24 24">...</svg>
 *    - Dùng component có sẵn: <MousePointerSvg />, <Globe />, <Key />...
 * =========================================================================
 */
export interface ActionConfigItem {
  color: string;
  darkColor?: string;
  icon: React.ReactNode;
  label?: string;
}

export const ACTION_ICON_CONFIG: Record<string, ActionConfigItem> = {
  // --- KHỐI ĐIỀU KHIỂN & VÒNG LẶP ---
  'normal block': {
    color: '#d97706',
    darkColor: '#f59e0b',
    icon: <Box className="w-3.5 h-3.5" />,
    label: 'Normal block',
  },
  'for': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Repeat className="w-3.5 h-3.5" />,
    label: 'Vòng lặp For',
  },
  'while': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    label: 'Vòng lặp While',
  },
  'if': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <GitBranch className="w-3.5 h-3.5" />,
    label: 'Điều kiện If',
  },
  'else if': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <GitBranch className="w-3.5 h-3.5" />,
    label: 'Điều kiện Else If',
  },
  'else': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <CornerDownRight className="w-3.5 h-3.5" />,
    label: 'Điều kiện Else',
  },

  // --- CHUỘT (MOUSE ACTIONS) ---
  'mouse click': {
    color: '#1677ff',
    darkColor: '#60a5fa',
    icon: <MousePointerSvg className="w-3.5 h-3.5" />,
    label: 'Mouse click',
  },
  'mouse try to click': {
    color: '#1677ff',
    darkColor: '#60a5fa',
    icon: <Pointer className="w-3.5 h-3.5 fill-current" />,
    label: 'Mouse try to click',
  },
  'mouse move': {
    color: '#1677ff',
    darkColor: '#60a5fa',
    icon: <MouseMoveSvg className="w-3.5 h-3.5" />,
    label: 'Mouse move',
  },
  'mouse press and hold': {
    color: '#1677ff',
    darkColor: '#60a5fa',
    icon: <Hand className="w-3.5 h-3.5 fill-current" />,
    label: 'Mouse press and hold',
  },
  'mouse release': {
    color: '#1677ff',
    darkColor: '#60a5fa',
    icon: <HandFist className="w-3.5 h-3.5 fill-current" />,
    label: 'Mouse release',
  },
  'mouse scroll': {
    color: '#1677ff',
    darkColor: '#60a5fa',
    icon: <Mouse className="w-3.5 h-3.5 fill-current" />,
    label: 'Mouse scroll',
  },

  // --- BÀN PHÍM ---
  'key press': {
    color: '#a855f7',
    darkColor: '#c084fc',
    icon: <Keyboard className="w-3.5 h-3.5" />,
    label: 'Key press',
  },

  // --- TRÌNH DUYỆT (BROWSER NAVIGATION) ---
  'go to url': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Link2 className="w-3.5 h-3.5" />,
    label: 'Go to URL',
  },
  'new tab': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Copy className="w-3.5 h-3.5" />,
    label: 'New tab',
  },
  'active tab': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Eye className="w-3.5 h-3.5" />,
    label: 'Active tab',
  },
  'close tab': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <X className="w-3.5 h-3.5" />,
    label: 'Close tab',
  },
  'close all tab': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Close all tab',
  },
  'back url': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <ArrowLeft className="w-3.5 h-3.5" />,
    label: 'Back URL',
  },
  'reload page': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <RotateCw className="w-3.5 h-3.5" />,
    label: 'Reload page',
  },
  'reload': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <RotateCw className="w-3.5 h-3.5" />,
    label: 'Reload',
  },
  'get current url': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Code2 className="w-3.5 h-3.5" />,
    label: 'Get current URL',
  },
  'wait url changed': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Wait URL changed',
  },
  'switch to default': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Home className="w-3.5 h-3.5" />,
    label: 'Switch to default',
  },
  'switch to frame': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Window className="w-3.5 h-3.5" />,
    label: 'Switch to frame',
  },
  'switch to popup': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <WindowStack className="w-3.5 h-3.5" />,
    label: 'Switch to popup',
  },

  // --- PHẦN TỬ TRANG WEB (BROWSER ELEMENTS) ---
  'wait element': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Hourglass className="w-3.5 h-3.5" />,
    label: 'Wait element',
  },
  'get element attribute': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
    label: 'Get element attribute',
  },
  'get element text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <span className="font-bold font-sans text-[11px]">A</span>,
    label: 'Get element text',
  },
  'count element': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <span className="font-bold font-mono text-[11px]">#</span>,
    label: 'Count element',
  },
  'select dropdown': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <ListOrdered className="w-3.5 h-3.5" />,
    label: 'Select dropdown',
  },

  // --- TÌM KIẾM HÌNH ẢNH (IMAGE SEARCH / OPENCV) ---
  'wait to image': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Hourglass className="w-3.5 h-3.5" />,
    label: 'Wait to image',
  },
  'image exists': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    label: 'Image exists',
  },
  'image search': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Search className="w-3.5 h-3.5" />,
    label: 'Image search',
  },
  'image to base64': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileImage className="w-3.5 h-3.5" />,
    label: 'Image to base64',
  },

  // --- THỜI GIAN & ĐIỀU HƯỚNG WORKFLOW ---
  'delay': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Delay',
  },
  'stop': {
    color: '#ef4444',
    darkColor: '#f87171',
    icon: <Square className="w-3.5 h-3.5 fill-current" />,
    label: 'Stop',
  },
  'throw': {
    color: '#f59e0b',
    darkColor: '#fbbf24',
    icon: <AlertTriangle className="w-3.5 h-3.5 fill-current" />,
    label: 'Throw error',
  },
  'exit loop': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <LogOut className="w-3.5 h-3.5" />,
    label: 'Exit loop',
  },
  'next loop': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <SkipForward className="w-3.5 h-3.5" />,
    label: 'Next loop',
  },

  // --- XỬ LÝ CHUỖI, DỮ LIỆU & 2FA ---
  'split text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Scissors className="w-3.5 h-3.5" />,
    label: 'Split text',
  },
  'random text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Shuffle className="w-3.5 h-3.5" />,
    label: 'Random text',
  },
  'random number': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Dices className="w-3.5 h-3.5" />,
    label: 'Random number',
  },
  'math execute': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Calculator className="w-3.5 h-3.5" />,
    label: 'Math execute',
  },
  'read json': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileText className="w-3.5 h-3.5" />,
    label: 'Read JSON',
  },
  'regex': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Asterisk className="w-3.5 h-3.5" />,
    label: 'Regex',
  },
  '2fa code': {
    color: '#10b981',
    darkColor: '#34d399',
    icon: <Key className="w-3.5 h-3.5" />,
    label: '2FA Code',
  },
  'read mail code': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Mail className="w-3.5 h-3.5" />,
    label: 'Read mail code',
  },
  'read outlook': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Mail className="w-3.5 h-3.5" />,
    label: 'Read Outlook',
  },

  // --- TẬP TIN & THƯ MỤC ---
  'read excel file': {
    color: '#10b981',
    darkColor: '#34d399',
    icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    label: 'Read excel file',
  },
  'write excel file': {
    color: '#10b981',
    darkColor: '#34d399',
    icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    label: 'Write excel file',
  },
  'append excel file': {
    color: '#10b981',
    darkColor: '#34d399',
    icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    label: 'Append excel file',
  },
  'create empty excel': {
    color: '#10b981',
    darkColor: '#34d399',
    icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    label: 'Create empty excel',
  },
  'file read all text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileText className="w-3.5 h-3.5" />,
    label: 'File read all text',
  },
  'file read all lines': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileText className="w-3.5 h-3.5" />,
    label: 'File read all lines',
  },
  'file read random line': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileText className="w-3.5 h-3.5" />,
    label: 'File read random line',
  },
  'file write all text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Pencil className="w-3.5 h-3.5" />,
    label: 'File write all text',
  },
  'file append line': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FilePlus className="w-3.5 h-3.5" />,
    label: 'File append line',
  },
  'file exists': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileCheck className="w-3.5 h-3.5" />,
    label: 'File exists',
  },
  'copy file': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Copy className="w-3.5 h-3.5" />,
    label: 'Copy file',
  },
  'move/rename file': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FileEdit className="w-3.5 h-3.5" />,
    label: 'Move/Rename file',
  },
  'delete file': {
    color: '#ef4444',
    darkColor: '#f87171',
    icon: <Trash2 className="w-3.5 h-3.5" />,
    label: 'Delete file',
  },
  'folder exists': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FolderCheck className="w-3.5 h-3.5" />,
    label: 'Folder exists',
  },
  'create folder': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FolderPlus className="w-3.5 h-3.5" />,
    label: 'Create folder',
  },
  'move folder': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FolderPlus className="w-3.5 h-3.5" />,
    label: 'Move folder',
  },
  'delete folder': {
    color: '#ef4444',
    darkColor: '#f87171',
    icon: <FolderX className="w-3.5 h-3.5" />,
    label: 'Delete folder',
  },
  'folder get file list': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <FolderTree className="w-3.5 h-3.5" />,
    label: 'Folder get file list',
  },
  'get clipboard text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <ClipboardCopy className="w-3.5 h-3.5" />,
    label: 'Get clipboard text',
  },
  'set clipboard text': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <ClipboardPaste className="w-3.5 h-3.5" />,
    label: 'Set clipboard text',
  },

  // --- HTTP & BIẾN ---
  'http request': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Globe className="w-3.5 h-3.5" />,
    label: 'HTTP request',
  },
  'http download': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Download className="w-3.5 h-3.5" />,
    label: 'HTTP download',
  },
  'set variable': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <span className="font-bold font-mono text-[11px]">√x</span>,
    label: 'Set variable',
  },
  'increase variable': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Plus className="w-3.5 h-3.5" />,
    label: 'Increase variable',
  },
  'decrease variable': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Minus className="w-3.5 h-3.5" />,
    label: 'Decrease variable',
  },
  'count variable': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <ListOrdered className="w-3.5 h-3.5" />,
    label: 'Count variable',
  },

  // --- COOKIE ---
  'import cookie': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Cookie className="w-3.5 h-3.5" />,
    label: 'Import cookie',
  },
  'export cookie': {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <Cookie className="w-3.5 h-3.5" />,
    label: 'Export cookie',
  },
};

// Ánh xạ nhanh theo Action Type số (ID nguyên thủy của GScript)
export const ACTION_TYPE_MAP: Record<number, string> = {
  1: 'set variable',
  2: 'increase variable',
  3: 'decrease variable',
  4: 'count variable',
  5: 'exit loop',
  6: 'next loop',
  7: 'delay',
  8: 'random text',
  9: 'split text',
  10: 'read json',
  11: 'random number',
  12: 'math execute',
  13: 'file exists',
  14: 'copy file',
  15: 'move/rename file',
  16: 'delete file',
  17: 'file read all text',
  18: 'file read all lines',
  19: 'file write all text',
  20: 'file append line',
  21: 'read excel file',
  22: 'write excel file',
  23: 'folder exists',
  24: 'create folder',
  25: 'delete folder',
  26: 'move folder',
  27: 'get clipboard text',
  28: 'set clipboard text',
  29: 'http request',
  30: 'http download',
  35: 'read mail code',
  36: 'new tab',
  37: 'active tab',
  38: 'close tab',
  39: 'go to url',
  40: 'back url',
  41: 'reload page',
  42: 'get current url',
  43: 'wait url changed',
  44: 'wait element',
  45: 'get element attribute',
  46: 'get element text',
  47: 'count element',
  48: 'mouse click',
  49: 'mouse try to click',
  50: 'mouse move',
  51: 'mouse press and hold',
  52: 'mouse release',
  53: 'mouse scroll',
  54: 'key press',
  64: 'import cookie',
  65: 'export cookie',
  71: 'append excel file',
  72: 'folder get file list',
  73: 'close all tab',
  74: 'create empty excel',
  76: 'stop',
  80: 'read outlook',
  81: '2fa code',
  82: 'regex',
  105: 'else if',
  106: 'else',
  107: 'wait to image',
  108: 'image exists',
  109: 'image search',
  110: 'image to base64',
  111: 'select dropdown',
  117: 'throw',
  184: 'file read random line',
};

/**
 * Hàm lấy cấu hình icon & màu sắc
 */
export const getActionIconConfig = (
  actionName?: string | null,
  actionType?: number,
  blockType?: string
): ActionConfigItem => {
  // 1. Kiểm tra block trước
  if (blockType) {
    const bKey = blockType.toLowerCase();
    if (bKey.includes('for')) return ACTION_ICON_CONFIG['for'];
    if (bKey.includes('while')) return ACTION_ICON_CONFIG['while'];
    if (bKey.includes('else if')) return ACTION_ICON_CONFIG['else if'];
    if (bKey.includes('else')) return ACTION_ICON_CONFIG['else'];
    if (bKey.includes('if')) return ACTION_ICON_CONFIG['if'];
    if (bKey.includes('normal') || bKey.includes('block')) return ACTION_ICON_CONFIG['normal block'];
  }

  // 2. Kiểm tra theo Type ID
  if (actionType && ACTION_TYPE_MAP[actionType]) {
    const mappedKey = ACTION_TYPE_MAP[actionType];
    if (ACTION_ICON_CONFIG[mappedKey]) {
      return ACTION_ICON_CONFIG[mappedKey];
    }
  }

  // 3. Kiểm tra theo tên Action (exact match)
  const cleanName = (actionName || '').trim().toLowerCase();
  if (cleanName && ACTION_ICON_CONFIG[cleanName]) {
    return ACTION_ICON_CONFIG[cleanName];
  }

  // 4. Fuzzy match theo từ khóa
  if (cleanName.includes('mouse') || cleanName.includes('click')) {
    return ACTION_ICON_CONFIG['mouse click'];
  }
  if (cleanName.includes('key')) {
    return ACTION_ICON_CONFIG['key press'];
  }
  if (cleanName.includes('excel')) {
    return ACTION_ICON_CONFIG['read excel file'];
  }
  if (cleanName.includes('folder')) {
    return ACTION_ICON_CONFIG['folder exists'];
  }
  if (cleanName.includes('file')) {
    return ACTION_ICON_CONFIG['file read all text'];
  }
  if (cleanName.includes('variable')) {
    return ACTION_ICON_CONFIG['set variable'];
  }
  if (cleanName.includes('cookie')) {
    return cleanName.includes('export')
      ? ACTION_ICON_CONFIG['export cookie']
      : ACTION_ICON_CONFIG['import cookie'];
  }
  if (cleanName.includes('reload')) {
    return ACTION_ICON_CONFIG['reload'];
  }
  if (cleanName.includes('image')) {
    return ACTION_ICON_CONFIG['image search'];
  }

  // Fallback mặc định
  return {
    color: '#1677ff',
    darkColor: '#38bdf8',
    icon: <PlayCircle className="w-3.5 h-3.5" />,
    label: actionName || 'Action',
  };
};

/**
 * =========================================================================
 * BỘ QUẢN LÝ LƯU TRỮ VÀ TÙY BIẾN ICON THEO Ý NGƯỜI DÙNG (PERSISTENCE)
 * =========================================================================
 */
export interface CustomIconOverride {
  color?: string;
  darkColor?: string;
  iconType: 'bootstrap' | 'svg' | 'preset';
  iconValue: string; // Tên class ví dụ: "bi-arrows-move" hoặc mã SVG string
}

const STORAGE_KEY = 'gpm_custom_action_icons';

export const getStoredCustomIcons = (): Record<string, CustomIconOverride> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    let changed = false;
    if (parsed['import cookie']?.iconValue?.includes('palette')) {
      delete parsed['import cookie'];
      changed = true;
    }
    if (parsed['export cookie']?.iconValue?.includes('palette')) {
      delete parsed['export cookie'];
      changed = true;
    }
    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return {};
  }
};

export const saveCustomIconOverride = (actionKey: string, override: CustomIconOverride) => {
  const all = getStoredCustomIcons();
  all[actionKey.trim().toLowerCase()] = override;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('gpm_custom_icons_updated'));
};

export const deleteCustomIconOverride = (actionKey: string) => {
  const all = getStoredCustomIcons();
  delete all[actionKey.trim().toLowerCase()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('gpm_custom_icons_updated'));
};

/**
 * Trả về override cấu hình người dùng nếu có, hỗ trợ map từ tên Block, Display Text, hoặc Action Type
 */
export const getEffectiveCustomOverride = (
  actionName?: string | null,
  actionType?: number,
  blockType?: string
): CustomIconOverride | undefined => {
  const localOverrides = getStoredCustomIcons();
  const overrides: Record<string, CustomIconOverride> = {
    ...((sourceDefaultIcons as Record<string, CustomIconOverride>) || {}),
    ...localOverrides,
  };
  const n = (actionName || '').trim().toLowerCase();

  // 1. Khớp chính xác theo actionName
  if (n && overrides[n]) {
    return overrides[n];
  }

  // 2. Khớp theo blockType
  if (blockType) {
    const b = blockType.trim().toLowerCase();
    if (overrides[b]) return overrides[b];
    if (b.includes('for') && overrides['for']) return overrides['for'];
    if (b.includes('while') && overrides['while']) return overrides['while'];
    if (b.includes('else if') && overrides['else if']) return overrides['else if'];
    if (b.includes('else') && overrides['else']) return overrides['else'];
    if (b.includes('if') && overrides['if']) return overrides['if'];
    if ((b.includes('normal') || b.includes('block')) && overrides['normal block']) {
      return overrides['normal block'];
    }
  }

  // 3. Tên đặc thù của các Block mặc định GPM -> map sang "normal block"
  if (
    n === 'before browser opened' ||
    n === 'main logic' ||
    n === 'after browser closed' ||
    n === 'normal block'
  ) {
    if (overrides['normal block']) return overrides['normal block'];
  }
  if (n === 'for' && overrides['for']) return overrides['for'];
  if (n === 'while' && overrides['while']) return overrides['while'];
  if ((n === 'if' || n.startsWith('if')) && overrides['if']) return overrides['if'];

  // 4. Khớp theo Type ID
  if (actionType && ACTION_TYPE_MAP[actionType]) {
    const key = ACTION_TYPE_MAP[actionType];
    if (overrides[key]) return overrides[key];
  }

  return undefined;
};

/**
 * Tự động tính màu gradient đậm/nhạt hơn từ mã HEX
 */
export function adjustHexBrightness(hex: string, percent: number): string {
  if (!hex || !hex.startsWith('#')) return hex;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Kiểm tra xem màu nền là màu sáng hay tối để hiển thị text màu trắng hay màu đen
 */
export function isLightColor(hex: string): boolean {
  if (!hex || !hex.startsWith('#')) return false;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return false;
  const num = parseInt(clean, 16);
  const r = num >> 16;
  const g = (num >> 8) & 0x00ff;
  const b = num & 0x0000ff;
  return (r * 299 + g * 587 + b * 114) / 1000 > 175;
}

export interface ActionIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  actionName?: string | null;
  actionType?: number;
  blockType?: string;
  color?: string; // Tự truyền mã màu để ghi đè (vd: '#ff0000', 'white')
  size?: number | string;
  className?: string;
  isBlockHeader?: boolean; // Nếu hiển thị trên thanh header của Block thì chữ/icon màu trắng
}

export const ActionIcon: React.FC<ActionIconProps> = ({
  actionName,
  actionType,
  blockType,
  color,
  size,
  className = '',
  isBlockHeader = false,
  style,
  ...props
}) => {
  const [, setVer] = React.useState(0);

  React.useEffect(() => {
    const handleUpdate = () => setVer((v) => v + 1);
    window.addEventListener('gpm_custom_icons_updated', handleUpdate);
    return () => window.removeEventListener('gpm_custom_icons_updated', handleUpdate);
  }, []);

  const override = getEffectiveCustomOverride(actionName, actionType, blockType);

  if (override) {
    const activeColor = color || (isBlockHeader ? '#ffffff' : override.color || '#1677ff');
    let renderedIcon: React.ReactNode = null;

    if (override.iconType === 'bootstrap') {
      const cls = override.iconValue.startsWith('bi-') ? override.iconValue : `bi-${override.iconValue}`;
      renderedIcon = <i className={`bi ${cls}`} style={{ fontSize: 'inherit' }} />;
    } else if (override.iconType === 'svg') {
      renderedIcon = (
        <span
          className="inline-flex items-center justify-center w-full h-full [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: override.iconValue }}
        />
      );
    } else {
      renderedIcon = <i className={`bi bi-${override.iconValue}`} />;
    }

    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{
          color: activeColor,
          fontSize: size ? (typeof size === 'number' ? `${size}px` : size) : undefined,
          ...style,
        }}
        {...props}
      >
        {renderedIcon}
      </span>
    );
  }

  const config = getActionIconConfig(actionName, actionType, blockType);
  const activeColor = color || (isBlockHeader ? '#ffffff' : config.color);

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        color: activeColor,
        fontSize: size ? (typeof size === 'number' ? `${size}px` : size) : undefined,
        ...style,
      }}
      {...props}
    >
      {config.icon}
    </span>
  );
};

export default ActionIcon;
