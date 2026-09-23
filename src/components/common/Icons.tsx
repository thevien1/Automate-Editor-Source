import React from 'react';
import { BIcon, BIconProps } from './BIcon';

export { BIcon };

type IconComponent = React.FC<Omit<BIconProps, 'name'>>;

const createIcon = (name: string): IconComponent => {
  const IconComp: IconComponent = (props) => <BIcon name={name} {...props} />;
  IconComp.displayName = `Icon(${name})`;
  return IconComp;
};

// Window & Layout Controls
export const X = createIcon('x-lg');
export const Minus = createIcon('dash-lg');
export const Square = createIcon('square');
export const Check = createIcon('check-lg');
export const CheckCircle2 = createIcon('check-circle-fill');
export const CheckSquare = createIcon('check-square-fill');
export const Circle = createIcon('circle-fill');
export const GripVertical = createIcon('grip-vertical');

// Navigation & Chevrons
export const ChevronDown = createIcon('chevron-down');
export const ChevronUp = createIcon('chevron-up');
export const ChevronRight = createIcon('chevron-right');
export const ArrowLeft = createIcon('arrow-left');
export const ArrowRight = createIcon('arrow-right');
export const CornerDownRight = createIcon('arrow-return-right');

// Media & Player Controls
export const Play = createIcon('play-fill');
export const PlayCircle = createIcon('play-circle');
export const Pause = createIcon('pause-fill');
export const Stop = createIcon('stop-fill');
export const SkipForward = createIcon('skip-forward-fill');
export const RotateCcw = createIcon('arrow-counterclockwise');
export const RotateCw = createIcon('arrow-clockwise');
export const Undo2 = createIcon('arrow-counterclockwise');
export const Redo2 = createIcon('arrow-clockwise');
export const RefreshCw = createIcon('arrow-repeat');

// Folders & Files
export const Folder = createIcon('folder2');
export const FolderOpen = createIcon('folder2-open');
export const FolderPlus = createIcon('folder-plus');
export const FolderCheck = createIcon('folder-check');
export const FolderSync = createIcon('folder-symlink');
export const FolderEdit = createIcon('folder');
export const FolderX = createIcon('folder-x');
export const FolderTree = createIcon('diagram-3');
export const FileText = createIcon('file-earmark-text');
export const FileSpreadsheet = createIcon('file-earmark-excel');
export const FileCheck = createIcon('file-earmark-check');
export const FileEdit = createIcon('file-earmark-ruled');
export const FilePlus = createIcon('file-earmark-plus');
export const FileImage = createIcon('file-earmark-image');

// Editing & Clipboard
export const Copy = createIcon('copy');
export const Trash2 = createIcon('trash3');
export const Pencil = createIcon('pencil');
export const Save = createIcon('floppy');
export const Clipboard = createIcon('clipboard');
export const ClipboardCopy = createIcon('clipboard-check');
export const ClipboardPaste = createIcon('clipboard-data');
export const Scissors = createIcon('scissors');
export const Plus = createIcon('plus-lg');
export const Search = createIcon('search');

// Devices, System & Hardware
export const Globe = createIcon('globe2');
export const Monitor = createIcon('display');
export const Smartphone = createIcon('phone');
export const Terminal = createIcon('terminal');
export const Cpu = createIcon('cpu');
export const Keyboard = createIcon('keyboard');
export const Mouse = createIcon('mouse');
export const MousePointer: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }> = ({
  className = 'w-4 h-4',
  size,
  style,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ ...(style || {}), ...(size ? { width: size, height: size } : {}) }}
    {...props}
  >
    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="m13 13 6 6" />
  </svg>
);
export const MousePointer2 = MousePointer;
export const Pointer = createIcon('hand-index-thumb');
export const Hand = createIcon('hand-index');
export const HandFist = createIcon('front');
export const Move = createIcon('arrows-move');
export const Camera = createIcon('camera');
export const Image = createIcon('image');
export const ImageIcon = createIcon('image');

// Security & Account
export const Key = createIcon('key-fill');
export const Shield = createIcon('shield-check');
export const Users = createIcon('people-fill');
export const LogOut = createIcon('box-arrow-right');
export const Eye = createIcon('eye');
export const EyeOff = createIcon('eye-slash');

// UI Controls & Settings
export const Settings = createIcon('gear-fill');
export const Sliders = createIcon('sliders');
export const SlidersHorizontal = createIcon('sliders');
export const Calendar = createIcon('calendar-event');
export const Layers = createIcon('layers');
export const HelpCircle = createIcon('question-circle');
export const AlertTriangle = createIcon('exclamation-triangle-fill');
export const Lightbulb = createIcon('lightbulb-fill');
export const Sparkles = createIcon('stars');
export const Palette = createIcon('palette');
export const ShoppingBag = createIcon('bag');
export const Moon = createIcon('moon-stars-fill');
export const Sun = createIcon('sun-fill');
export const Hourglass = createIcon('hourglass-split');
export const Clock = createIcon('clock');

// Actions & Blocks
export const Box = createIcon('box-seam');
export const Repeat = createIcon('repeat');
export const GitBranch = createIcon('signpost-split');
export const Variable = createIcon('code-square');
export const Dices = createIcon('dice-5');
export const ListOrdered = createIcon('list-ol');
export const Link = createIcon('link-45deg');
export const Link2 = createIcon('link');
export const XCircle = createIcon('x-circle');
export const Code2 = createIcon('code-slash');
export const Shuffle = createIcon('shuffle');
export const Asterisk = createIcon('asterisk');
export const Calculator = createIcon('calculator');
export const Zap = createIcon('lightning-charge-fill');
export const FlaskConical = createIcon('flask');
export const Wand2 = createIcon('magic');
export const Mail = createIcon('envelope');
export const Grid = createIcon('grid-fill');
export const Grid3x3 = createIcon('grid-3x3-gap-fill');
export const Download = createIcon('download');
export const Home = createIcon('house-fill');
export const Window = createIcon('window');
export const WindowStack = createIcon('window-stack');
export const Layout = createIcon('layout-split');
export const Cookie = createIcon('cookie');
