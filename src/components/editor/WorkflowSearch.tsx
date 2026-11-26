import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { indexWorkflow, BLOCK_NAMES } from '../../utils/workflowLocation';
import { ACTION_CATEGORIES } from '../../data/actionsCatalog';

export const WorkflowSearch: React.FC = () => {
  const { currentProject, revealWorkflowNode } = useProject();
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const reveal = useRef(revealWorkflowNode); reveal.current = revealWorkflowNode;
  useEffect(() => {
    const show = () => { setOpen(true); requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); }); };
    window.addEventListener('svb:workflow-search', show);
    return () => window.removeEventListener('svb:workflow-search', show);
  }, []);
  useEffect(() => { setQuery(''); setCursor(0); }, [currentProject?.info.id]);
  const matches = useMemo(() => {
    if (!currentProject || !query.trim()) return [];
    const entries = [...indexWorkflow(currentProject.script), ...Object.entries(currentProject.subWorkflows || {}).flatMap(([name, script]) => indexWorkflow(script, name))];
    const names = new Map(ACTION_CATEGORIES.flatMap(category => category.actions.map(action => [action.type, action.name] as const)));
    const needle = query.trim().toLocaleLowerCase();
    return entries.filter(item => {
      const n = item.node as any;
      return [n.display_text, n.comment, n.element_xpath, n.raw_input, n.condition, n.id, names.get(n.type), String(item.line)].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle);
    });
  }, [query, currentProject?.script, currentProject?.subWorkflows]);
  const current = matches.length ? matches[cursor % matches.length] : undefined;
  useEffect(() => { if (open && current) reveal.current(current.workflow, current.nodeId); }, [open, current?.workflow, current?.nodeId]);
  const move = (delta: number) => { if (matches.length) setCursor((cursor + delta + matches.length) % matches.length); };
  if (!open) return null;
  return <div className="mx-4 mt-3 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
    <div className="flex items-center gap-2">
      <input ref={input} aria-label="Tìm trong workflow" placeholder="Search workflow…" value={query} onChange={e => { setQuery(e.target.value); setCursor(0); }} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } if (e.key === 'Enter') { e.preventDefault(); move(e.shiftKey ? -1 : 1); } }} className="flex-1 min-w-0 border border-blue-400 rounded px-2 py-1.5 bg-transparent outline-none" />
      <span role="status" className="whitespace-nowrap text-slate-500">{query.trim() ? matches.length ? `${cursor % matches.length + 1}/${matches.length}` : 'Không tìm thấy' : ''}</span>
      <button aria-label="Kết quả trước" title="Trước (Shift+Enter)" disabled={!matches.length} onClick={() => move(-1)} className="px-2 py-1 disabled:opacity-30">⌃</button>
      <button aria-label="Kết quả sau" title="Sau (Enter)" disabled={!matches.length} onClick={() => move(1)} className="px-2 py-1 disabled:opacity-30">⌄</button>
      <button aria-label="Đóng tìm kiếm" onClick={() => setOpen(false)} className="px-2 py-1">×</button>
    </div>
    {current && <div className="text-[10px] text-slate-500 pt-1">{current.workflow === 'main' ? 'Nhánh chính' : `Nhánh phụ: ${current.workflow}`} › {BLOCK_NAMES[current.block]} › Dòng {current.line}</div>}
  </div>;
};
