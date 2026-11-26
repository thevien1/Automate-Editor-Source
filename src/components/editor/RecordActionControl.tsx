import React, { useEffect, useRef, useState } from 'react';
import { Circle } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

export const RecordActionControl: React.FC = () => {
  const { currentProject, activeWorkflowTab, selectedBlockKey, insertNodesFromJson, showToast } = useProject();
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'starting' | 'recording' | 'stopping'>('idle');
  const [remaining, setRemaining] = useState(3);
  const [count, setCount] = useState(0);
  const [port, setPort] = useState(() => localStorage.getItem('svb_debug_port') || localStorage.getItem('gpm_debug_port') || '53002');
  const [pendingNodes, setPendingNodes] = useState<any[]>([]);
  const alive = useRef(true);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const context = `${currentProject?.info.id || ''}:${activeWorkflowTab}:${selectedBlockKey}`;
  const latest = useRef({ context, selectedBlockKey, insertNodesFromJson, showToast });
  latest.current = { context, selectedBlockKey, insertNodesFromJson, showToast };
  const destination = useRef(context);
  const stopRef = useRef<() => Promise<void>>(async () => {});
  const api = () => (window as any).electronAPI;
  const finish = async () => {
    if (['idle', 'stopping'].includes(phaseRef.current)) return;
    phaseRef.current = 'stopping'; setPhase('stopping');
    try {
      const result = await api()?.stopRecorder();
      if (!alive.current) return;
      const nodes = result?.nodes || [];
      if (nodes.length && destination.current === latest.current.context) {
        const inserted = latest.current.insertNodesFromJson(JSON.stringify(nodes), latest.current.selectedBlockKey);
        if (!inserted.success) { setPendingNodes(nodes); latest.current.showToast('Record action', inserted.error || 'Chưa chèn được action'); }
      } else if (nodes.length) {
        setPendingNodes(nodes);
        latest.current.showToast('Record action', 'Đã đổi dự án hoặc khối. Bấm Chèn action để thêm vào vị trí hiện tại.');
      }
    } catch (error: any) { if (alive.current) latest.current.showToast('Record action', error.message); }
    finally { if (alive.current) { phaseRef.current = 'idle'; setPhase('idle'); } }
  };
  stopRef.current = finish;
  useEffect(() => {
    alive.current = true;
    const unsubscribe = api()?.onRecorderStatus?.((status: any) => {
      if (!alive.current) return;
      setCount(status.count || 0);
      if (status.error) latest.current.showToast('Record action', status.error);
      if (status.recording === false && phaseRef.current === 'recording') void stopRef.current();
    });
    return () => { alive.current = false; unsubscribe?.(); void api()?.stopRecorder?.(); };
  }, []);
  useEffect(() => {
    if (phase !== 'countdown') return;
    const timer = setTimeout(() => {
      if (remaining > 1) { setRemaining(remaining - 1); return; }
      phaseRef.current = 'starting'; setPhase('starting');
      void (async () => {
        try {
          const result = await api().startRecorder({ port: Number(port) });
          if (!alive.current) { await api()?.stopRecorder?.(); return; }
          if (!result?.success) throw Error(result?.error || 'Không thể bật Record action');
          phaseRef.current = 'recording'; setPhase('recording'); setCount(result.count || 0);
        } catch (error: any) {
          if (alive.current) { phaseRef.current = 'idle'; setPhase('idle'); latest.current.showToast('Record action', error.message); }
        }
      })();
    }, 1000);
    return () => clearTimeout(timer);
  }, [phase, remaining, port]);
  const click = () => {
    if (phase === 'countdown') { phaseRef.current = 'idle'; setPhase('idle'); return; }
    if (phase === 'recording') { void finish(); return; }
    if (phase !== 'idle') return;
    if (!currentProject || !api()?.startRecorder) { showToast('Record action', 'Mở dự án bằng ứng dụng Editor để ghi thao tác.'); return; }
    if (pendingNodes.length) { showToast('Record action', 'Hãy chèn các action đã ghi trước khi ghi lần mới.'); return; }
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) { showToast('Record action', 'Nhập port Chromium hợp lệ.'); return; }
    localStorage.setItem('svb_debug_port', port);
    destination.current = context; setCount(0); setRemaining(3); phaseRef.current = 'countdown'; setPhase('countdown');
  };
  return <div className="flex items-center gap-1">
    <button onClick={click} disabled={phase === 'starting' || phase === 'stopping'} className={`flex items-center space-x-1 px-2 py-1 rounded text-[#f43f5e] hover:bg-[#f43f5e]/15 transition-colors disabled:opacity-50 ${phase === 'recording' ? 'bg-rose-50 dark:bg-rose-950' : ''}`} title="Ghi click trái, nhập chữ, phím Enter/Tab, cuộn và dropdown trong tab Chromium. Không ghi ngoài trình duyệt, iframe hoặc ô mật khẩu.">
      <Circle className={`w-3 h-3 fill-[#f43f5e] text-[#f43f5e] ${phase === 'recording' ? 'animate-pulse' : ''}`} />
      <span>{phase === 'countdown' ? 'Hủy ghi' : phase === 'starting' ? 'Đang kết nối…' : phase === 'recording' ? 'Dừng ghi' : phase === 'stopping' ? 'Đang lưu…' : 'Record action'}</span>
    </button>
    {phase === 'idle' && !pendingNodes.length && <input aria-label="Port Chromium ghi thao tác" title="Port Chromium" type="number" min="1" max="65535" value={port} onChange={e => setPort(e.target.value)} className="w-[64px] px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-[10px]" />}
    <span role="status" aria-live="polite" className="text-[11px] text-rose-600 whitespace-nowrap">{phase === 'countdown' ? `Đợi ${remaining}s` : phase === 'recording' ? `Đang ghi · ${count} action` : ''}</span>
    {!!pendingNodes.length && phase === 'idle' && <button className="text-[11px] text-blue-600 underline" onClick={() => {
      const result = insertNodesFromJson(JSON.stringify(pendingNodes), selectedBlockKey);
      if (result.success) setPendingNodes([]); else showToast('Record action', result.error || 'Chưa mở dự án');
    }}>Chèn {pendingNodes.length} action</button>}
  </div>;
};
