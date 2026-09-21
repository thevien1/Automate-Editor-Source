import React, { useState } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Plus,
  Palette,
} from '../common/Icons';
import { ActionIcon } from '../common/ActionIcon';
import { ACTION_CATEGORIES } from '../../data/actionsCatalog';
import { useProject } from '../../context/ProjectContext';
import { ActionDefinition } from '../../types/ui';
import { ActionIconEditorModal } from '../modals/ActionIconEditorModal';

export const ActionsSidebar: React.FC = () => {
  const { insertActionOrBlock } = useProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAction, setEditingAction] = useState<ActionDefinition | null>(null);

  // Trạng thái mở/đóng các danh mục Actions
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    block: true,
    image_search: true,
    variables: false,
    workflow: false,
    text_number: false,
    file_folder: false,
    browser_nav: false,
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredCategories = ACTION_CATEGORIES.map((cat) => {
    if (!searchTerm.trim()) return cat;
    const matchedActions = cat.actions.filter(
      (a) =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      ...cat,
      actions: matchedActions,
      count: matchedActions.length,
    };
  }).filter((cat) => !searchTerm.trim() || cat.actions.length > 0);

  const handleDoubleClick = (action: ActionDefinition) => {
    insertActionOrBlock(action);
  };

  const handleDragStart = (e: React.DragEvent, action: ActionDefinition) => {
    e.dataTransfer.setData('application/gpm-action', JSON.stringify(action));
    e.dataTransfer.effectAllowed = 'all';
  };

  return (
    <div className="w-64 bg-white dark:bg-[#080d19] border-r border-[#e2e8f0] dark:border-[#162236] flex flex-col h-full select-none text-left transition-colors">
      {/* Sidebar Header: Actions only (as requested in Image 2) */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e2e8f0] dark:border-[#162236] bg-[#fafbfc] dark:bg-[#0a0f1d] text-xs">
        <div className="flex items-center space-x-2 font-bold text-[#1e293b] dark:text-[#f1f5f9]">
          <Layers className="w-4 h-4 text-[#1677ff] dark:text-[#38bdf8]" />
          <span>Actions</span>
        </div>
        <span className="text-[10px] text-[#64748b] bg-white dark:bg-[#0f172a] px-2 py-0.5 rounded-full border border-[#e2e8f0] dark:border-[#1e293b]">
          {filteredCategories.reduce((acc, c) => acc + c.count, 0)}
        </span>
      </div>

      {/* Search Box & Customize hint */}
      <div className="p-2.5 pb-2 space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#94a3b8] dark:text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search actions..."
            className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-[#0f172a] text-[#1e293b] dark:text-[#f1f5f9] border border-[#d9d9d9] dark:border-[#1e293b] rounded hover:border-[#1677ff] dark:hover:border-[#38bdf8] focus:border-[#1677ff] dark:focus:border-[#38bdf8] focus:outline-none transition-colors placeholder-[#94a3b8]"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#64748b] dark:text-[#94a3b8] px-0.5">
          <span>💡 Rê chuột bấm 🎨 để đổi icon</span>
          <span className="flex items-center space-x-1 text-[#1677ff] dark:text-[#38bdf8]">
            <Palette className="w-2.5 h-2.5" />
            <span>Tùy biến</span>
          </span>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1 space-y-1">
        {filteredCategories.map((category) => {
          const isExpanded = !!expandedCategories[category.id];
          return (
            <div key={category.id} className="space-y-0.5">
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(category.id)}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#f1f5f9] dark:hover:bg-[#15233c] cursor-pointer text-[#475569] dark:text-[#94a3b8] group transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-[#94a3b8] group-hover:text-[#1677ff] transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </span>
                  <span className="text-xs font-semibold text-[#1e293b] dark:text-[#cbd5e1]">
                    {category.name}
                  </span>
                </div>
                <span className="text-[10px] text-[#64748b] bg-[#f1f5f9] dark:bg-[#0f172a] group-hover:bg-[#e2e8f0] dark:group-hover:bg-[#1e293b] px-1.5 py-0.2 rounded-full min-w-[18px] text-center border border-[#e2e8f0] dark:border-[#1e293b]">
                  {category.count}
                </span>
              </div>

              {/* Sub Actions List (Draggable & Double-Clickable) */}
              {isExpanded && (
                <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-[#e2e8f0] dark:border-[#162236] ml-3 mt-0.5">
                  {category.actions.map((action) => (
                    <div
                      key={action.type + action.name}
                      draggable
                      onDragStart={(e) => handleDragStart(e, action)}
                      onDoubleClick={() => handleDoubleClick(action)}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-[#e6f4ff] dark:hover:bg-[#15233c] hover:text-[#1677ff] dark:hover:text-white text-[#334155] dark:text-[#cbd5e1] cursor-grab active:cursor-grabbing group transition-colors"
                      title={`${action.description} (Nhấp đúp để thêm vào kịch bản)`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        {/* Icon badge */}
                        <div className="w-6 h-6 rounded-md bg-[#eef2f6] dark:bg-[#1e293b] flex items-center justify-center shrink-0">
                          <ActionIcon
                            actionName={action.name}
                            actionType={action.type}
                            className="w-3.5 h-3.5"
                          />
                        </div>
                        <span className="truncate text-xs font-normal">{action.name}</span>
                      </div>

                      <div className="flex items-center space-x-0.5">
                        {/* Palette Customize Icon button (chỉ mở khi chủ động bấm) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAction(action);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/60 text-[#d97706] dark:text-[#f59e0b] transition-opacity"
                          title="Đổi Icon & Màu sắc cho action này"
                        >
                          <Palette className="w-3 h-3" />
                        </button>

                        {/* Add button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDoubleClick(action);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-600/20 text-[#1677ff] dark:text-[#38bdf8] transition-opacity"
                          title="Thêm action vào kịch bản"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal chỉnh sửa Icon & Màu sắc cho Action */}
      {editingAction && (
        <ActionIconEditorModal
          isOpen={!!editingAction}
          actionName={editingAction.name}
          actionType={editingAction.type}
          onClose={() => setEditingAction(null)}
        />
      )}
    </div>
  );
};

export default ActionsSidebar;
