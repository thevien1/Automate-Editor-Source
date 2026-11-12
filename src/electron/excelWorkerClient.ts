import { Worker } from 'worker_threads';
import path from 'path';

// Reuse one worker; its synchronous message handler serializes Excel updates,
// including read-modify-write operations from different automation threads.
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, (result: any) => void>();

export function runExcelAction(action: string, payload: any): Promise<any> {
  return new Promise(resolve => {
    try {
      if (!worker) {
        const instance = new Worker(path.join(__dirname, 'excelWorker.js'));
        worker = instance;
        const fail = (error: string) => {
          if (worker !== instance) return;
          worker = undefined;
          for (const finish of pending.values()) finish({ success: false, error });
          pending.clear();
        };
        instance.on('message', ({ id, result }) => {
          pending.get(id)?.(result);
          pending.delete(id);
        });
        instance.on('error', error => fail(error.message));
        instance.on('exit', code => fail(`Excel worker exited (${code})`));
      }
      const id = ++nextId;
      pending.set(id, resolve);
      try { worker.postMessage({ id, action, payload }); }
      catch (error: any) {
        pending.delete(id);
        resolve({ success: false, error: error.message });
      }
    } catch (error: any) { resolve({ success: false, error: error.message }); }
  });
}

export async function stopExcelWorker() {
  const current = worker;
  worker = undefined;
  for (const finish of pending.values()) finish({ success: false, error: 'Excel worker stopped' });
  pending.clear();
  if (current) await current.terminate();
}
