import React, { useState } from 'react';
import { WorkflowTabs } from './WorkflowTabs';
import { NodeRow } from './NodeRow';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { useProject } from '../../context/ProjectContext';
import { Lightbulb, Keyboard } from '../common/Icons';
import { ActionDefinition } from '../../types/ui';
import { WorkflowNode } from '../../types/gscript';

export const Canvas: React.FC = () => {
  const {
    currentProject,
    activeWorkflowTab,
    activeScript,
    insertActionOrBlock,
    showShortcuts,
    setShowShortcuts,
    selectNode,
  } = useProject();
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

  if (!currentProject) return null;

  const script = activeScript || currentProject.script;
  const isMain = activeWorkflowTab === 'main';

  const roots = isMain
    ? [
        { key: 'before_init', node: script.before_init },
        { key: 'main_logic', node: script.main_logic },
        { key: 'after_quit', node: script.after_quit },
      ]
    : [
        { key: 'main_logic', node: script.main_logic },
      ];

  // Compute sequential step numbers across all nodes
  let globalStepCounter = 1;
  const assignStepNumbers = (node: WorkflowNode): { node: WorkflowNode; step: number; children: any[] } => {
    const currentStep = globalStepCounter++;
    const isBlock = 'nodes' in node && Array.isArray((node as any).nodes);
    const children = isBlock ? ((node as any).nodes as WorkflowNode[]).map(ch => assignStepNumbers(ch)) : [];
    return { node, step: currentStep, children };
  };

  const steppedRoots = roots.map(r => ({
    key: r.key,
    ...assignStepNumbers(r.node),
  }));

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDragOver(true);
  };

  const handleCanvasDragLeave = () => {
    setIsCanvasDragOver(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDragOver(false);
    const rawAction = e.dataTransfer.getData('application/gpm-action');
    if (rawAction) {
      try {
        const actionDef: ActionDefinition = JSON.parse(rawAction);
        insertActionOrBlock(actionDef);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#080c16] relative overflow-hidden text-left transition-colors">
      {/* Workflow Tabs */}
      <WorkflowTabs />

      {/* Main Canvas Scroll Area */}
      <div
        className="flex-1 overflow-y-auto p-4 relative text-left"
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            selectNode(null);
          }
        }}
      >
        {/* Info Banner (Light/Dark theme blue banner matching screenshot) */}
        <div className="bg-[#e6f4ff] dark:bg-[#0c1830] border border-[#91caff] dark:border-[#1d4ed8]/70 rounded-lg p-2.5 mb-4 flex items-center space-x-3 text-xs text-[#0958d9] dark:text-[#60a5fa] shadow-xs transition-colors">
          <div className="w-5 h-5 rounded-full bg-[#1677ff] dark:bg-[#2563eb] flex items-center justify-center text-white shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
          </div>
          <div className="text-xs text-[#0958d9] dark:text-[#93c5fd]">
            Instructions for writing logic that is easy to read, maintain, and upgrade. Visit at:{' '}
            <a
              href="https://docs.gpmautomate.com/"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline text-[#1677ff] dark:text-[#38bdf8] hover:underline"
            >
              HERE
            </a>
          </div>
        </div>

        {/* The 3 Core Workflow Blocks & Nested Nodes */}
        <div className="space-y-1.5 w-full pb-28 text-left">
          {steppedRoots.map((r, idx) => (
            <NodeRow
              key={r.node.id}
              node={r.node}
              stepNumber={r.step}
              depth={0}
              parentId={null}
              indexInParent={idx}
              isRoot={true}
            />
          ))}
        </div>

        {/* Floating Round Shortcuts Button */}
        <div className="fixed bottom-8 right-8 z-30">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#0b1324] text-slate-800 dark:text-white border border-[#d9d9d9] dark:border-[#1e293b] flex items-center justify-center shadow-lg hover:scale-105 transition-transform hover:bg-[#f8fafc] dark:hover:bg-[#162238] hover:border-[#1677ff] dark:hover:border-[#38bdf8]"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-5 h-5 text-[#1677ff] dark:text-[#38bdf8]" />
          </button>
        </div>

        {/* Floating Shortcuts Overlay Card */}
        {showShortcuts && <ShortcutsOverlay />}
      </div>
    </div>
  );
};
