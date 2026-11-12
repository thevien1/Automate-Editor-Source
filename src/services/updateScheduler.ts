interface ScheduleHost {
  setTimeout(callback: () => void, delay: number): any;
  clearTimeout(id: any): void;
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
}

// Check soon after opening, retry once after 30 seconds, then every 5 minutes.
// Focus/network recovery also refresh stale results without overlapping requests.
export function startUpdateScheduler(check: () => Promise<unknown>, host: ScheduleHost = window, now = Date.now) {
  let disposed = false;
  let pending = false;
  let firstCheck = true;
  let lastStarted = -Infinity;
  let timer: any;
  const run = async () => {
    if (disposed || pending) return;
    host.clearTimeout(timer);
    pending = true;
    lastStarted = now();
    try { await check(); }
    catch { /* The caller owns the error UI; keep automatic retries alive. */ }
    finally {
      pending = false;
      if (!disposed) timer = host.setTimeout(() => { void run(); }, firstCheck ? 30_000 : 300_000);
      firstCheck = false;
    }
  };
  const focus = () => { if (now() - lastStarted >= 30_000) void run(); };
  const online = () => { void run(); };
  timer = host.setTimeout(() => { void run(); }, 2000);
  host.addEventListener('focus', focus);
  host.addEventListener('online', online);
  return () => {
    disposed = true;
    host.clearTimeout(timer);
    host.removeEventListener('focus', focus);
    host.removeEventListener('online', online);
  };
}
