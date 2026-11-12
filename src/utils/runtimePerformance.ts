export const MAX_THREAD_LOGS = 500;
export const VISIBLE_THREAD_LOGS = 200;
export const MAX_LOG_TEXT_LENGTH = 4000;

export interface RuntimeLog {
  time: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'arrow';
}

export interface PendingThreadLogs {
  logs: RuntimeLog[];
  currentAction?: string;
}

// Bound both the pending buffer and retained state during long-running sessions.
export function queueThreadLog(buffer: Map<number, PendingThreadLogs>, threadId: number,
  log: RuntimeLog, currentAction?: string) {
  let entry = buffer.get(threadId);
  if (!entry) {
    entry = { logs: [] };
    buffer.set(threadId, entry);
  }
  entry.logs.push({ ...log, text: log.text.length > MAX_LOG_TEXT_LENGTH
    ? log.text.slice(0, MAX_LOG_TEXT_LENGTH) + '…' : log.text });
  if (entry.logs.length > MAX_THREAD_LOGS) entry.logs.splice(0, entry.logs.length - MAX_THREAD_LOGS);
  if (currentAction !== undefined) entry.currentAction = currentAction;
}

export function applyThreadLogs<T extends { id: number; logs: RuntimeLog[]; currentAction: string }>(
  threads: T[], buffer: Map<number, PendingThreadLogs>): T[] {
  return threads.map(thread => {
    const pending = buffer.get(thread.id);
    if (!pending) return thread;
    return { ...thread, currentAction: pending.currentAction ?? thread.currentAction,
      logs: thread.logs.concat(pending.logs).slice(-MAX_THREAD_LOGS) };
  });
}

// Awaiting resolved promises alone never lets Chromium process input or paint.
export function createCooperativeYield(budgetMs = 16) {
  let lastYield = performance.now();
  return async () => {
    if (performance.now() - lastYield < budgetMs) return;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    lastYield = performance.now();
  };
}
