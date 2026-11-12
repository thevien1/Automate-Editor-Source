import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

// macOS updates require a signed app and the ZIP payload in its release.
export function registerAppUpdater() {
  const supported = app.isPackaged && (process.platform === 'darwin' || (process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_FILE));
  let state: any = { status: 'idle', supported, percent: 0, version: app.getVersion() };
  let pending: Promise<any> | null = null;
  const publish = (next: any) => {
    state = { ...state, ...next };
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('updater:state', state);
    }
  };
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.requestHeaders = { ...autoUpdater.requestHeaders, 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
  autoUpdater.on('error', (error) => publish({ status: 'error', error: error.message }));
  autoUpdater.on('checking-for-update', () => publish({ status: 'checking', error: undefined }));
  autoUpdater.on('update-available', (info) => publish({ status: 'downloading', version: info.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => publish({ status: 'idle' }));
  autoUpdater.on('download-progress', (progress) => publish({ status: 'downloading', percent: progress.percent }));
  autoUpdater.on('update-downloaded', (info) => publish({ status: 'downloaded', version: info.version, percent: 100 }));

  ipcMain.handle('updater:state', () => state);
  ipcMain.handle('updater:check', async () => {
    if (!supported) return { unsupported: true };
    if (pending) return pending;
    if (['downloaded', 'downloading', 'installing'].includes(state.status)) return { version: state.version, hasUpdate: true };
    pending = (async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        const info = result?.updateInfo;
        // Determine availability from the returned version, not event timing.
        const hasUpdate = Boolean(info && autoUpdater.currentVersion.compare(info.version) < 0);
        if (hasUpdate) {
          publish({ status: 'downloading', version: info!.version, error: undefined });
          // Keep the check responsive while the verified installer downloads in background.
          void autoUpdater.downloadUpdate().catch((error: Error) => publish({ status: 'error', error: error.message }));
        }
        return { version: info?.version || app.getVersion(), hasUpdate,
          releaseName: info?.releaseName, releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : '',
          publishedAt: info?.releaseDate };
      } catch (error: any) {
        publish({ status: 'error', error: error.message });
        return { error: error.message };
      } finally { pending = null; }
    })();
    return pending;
  });
  ipcMain.handle('updater:install', async () => {
    if (state.status !== 'downloaded') return false;
    publish({ status: 'installing' });
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
    return true;
  });
}
