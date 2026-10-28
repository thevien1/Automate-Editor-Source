import { app, BrowserWindow, ipcMain, dialog, clipboard, desktopCapturer, screen, shell, nativeImage, powerSaveBlocker } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, execSync } from 'child_process';
import * as XLSX from 'xlsx';
import http from 'http';
import WebSocket from 'ws';
import { RUNTIME_ICON_BASE64 } from './runtimeIconBase64';

// Disable all background throttling in Chromium so automation never freezes or lags when unfocused/occluded
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Prevent Windows OS from suspending the app or throttling power in background
try {
  powerSaveBlocker.start('prevent-app-suspension');
} catch (e) {}

// Detect if this instance is running in runtime mode (e.g. running standalone built .exe or --runtime)
const isInitialRuntime = process.argv.includes('--runtime') ||
  process.argv.some(a => a.toLowerCase().endsWith('.svblaunch') || a.toLowerCase().endsWith('.gpmlaunch'));

// Set Windows AppUserModelId for Taskbar icon grouping and display:
// Completely separate ID for Runtime so it NEVER groups with or inherits the Editor taskbar icon!
if (isInitialRuntime) {
  app.setAppUserModelId('com.svbrowser.automate.runtime');
  app.setName('SV Browser Automate Runtime');
} else {
  app.setAppUserModelId('com.svbrowser.automateeditor');
  app.setName('SV Browser Automate Editor');
}

const windows = new Set<BrowserWindow>();

function getTargetWindow(event?: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): BrowserWindow | null {
  if (event) {
    const fromSender = BrowserWindow.fromWebContents(event.sender);
    if (fromSender) return fromSender;
  }
  return BrowserWindow.getFocusedWindow() || (windows.size > 0 ? Array.from(windows)[0] : null);
}

// Map to track launch args per window instance
const windowLaunchArgs = new Map<number, { isRuntime: boolean; packagePath?: string; projectPath?: string }>();

function createWindow(customArgv?: string[]): BrowserWindow {
  const argv = customArgv || process.argv;
  const isRuntimeArg = argv.includes('--runtime') ||
    argv.some(a => a.toLowerCase().endsWith('.svblaunch') || a.toLowerCase().endsWith('.gpmlaunch'));

  let packageArg = argv.find(a => a.toLowerCase().endsWith('.svblaunch') || a.toLowerCase().endsWith('.gpmlaunch'));
  if (!packageArg) {
    const pkgIdx = argv.indexOf('--package');
    if (pkgIdx !== -1 && argv[pkgIdx + 1]) {
      packageArg = argv[pkgIdx + 1];
    }
  }

  const projectArgIndex = argv.indexOf('--project');
  const projectArg = projectArgIndex !== -1 ? argv[projectArgIndex + 1] : undefined;

  const iconName = isRuntimeArg ? 'runtime_icon' : 'icon';
  const iconPath = path.join(__dirname, `../public/${iconName}.ico`);
  const iconPngPath = path.join(__dirname, `../public/${iconName}.png`);

  let resolvedIcon: any = fs.existsSync(iconPath)
    ? iconPath
    : fs.existsSync(iconPngPath)
    ? iconPngPath
    : undefined;

  let runtimeIconDiskPath: string | undefined = undefined;
  if (isRuntimeArg) {
    try {
      const diskDir = path.join(app.getPath('userData'), 'icons');
      if (!fs.existsSync(diskDir)) fs.mkdirSync(diskDir, { recursive: true });
      runtimeIconDiskPath = path.join(diskDir, 'runtime_icon.ico');
      fs.writeFileSync(runtimeIconDiskPath, Buffer.from(RUNTIME_ICON_BASE64, 'base64'));
      resolvedIcon = nativeImage.createFromPath(runtimeIconDiskPath);
    } catch {
      resolvedIcon = nativeImage.createFromBuffer(Buffer.from(RUNTIME_ICON_BASE64, 'base64'));
    }
  }

  const pkgVersion = (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
      return pkg.version || '3.1.0';
    } catch {
      return '3.1.0';
    }
  })();

  const titlePrefix = isRuntimeArg ? 'SV Browser Automate Runtime' : 'SV Browser Automate Editor';

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    frame: false, // Frameless custom desktop titlebar
    backgroundColor: '#f0f2f5',
    icon: resolvedIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevents pausing/throttling when unfocused or occluded by other windows
    },
    title: `${titlePrefix} v${pkgVersion}-stable`,
  });

  windowLaunchArgs.set(win.id, {
    isRuntime: isRuntimeArg,
    packagePath: packageArg,
    projectPath: projectArg,
  });

  if (resolvedIcon) {
    win.setIcon(resolvedIcon);
  }

  // Instruct Windows Taskbar shell explicitly for this window:
  if (isRuntimeArg) {
    try {
      win.setAppDetails({
        appId: 'com.svbrowser.automate.runtime',
        appIconPath: runtimeIconDiskPath,
        relaunchDisplayName: 'SV Browser Automate Runtime',
      });
    } catch {}
  } else {
    try {
      win.setAppDetails({
        appId: 'com.svbrowser.automateeditor',
        relaunchDisplayName: 'SV Browser Automate Editor',
      });
    } catch {}
  }

  // Tự động mở toàn màn hình (maximized) khi khởi chạy
  win.maximize();

  const queryParams: Record<string, string> = {};
  if (isRuntimeArg) queryParams.mode = 'runtime';
  if (packageArg) queryParams.package = packageArg;
  if (projectArg) queryParams.project = projectArg;

  const queryString = Object.keys(queryParams).length > 0
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';

  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath, Object.keys(queryParams).length > 0 ? { query: queryParams } : undefined);
  } else {
    win.loadURL(`http://localhost:5173${queryString}`);
  }

  windows.add(win);

  win.on('closed', () => {
    windows.delete(win);
    windowLaunchArgs.delete(win.id);
  });

  return win;
}

// Window control handlers
ipcMain.on('window-minimize', (event) => {
  const win = getTargetWindow(event);
  win?.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = getTargetWindow(event);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = getTargetWindow(event);
  win?.close();
});

// App level window creation
ipcMain.handle('app:newWindow', () => {
  createWindow();
  return { success: true };
});

// File dialog handlers
ipcMain.handle('dialog:openFolder', async (event) => {
  const win = getTargetWindow(event);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('app:getDefaultSavePath', () => {
  try {
    return path.join(app.getPath('documents'), 'SV_Browser_Projects');
  } catch {
    return 'C:\\SV_Browser_Projects';
  }
});

ipcMain.handle('app:checkPathExists', (_event, targetPath: string) => {
  try {
    if (!targetPath) return false;
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
});

ipcMain.handle('app:openExternal', async (_event, url: string) => {
  try {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
  } catch {}
  return false;
});


ipcMain.handle('dialog:openFile', async (event, options?: { title?: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
  const win = getTargetWindow(event);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: options?.title || 'Select File',
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:saveFile', async (event, options?: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
  const win = getTargetWindow(event);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: options?.title || 'Select File',
    defaultPath: options?.defaultPath,
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Save Project according to SKILL.md format: info.gpmsln + src.gscript + runtime.json + sub-workflows
ipcMain.handle('fs:saveProject', async (_, projectData: any) => {
  try {
    if (!projectData) return { success: false, error: 'No project data' };
    if (projectData.isPackaged) {
      // Packaged bundles (.svblaunch) must NEVER write raw code files to disk!
      return { success: true };
    }
    const { folderPath, info, script, runtimeConfig, subWorkflows } = projectData;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const infoPath = path.join(folderPath, 'info.gpmsln');
    const infoSvbPath = path.join(folderPath, 'info.svbsln');
    const scriptPath = path.join(folderPath, 'src.gscript');

    fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), 'utf-8');
    try { fs.writeFileSync(infoSvbPath, JSON.stringify(info, null, 2), 'utf-8'); } catch {}
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), 'utf-8');

    // Save sub-workflows
    if (subWorkflows && typeof subWorkflows === 'object') {
      for (const [subName, subScript] of Object.entries(subWorkflows)) {
        if (!subName || subName === 'main' || subName === 'src') continue;
        const subPath = path.join(folderPath, `${subName}.gscript`);
        fs.writeFileSync(subPath, JSON.stringify(subScript, null, 2), 'utf-8');
      }
    }

    // Clean up any explicitly deleted .gscript files on disk
    if (Array.isArray(projectData._deletedSubWorkflows)) {
      for (const delName of projectData._deletedSubWorkflows) {
        try {
          const targetFile = path.join(folderPath, `${delName}.gscript`);
          if (fs.existsSync(targetFile)) {
            fs.unlinkSync(targetFile);
          }
        } catch {}
      }
    }

    if (runtimeConfig) {
      const runtimePath = path.join(folderPath, 'runtime.json');
      fs.writeFileSync(runtimePath, JSON.stringify(runtimeConfig, null, 2), 'utf-8');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Read Project from disk
ipcMain.handle('fs:readProject', async (_, folderPath: string) => {
  try {
    let infoPath = path.join(folderPath, 'info.svbsln');
    if (!fs.existsSync(infoPath)) {
      infoPath = path.join(folderPath, 'info.gpmsln');
    }
    const scriptPath = path.join(folderPath, 'src.gscript');

    if (!fs.existsSync(infoPath) || !fs.existsSync(scriptPath)) {
      return { success: false, error: 'Thư mục dự án không hợp lệ (thiếu info.svbsln/info.gpmsln hoặc src.gscript)' };
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));

    // Read all other .gscript files in the folder as sub-workflows
    const subWorkflows: Record<string, any> = {};
    try {
      const diskFiles = fs.readdirSync(folderPath);
      for (const f of diskFiles) {
        if (f.endsWith('.gscript') && f !== 'src.gscript') {
          const baseName = path.basename(f, '.gscript');
          try {
            const subContent = fs.readFileSync(path.join(folderPath, f), 'utf-8');
            subWorkflows[baseName] = JSON.parse(subContent);
          } catch {}
        }
      }
    } catch {}

    let runtimeConfig: any = undefined;
    const runtimePath = path.join(folderPath, 'runtime.json');
    if (fs.existsSync(runtimePath)) {
      try {
        runtimeConfig = JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
      } catch (e) {
        // ignore parse error
      }
    }

    return { success: true, project: { folderPath, info, script, subWorkflows, runtimeConfig } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Save Runtime Config directly to runtime.json in project folder
ipcMain.handle('fs:saveRuntimeConfig', async (_, data: { folderPath: string; runtimeConfig: any; isPackaged?: boolean }) => {
  try {
    const { folderPath, runtimeConfig, isPackaged } = data;
    if (isPackaged) return { success: true };
    if (!folderPath) return { success: false, error: 'No folderPath provided' };
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const runtimePath = path.join(folderPath, 'runtime.json');
    fs.writeFileSync(runtimePath, JSON.stringify(runtimeConfig, null, 2), 'utf-8');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// App Launch arguments IPC
ipcMain.handle('app:getLaunchArgs', (event) => {
  const win = getTargetWindow(event);
  if (win && windowLaunchArgs.has(win.id)) {
    return windowLaunchArgs.get(win.id)!;
  }
  const isRuntime = process.argv.includes('--runtime') ||
    process.argv.some(a => a.toLowerCase().endsWith('.svblaunch') || a.toLowerCase().endsWith('.gpmlaunch'));
  let packageArg = process.argv.find(a => a.toLowerCase().endsWith('.svblaunch') || a.toLowerCase().endsWith('.gpmlaunch'));
  if (!packageArg) {
    const pkgIdx = process.argv.indexOf('--package');
    if (pkgIdx !== -1 && process.argv[pkgIdx + 1]) {
      packageArg = process.argv[pkgIdx + 1];
    }
  }
  const projectArgIndex = process.argv.indexOf('--project');
  const projectArg = projectArgIndex !== -1 ? process.argv[projectArgIndex + 1] : undefined;
  return {
    isRuntime,
    packagePath: packageArg,
    projectPath: projectArg,
  };
});

// Build .svblaunch Package IPC
ipcMain.handle('fs:buildPackage', async (_, data: {
  folderPath: string;
  exportPath?: string;
  packageName?: string;
  version?: string;
  author?: string;
  password?: string;
  useLicense?: boolean;
  note?: string;
  isPortable?: boolean;
}) => {
  try {
    const { folderPath, exportPath, packageName, version, author, password, useLicense, note, isPortable } = data;
    if (!fs.existsSync(folderPath)) {
      return { success: false, error: 'Thư mục dự án không tồn tại: ' + folderPath };
    }

    const infoPath = fs.existsSync(path.join(folderPath, 'info.svbsln'))
      ? path.join(folderPath, 'info.svbsln')
      : path.join(folderPath, 'info.gpmsln');
    const scriptPath = path.join(folderPath, 'src.gscript');

    if (!fs.existsSync(infoPath) || !fs.existsSync(scriptPath)) {
      return { success: false, error: 'Thư mục dự án không hợp lệ (thiếu info.gpmsln hoặc src.gscript)' };
    }

    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));

    // Keep original project untouched. Note, password, and author are packaged exclusively for the export bundle.
    const noteText = note !== undefined ? note : (info.description || '');

    // Clean up any old .build file in the original project folder so it never gets locked
    try {
      const existingBuild = path.join(folderPath, '.build');
      if (fs.existsSync(existingBuild)) fs.unlinkSync(existingBuild);
    } catch {}

    // Read subworkflows
    const subWorkflows: Record<string, any> = {};
    const diskFiles = fs.readdirSync(folderPath);
    for (const f of diskFiles) {
      if (f.endsWith('.gscript') && f !== 'src.gscript') {
        const baseName = path.basename(f, '.gscript');
        try {
          subWorkflows[baseName] = JSON.parse(fs.readFileSync(path.join(folderPath, f), 'utf-8'));
        } catch {}
      }
    }

    // Read runtime config if exists
    let runtimeConfig: any = null;
    const runtimePath = path.join(folderPath, 'runtime.json');
    if (fs.existsSync(runtimePath)) {
      try {
        runtimeConfig = JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
      } catch {}
    }

    const app_name = packageName || info.name || 'Application';
    const app_id = info.id || 'svb_' + Date.now();
    const app_version = version || info.version || '1.0.0';
    const author_info = author || info.author_info || 'SV Browser - svbrowser.com';

    // Build manifest (.build) for the packaged bundle
    const buildManifest = {
      app_id,
      app_name,
      app_password: password || '',
      author_info,
      note: noteText,
      description: noteText,
      use_license_system: !!useLicense,
      version: app_version,
      built_at: new Date().toISOString(),
    };

    const packagedInfo = {
      ...info,
      name: app_name,
      version: app_version,
      author_info,
      description: noteText,
    };

    // Create packaged bundle
    const packagePayload = {
      format: 'SVB_LAUNCH_V1',
      manifest: buildManifest,
      info: packagedInfo,
      script,
      subWorkflows,
      runtimeConfig,
    };

    // Obfuscate / encrypt bundle with Base64 payload & signature so source code is not visible
    const encodedPayload = Buffer.from(JSON.stringify(packagePayload)).toString('base64');
    const svbLaunchContent = JSON.stringify({
      header: 'SVB_LAUNCH_PACKAGE',
      version: '1.0',
      app_id,
      app_name,
      checksum: Buffer.from(app_id + app_name).toString('hex'),
      payload: encodedPayload,
    }, null, 2);

    // Determine target directory
    const targetDir = exportPath ? exportPath : path.join(folderPath, 'build');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Safe helper to strip Windows hidden/readonly attributes and remove file before overwriting
    const safePrepareFile = (filePath: string) => {
      try {
        if (fs.existsSync(filePath)) {
          try {
            execSync(`attrib -h -r -s "${filePath}"`, { stdio: 'ignore' });
          } catch {}
          try {
            fs.unlinkSync(filePath);
          } catch {}
        }
      } catch {}
    };

    const safeName = app_name.replace(/[\\/:*?"<>|]/g, '_');

    // Terminate any currently running instance of the launcher if open
    try {
      execSync(`taskkill /F /IM "Chay_${safeName}.exe" /T`, { stdio: 'ignore' });
      execSync(`taskkill /F /IM "${safeName}.exe" /T`, { stdio: 'ignore' });
    } catch {}

    const isExportingToProjectFolder = path.resolve(targetDir) === path.resolve(folderPath);

    // Clean any raw code files (.gscript, .gpmsln, .svbsln, .build, .bat, runtime.json) in targetDir to protect source code
    if (!isExportingToProjectFolder) {
      try {
        const existingInTarget = fs.readdirSync(targetDir);
        for (const f of existingInTarget) {
          if (f.endsWith('.gscript') || f === 'info.gpmsln' || f === 'info.svbsln' || f === '.build' || f.endsWith('.bat') || f === 'runtime.json') {
            safePrepareFile(path.join(targetDir, f));
          }
        }
      } catch {}
    }

    // Safely write .svblaunch file
    const finalPackagePath = path.join(targetDir, `${safeName}.svblaunch`);
    safePrepareFile(finalPackagePath);
    fs.writeFileSync(finalPackagePath, svbLaunchContent, 'utf-8');

    // Hide .svblaunch so end users do not see it in Explorer
    try {
      execSync(`attrib +h "${finalPackagePath}"`, { stdio: 'ignore' });
    } catch {}

    // 1. Obtain runtime 3D lightning icon bytes (guaranteed never empty with embedded Base64)
    let iconBuffer: Buffer | null = null;
    const candidateIconPaths = [
      path.join(__dirname, '../public/runtime_icon.ico'),
      path.join(__dirname, '../dist/runtime_icon.ico'),
      path.join(__dirname, 'runtime_icon.ico'),
      path.join(process.cwd(), 'public/runtime_icon.ico'),
      path.join(process.cwd(), 'dist/runtime_icon.ico'),
      path.join(app.getAppPath(), 'public/runtime_icon.ico'),
      path.join(app.getAppPath(), 'dist/runtime_icon.ico'),
    ];
    for (const p of candidateIconPaths) {
      try {
        if (fs.existsSync(p)) {
          const b = fs.readFileSync(p);
          if (b && b.length > 0) {
            iconBuffer = b;
            break;
          }
        }
      } catch {}
    }
    if (!iconBuffer || iconBuffer.length === 0) {
      iconBuffer = Buffer.from(RUNTIME_ICON_BASE64, 'base64');
    }

    // Write real physical icon to temp directory for csc.exe compiler
    const physicalIconPath = path.join(os.tmpdir(), `svb_icon_${Date.now()}.ico`);
    safePrepareFile(physicalIconPath);
    try {
      fs.writeFileSync(physicalIconPath, iconBuffer);
    } catch {}

    // Also write icon.ico to targetDir and mark hidden
    const destIcon = path.join(targetDir, 'icon.ico');
    safePrepareFile(destIcon);
    try {
      fs.writeFileSync(destIcon, iconBuffer);
      execSync(`attrib +h "${destIcon}"`, { stdio: 'ignore' });
    } catch {}

    // Clean up any old files with Chay_ prefix or .bat so ONLY <safeName>.exe remains
    safePrepareFile(path.join(targetDir, `Chay_${safeName}.exe`));
    safePrepareFile(path.join(targetDir, `Chay_${safeName}.bat`));

    // Find C# compiler in Windows
    let runnerExePath: string | null = null;
    const cscCandidates = [
      'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework64\\v3.5\\csc.exe',
      'C:\\Windows\\Microsoft.NET\\Framework\\v3.5\\csc.exe',
    ];
    const cscPath = cscCandidates.find(p => fs.existsSync(p));

    // Target executable: ONLY <safeName>.exe (without Chay_ prefix)
    const targetExePath = path.join(targetDir, `${safeName}.exe`);
    safePrepareFile(targetExePath);
    const appExeName = 'SV Browser Automate Editor.exe';

    // If Portable mode is selected: copy runtime dependencies into targetDir/runtime so it runs anywhere without install
    if (isPortable) {
      try {
        const candidateRuntimeDirs = [
          path.dirname(process.execPath),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'SV Browser Automate Editor'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'sv-browser-automate-editor'),
          'C:\\Program Files\\SV Browser Automate Editor',
        ];
        const sourceRuntimeDir = candidateRuntimeDirs.find(d => 
          fs.existsSync(d) && (
            fs.existsSync(path.join(d, 'SV Browser Automate Editor.exe')) ||
            fs.existsSync(path.join(d, 'resources', 'app.asar'))
          )
        );

        if (sourceRuntimeDir) {
          const runtimeTargetDir = path.join(targetDir, 'runtime');
          if (!fs.existsSync(runtimeTargetDir)) {
            fs.mkdirSync(runtimeTargetDir, { recursive: true });
          }

          const copyRecursive = (src: string, dest: string) => {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.name.startsWith('Uninstall') || entry.name.endsWith('.log') || entry.name === '.git') continue;
              const sPath = path.join(src, entry.name);
              const dPath = path.join(dest, entry.name);
              if (entry.isDirectory()) {
                copyRecursive(sPath, dPath);
              } else {
                try {
                  fs.copyFileSync(sPath, dPath);
                } catch {}
              }
            }
          };

          copyRecursive(sourceRuntimeDir, runtimeTargetDir);
        }
      } catch (copyErr) {
        console.error('Lỗi sao chép runtime portable:', copyErr);
      }
    }

    if (cscPath && fs.existsSync(physicalIconPath)) {
      const tempCsPath = path.join(os.tmpdir(), `__temp_runner_${Date.now()}.cs`);
      const tempPkgPath = path.join(os.tmpdir(), `__temp_pkg_${Date.now()}.svblaunch`);
      safePrepareFile(tempPkgPath);
      fs.writeFileSync(tempPkgPath, svbLaunchContent, 'utf-8');

      const csSource = `
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

namespace SVBRunner {
    static class Program {
        static string FindEditor(string baseDir, string exeName) {
            // 1. Kiểm tra đường dẫn lưu trong bộ nhớ đệm (nếu người dùng đã từng chỉ định)
            try {
                string cacheFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "sv-browser-automate-runtime", "editor_path.txt");
                if (File.Exists(cacheFile)) {
                    string cached = File.ReadAllText(cacheFile).Trim();
                    if (File.Exists(cached)) return cached;
                    if (Directory.Exists(cached) && File.Exists(Path.Combine(cached, exeName))) return Path.Combine(cached, exeName);
                }
            } catch {}

            // 2. Kiểm tra tương đối từ thư mục của file chạy (Chế độ Portable hoặc cùng thư mục)
            string[] relativeDirs = new string[] {
                baseDir,
                Path.Combine(baseDir, "runtime"),
                Path.Combine(baseDir, "bin"),
                Path.Combine(baseDir, "editor"),
                Path.Combine(baseDir, ".."),
                Path.Combine(baseDir, "..", "runtime"),
                Path.Combine(baseDir, "..", "..")
            };
            foreach (var d in relativeDirs) {
                try {
                    string candidate = Path.Combine(d, exeName);
                    if (File.Exists(candidate)) return Path.GetFullPath(candidate);
                } catch {}
            }

            // 3. Tự động nhận diện thư mục AppData\\Local của người dùng HIỆN TẠI trên máy này
            try {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                if (!string.IsNullOrEmpty(localAppData)) {
                    string[] appDataCandidates = new string[] {
                        Path.Combine(localAppData, "Programs", "SV Browser Automate Editor", exeName),
                        Path.Combine(localAppData, "Programs", "sv-browser-automate-editor", exeName),
                        Path.Combine(localAppData, "SV Browser Automate Editor", exeName),
                        Path.Combine(localAppData, "sv-browser-automate-editor", exeName)
                    };
                    foreach (var c in appDataCandidates) {
                        if (File.Exists(c)) return c;
                    }
                }
            } catch {}

            // 4. Kiểm tra Program Files & Program Files (x86)
            try {
                string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                if (!string.IsNullOrEmpty(pf)) {
                    string c = Path.Combine(pf, "SV Browser Automate Editor", exeName);
                    if (File.Exists(c)) return c;
                }
                string pfx86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
                if (!string.IsNullOrEmpty(pfx86)) {
                    string c = Path.Combine(pfx86, "SV Browser Automate Editor", exeName);
                    if (File.Exists(c)) return c;
                }
            } catch {}

            // 5. Quét Registry Windows (App Paths & Uninstall) trên HKCU và HKLM
            try {
                RegistryKey[] rootKeys = new RegistryKey[] { Registry.CurrentUser, Registry.LocalMachine };
                foreach (var baseKey in rootKeys) {
                    try {
                        using (var k = baseKey.OpenSubKey(@"Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\" + exeName)) {
                            if (k != null) {
                                string p = k.GetValue(null) as string;
                                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
                            }
                        }
                    } catch {}

                    try {
                        using (var u = baseKey.OpenSubKey(@"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall")) {
                            if (u != null) {
                                foreach (var sub in u.GetSubKeyNames()) {
                                    try {
                                        using (var subKey = u.OpenSubKey(sub)) {
                                            if (subKey == null) continue;
                                            string disp = subKey.GetValue("DisplayName") as string;
                                            if (disp != null && disp.IndexOf("SV Browser Automate", StringComparison.OrdinalIgnoreCase) >= 0) {
                                                string icon = subKey.GetValue("DisplayIcon") as string;
                                                if (!string.IsNullOrEmpty(icon)) {
                                                    icon = icon.Split(',')[0].Trim('"');
                                                    if (File.Exists(icon) && icon.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) return icon;
                                                }
                                                string loc = subKey.GetValue("InstallLocation") as string;
                                                if (!string.IsNullOrEmpty(loc)) {
                                                    string exePath = Path.Combine(loc.Trim('"'), exeName);
                                                    if (File.Exists(exePath)) return exePath;
                                                }
                                                string uninst = subKey.GetValue("UninstallString") as string;
                                                if (!string.IsNullOrEmpty(uninst)) {
                                                    uninst = uninst.Split(new string[] { ".exe" }, StringSplitOptions.None)[0] + ".exe";
                                                    uninst = uninst.Trim('"');
                                                    string dir = Path.GetDirectoryName(uninst);
                                                    if (!string.IsNullOrEmpty(dir)) {
                                                        string exePath = Path.Combine(dir, exeName);
                                                        if (File.Exists(exePath)) return exePath;
                                                    }
                                                }
                                            }
                                        }
                                    } catch {}
                                }
                            }
                        }
                    } catch {}
                }
            } catch {}

            // 6. Quét các user profile khác trên máy (nếu cài dưới user khác như Administrator)
            try {
                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                string usersDir = Path.GetDirectoryName(userProfile);
                if (!string.IsNullOrEmpty(usersDir) && Directory.Exists(usersDir)) {
                    foreach (var userFolder in Directory.GetDirectories(usersDir)) {
                        try {
                            string otherPath = Path.Combine(userFolder, "AppData", "Local", "Programs", "SV Browser Automate Editor", exeName);
                            if (File.Exists(otherPath)) return otherPath;
                        } catch {}
                    }
                }
            } catch {}

            // 7. Các đường dẫn cài đặt thông dụng khác trên các ổ đĩa
            string[] commonPaths = new string[] {
                @"D:\\Phần mềm\\GPMAutomateEditor\\" + exeName,
                @"D:\\Phần mềm\\SV Browser Automate Editor\\" + exeName,
                @"C:\\Phần mềm\\GPMAutomateEditor\\" + exeName,
                @"C:\\Phần mềm\\SV Browser Automate Editor\\" + exeName
            };
            foreach (var cp in commonPaths) {
                if (File.Exists(cp)) return cp;
            }

            return null;
        }

        [STAThread]
        static void Main(string[] args) {
            try {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;

                // Dọn dẹp các file kịch bản thô nếu có trong thư mục để bảo mật
                try {
                    string[] looseScripts = Directory.GetFiles(baseDir, "*.gscript");
                    foreach (var f in looseScripts) {
                        try { File.Delete(f); } catch {}
                    }
                    string looseGpmsln = Path.Combine(baseDir, "info.gpmsln");
                    if (File.Exists(looseGpmsln)) { try { File.Delete(looseGpmsln); } catch {} }
                    string looseSvbsln = Path.Combine(baseDir, "info.svbsln");
                    if (File.Exists(looseSvbsln)) { try { File.Delete(looseSvbsln); } catch {} }
                    string looseRuntime = Path.Combine(baseDir, "runtime.json");
                    if (File.Exists(looseRuntime)) { try { File.Delete(looseRuntime); } catch {} }
                } catch {}

                string runtimeDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "sv-browser-automate-runtime");
                Directory.CreateDirectory(runtimeDir);
                string pkgDir = Path.Combine(runtimeDir, "packages");
                Directory.CreateDirectory(pkgDir);
                string pkgPath = Path.Combine(pkgDir, @"${safeName}.svblaunch");

                // Trích xuất tài nguyên nhúng vào AppData runtime
                try {
                    var assembly = Assembly.GetExecutingAssembly();
                    using (Stream stream = assembly.GetManifestResourceStream("EmbeddedPackage.svblaunch")) {
                        if (stream != null) {
                            using (FileStream fs = new FileStream(pkgPath, FileMode.Create, FileAccess.Write)) {
                                byte[] buffer = new byte[81920];
                                int read;
                                while ((read = stream.Read(buffer, 0, buffer.Length)) > 0) {
                                    fs.Write(buffer, 0, read);
                                }
                            }
                        }
                    }
                } catch {}

                // Dự phòng: Nếu không có trong AppData, kiểm tra tệp cục bộ
                if (!File.Exists(pkgPath)) {
                    string localPkg = Path.Combine(baseDir, @"${safeName}.svblaunch");
                    if (File.Exists(localPkg)) {
                        pkgPath = localPkg;
                    } else {
                        string[] svbFiles = Directory.GetFiles(baseDir, "*.svblaunch");
                        if (svbFiles.Length > 0) pkgPath = svbFiles[0];
                    }
                }

                string exeName = @"${appExeName}";
                string targetExe = FindEditor(baseDir, exeName);

                // Nếu vẫn chưa tìm thấy tự động, hiển thị hộp thoại hỏi người dùng có muốn chỉ định file exe không
                if (targetExe == null || !File.Exists(targetExe)) {
                    DialogResult dr = MessageBox.Show(
                        "Không tìm thấy tự động ứng dụng SV Browser Automate Editor trên máy tính này.\\n\\n" +
                        "Nếu bạn đã cài đặt hoặc có thư mục SV Browser Automate Editor trên máy, bạn có muốn chọn vị trí file 'SV Browser Automate Editor.exe' không?",
                        "SV Browser Automate Runtime",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Question
                    );

                    if (dr == DialogResult.Yes) {
                        using (OpenFileDialog ofd = new OpenFileDialog()) {
                            ofd.Title = "Chọn file SV Browser Automate Editor.exe";
                            ofd.Filter = "SV Browser Automate Editor|SV Browser Automate Editor.exe;*.exe|Tất cả tệp (*.*)|*.*";
                            ofd.FileName = exeName;
                            if (ofd.ShowDialog() == DialogResult.OK && File.Exists(ofd.FileName)) {
                                targetExe = ofd.FileName;
                                try {
                                    string cacheDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "sv-browser-automate-runtime");
                                    Directory.CreateDirectory(cacheDir);
                                    File.WriteAllText(Path.Combine(cacheDir, "editor_path.txt"), targetExe);
                                } catch {}
                            }
                        }
                    }
                }

                if (targetExe != null && File.Exists(targetExe)) {
                    string runtimeUserData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "sv-browser-automate-runtime");
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = targetExe;
                    psi.Arguments = "--runtime --package \\"" + pkgPath + "\\" --user-data-dir=\\"" + runtimeUserData + "\\"";
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                } else {
                    MessageBox.Show(
                        "Không tìm thấy ứng dụng SV Browser Automate Editor để thực thi kịch bản này.\\nVui lòng cài đặt SV Browser Automate Editor trước.",
                        "SV Browser Automate Runtime",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                }
            } catch (Exception ex) {
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
`;
      try {
        fs.writeFileSync(tempCsPath, csSource, 'utf-8');
        const compileCmd = `"${cscPath}" /nologo /target:winexe /r:System.Windows.Forms.dll /win32icon:"${physicalIconPath}" /resource:"${tempPkgPath}",EmbeddedPackage.svblaunch /out:"${targetExePath}" "${tempCsPath}"`;
        execSync(compileCmd, { stdio: 'pipe' });
        if (fs.existsSync(targetExePath)) {
          runnerExePath = targetExePath;
          try {
            execSync(`attrib -h -r "${targetExePath}"`, { stdio: 'ignore' });
          } catch {}
        }
      } catch (compileErr: any) {
        console.error('Native launcher compilation error:', compileErr?.stdout?.toString() || compileErr?.message);
      } finally {
        if (fs.existsSync(tempCsPath)) {
          try { fs.unlinkSync(tempCsPath); } catch {}
        }
        if (fs.existsSync(tempPkgPath)) {
          try { fs.unlinkSync(tempPkgPath); } catch {}
        }
        if (fs.existsSync(physicalIconPath)) {
          try { fs.unlinkSync(physicalIconPath); } catch {}
        }
      }
    }

    if (!runnerExePath || !fs.existsSync(runnerExePath)) {
      return {
        success: false,
        error: 'Không thể biên dịch file .exe khởi chạy kịch bản. Vui lòng thử lại.',
      };
    }

    return {
      success: true,
      packagePath: finalPackagePath,
      launcherPath: runnerExePath,
      exePath: runnerExePath,
      targetDir,
      appName: app_name,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Read and unpack .svblaunch package
ipcMain.handle('fs:readPackage', async (_, packagePath: string) => {
  try {
    if (!fs.existsSync(packagePath)) {
      return { success: false, error: 'File gói không tồn tại: ' + packagePath };
    }
    const raw = fs.readFileSync(packagePath, 'utf-8');
    const json = JSON.parse(raw);
    if (json.header === 'SVB_LAUNCH_PACKAGE' && json.payload) {
      const decoded = JSON.parse(Buffer.from(json.payload, 'base64').toString('utf-8'));
      const folderPath = path.dirname(packagePath);

      // Clean up any stray raw script files in folderPath so they NEVER appear to the user
      try {
        const files = fs.readdirSync(folderPath);
        for (const f of files) {
          if (f.endsWith('.gscript') || f === 'info.gpmsln' || f === 'info.svbsln' || f === '.build' || f.endsWith('.bat') || f === 'runtime.json') {
            try {
              fs.unlinkSync(path.join(folderPath, f));
            } catch {}
          }
        }
      } catch {}
      return {
        success: true,
        project: {
          folderPath: path.dirname(packagePath),
          packagePath,
          manifest: decoded.manifest,
          info: decoded.info,
          script: decoded.script,
          subWorkflows: decoded.subWorkflows || {},
          runtimeConfig: decoded.runtimeConfig || undefined,
          isPackaged: true,
        },
      };
    }
    return { success: false, error: 'Định dạng gói .svblaunch không hợp lệ' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Show file/folder in Explorer
ipcMain.handle('fs:showInFolder', async (_, targetPath: string) => {
  try {
    if (fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
      return { success: true };
    }
    return { success: false, error: 'Đường dẫn không tồn tại' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

const httpGet = (urlStr: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const r = http.get(urlStr, { timeout: 3500 }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
  });
};

const httpPut = (urlStr: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const r = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'PUT',
      timeout: 3500,
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
    r.end();
  });
};

interface WsEntry {
  ws: WebSocket;
  pending: Map<number, { resolve: (val: any) => void; timer: NodeJS.Timeout }>;
}
const wsPool = new Map<string, WsEntry>();

let nextWsId = 100;
const sendWs = (wsUrl: string, method: string, params: any = {}, timeoutMs: number = 6000): Promise<any> => {
  return new Promise((resolve) => {
    try {
      const normalizedWsUrl = wsUrl.replace('//localhost:', '//127.0.0.1:');
      const reqId = ++nextWsId;

      let entry = wsPool.get(normalizedWsUrl);

      const sendOnSocket = (targetWs: WebSocket, targetPending: Map<number, any>) => {
        const timer = setTimeout(() => {
          targetPending.delete(reqId);
          resolve({ success: false, error: 'WebSocket timeout' });
        }, timeoutMs);

        targetPending.set(reqId, { resolve, timer });
        try {
          targetWs.send(JSON.stringify({ id: reqId, method, params }));
        } catch (e: any) {
          clearTimeout(timer);
          targetPending.delete(reqId);
          resolve({ success: false, error: e.message });
        }
      };

      if (entry && entry.ws.readyState === WebSocket.OPEN) {
        sendOnSocket(entry.ws, entry.pending);
        return;
      }

      if (entry && entry.ws.readyState === WebSocket.CONNECTING) {
        entry.ws.addEventListener('open', () => {
          sendOnSocket(entry!.ws, entry!.pending);
        }, { once: true });
        entry.ws.addEventListener('error', (err) => {
          resolve({ success: false, error: String(err) });
        }, { once: true });
        return;
      }

      if (entry) {
        try { entry.ws.close(); } catch (e) {}
        wsPool.delete(normalizedWsUrl);
      }

      const pendingMap = new Map<number, { resolve: (val: any) => void; timer: NodeJS.Timeout }>();
      const ws = new WebSocket(normalizedWsUrl);
      const newEntry: WsEntry = { ws, pending: pendingMap };
      wsPool.set(normalizedWsUrl, newEntry);

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data.toString());
          if (data && data.id) {
            const req = pendingMap.get(data.id);
            if (req) {
              clearTimeout(req.timer);
              pendingMap.delete(data.id);
              if (data.error) {
                req.resolve({ success: false, error: data.error.message || JSON.stringify(data.error) });
              } else {
                req.resolve({ success: true, result: data.result });
              }
            }
          }
        } catch (e) {}
      };

      ws.onerror = (err) => {
        wsPool.delete(normalizedWsUrl);
        for (const [id, req] of pendingMap.entries()) {
          clearTimeout(req.timer);
          req.resolve({ success: false, error: String(err) });
        }
        pendingMap.clear();
      };

      ws.onclose = () => {
        wsPool.delete(normalizedWsUrl);
        for (const [id, req] of pendingMap.entries()) {
          clearTimeout(req.timer);
          req.resolve({ success: false, error: 'WebSocket connection closed' });
        }
        pendingMap.clear();
      };

      ws.onopen = () => {
        sendOnSocket(ws, pendingMap);
      };
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
};

// Mutex for sequential atomic file operations (e.g. concurrent profile writes to data.txt)
let fileActionLock = Promise.resolve<any>(undefined);

// File system actions for File & Folder automations
ipcMain.handle('fs:fileAction', async (_, req: { action: string; payload?: any }) => {
  try {
    let { action, payload } = req;
    if (action === 'exists') {
      const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
      const exists = Boolean(targetPath && fs.existsSync(targetPath) && fs.statSync(targetPath).isFile());
      return { success: true, exists };
    }
    if (action === 'read' || action === 'readText' || action === 'readFileText') {
      const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
      if (!targetPath || !fs.existsSync(targetPath)) {
        return { success: false, error: 'File does not exist: ' + targetPath };
      }
      const text = fs.readFileSync(targetPath, 'utf-8');
      return { success: true, content: text, text };
    }
    if (action === 'copy') {
      const destDir = path.dirname(payload.dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(payload.src, payload.dest);
      return { success: true };
    }
    if (action === 'move') {
      const destDir = path.dirname(payload.dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.renameSync(payload.src, payload.dest);
      return { success: true };
    }
    if (action === 'delete') {
      if (fs.existsSync(payload.path)) {
        fs.unlinkSync(payload.path);
      }
      return { success: true };
    }
    if (action === 'saveSourceDefaultIcons') {
      const configPath = path.join(__dirname, '../src/config/customDefaultIcons.json');
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      let current: Record<string, any> = {};
      if (fs.existsSync(configPath)) {
        try {
          current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {}
      }
      if (payload?.key) {
        current[payload.key.trim().toLowerCase()] = payload.config;
      } else if (payload?.all) {
        current = { ...current, ...payload.all };
      }
      fs.writeFileSync(configPath, JSON.stringify(current, null, 2), 'utf-8');
      return { success: true, path: configPath };
    }
    if (action === 'deleteSourceDefaultIcon') {
      const configPath = path.join(__dirname, '../src/config/customDefaultIcons.json');
      if (fs.existsSync(configPath)) {
        try {
          const current = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          delete current[payload.key.trim().toLowerCase()];
          fs.writeFileSync(configPath, JSON.stringify(current, null, 2), 'utf-8');
        } catch {}
      }
      return { success: true };
    }
    if (action === 'readText' || action === 'readFileText') {
      const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
      if (!targetPath || !fs.existsSync(targetPath)) {
        return { success: false, error: 'File does not exist: ' + targetPath };
      }
      const text = fs.readFileSync(targetPath, 'utf-8');
      return { success: true, text };
    }
    if (action === 'readLines' || action === 'readFileLines') {
      const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
      if (!targetPath || !fs.existsSync(targetPath)) {
        return { success: false, error: 'File does not exist: ' + targetPath };
      }
      let raw = fs.readFileSync(targetPath, 'utf-8');
      if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
      }
      const lines = raw.split(/\r?\n/);
      return { success: true, lines };
    }
    if (action === 'readRandomLine' || action === 'readFileRandomLine') {
      const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
      if (!targetPath || !fs.existsSync(targetPath)) {
        return { success: false, error: 'File does not exist: ' + targetPath };
      }
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);
      const line = lines.length > 0 ? lines[Math.floor(Math.random() * lines.length)] : '';
      return { success: true, line };
    }
    if (action === 'writeText') {
      const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
      if (!targetPath) return { success: false, error: 'File path is required' };
      let finalPath = targetPath;
      if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
        finalPath = path.join(finalPath, 'cookies.json');
      }
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(finalPath, payload.text ?? '', 'utf-8');
      return { success: true, path: finalPath };
    }
    if (action === 'appendLine' && (payload?.option?.toLowerCase()?.includes('update') || payload?.mode?.toLowerCase()?.includes('update'))) {
      action = 'updateFileLine';
    }
    if (action === 'appendLine') {
      const dir = path.dirname(payload.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let appendText = payload.text ?? '';
      if (!appendText.endsWith('\r\n') && !appendText.endsWith('\n')) {
        appendText += '\r\n';
      }

      if (fs.existsSync(payload.path)) {
        const stat = fs.statSync(payload.path);
        if (stat.size > 0) {
          const fd = fs.openSync(payload.path, 'r');
          const buffer = Buffer.alloc(Math.min(2, stat.size));
          fs.readSync(fd, buffer, 0, buffer.length, stat.size - buffer.length);
          fs.closeSync(fd);
          const endStr = buffer.toString('utf-8');
          if (!endStr.endsWith('\n') && !endStr.endsWith('\r')) {
            appendText = '\r\n' + appendText;
          }
        }
      }

      fs.appendFileSync(payload.path, appendText, 'utf-8');
      return { success: true };
    }
    if (action === 'updateFileLine' || action === 'updateLine') {
      const lockRes = await new Promise<{ success: boolean; error?: string; updatedLineIndex?: number; updatedLine?: string }>((resolve) => {
        fileActionLock = fileActionLock.then(() => {
          try {
            const targetPath = (payload?.path || '').trim().replace(/^["']|["']$/g, '');
            if (!targetPath) {
              resolve({ success: false, error: 'File path is required' });
              return;
            }
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            if (!fs.existsSync(targetPath)) {
              fs.writeFileSync(targetPath, '', 'utf-8');
            }

            const originalLine = typeof payload?.originalLine === 'string' ? payload.originalLine : undefined;
            const rawLineIdx = payload?.lineIndex;
            const lineIndex = typeof rawLineIdx === 'number'
              ? rawLineIdx
              : (rawLineIdx !== undefined && rawLineIdx !== null && !isNaN(parseInt(String(rawLineIdx), 10)))
                ? parseInt(String(rawLineIdx), 10)
                : -1;
            const suffix = payload?.suffix || ' | OK';
            const newText = payload?.newText;

            const raw = fs.readFileSync(targetPath, 'utf-8');
            const lines = raw.split(/\r?\n/);
            let targetIdx = -1;

            // 1. Direct check by lineIndex if it matches or starts with originalLine
            if (lineIndex >= 0 && lineIndex < lines.length) {
              const lineAtIdx = lines[lineIndex].trim();
              const cleanOrig = (originalLine || '').trim();
              if (!cleanOrig || lineAtIdx === cleanOrig || lineAtIdx.startsWith(cleanOrig)) {
                targetIdx = lineIndex;
              }
            }

            // 2. Try to match exact original line if lineIndex didn't match
            if (targetIdx === -1 && originalLine !== undefined && originalLine.trim().length > 0) {
              const cleanOrig = originalLine.trim();
              targetIdx = lines.findIndex(l => l.trim() === cleanOrig);
              if (targetIdx === -1) {
                targetIdx = lines.findIndex(l => l.trim().startsWith(cleanOrig));
              }
            }

            // 3. Fallback to line index
            if (targetIdx === -1 && lineIndex >= 0 && lineIndex < lines.length) {
              targetIdx = lineIndex;
            }

            // 4. Pad empty lines if lineIndex is beyond current length
            if (targetIdx === -1 && lineIndex >= lines.length && lineIndex < 100000) {
              while (lines.length <= lineIndex) {
                lines.push('');
              }
              targetIdx = lineIndex;
            }

            if (targetIdx === -1) {
              resolve({ success: false, error: `Could not find line to update (index: ${lineIndex}, text: "${originalLine}")` });
              return;
            }

            if (newText !== undefined) {
              lines[targetIdx] = newText;
            } else {
              const cur = lines[targetIdx];
              const trimmedSuffix = suffix.trim();
              if (!cur.trim().endsWith(trimmedSuffix)) {
                lines[targetIdx] = cur + suffix;
              }
            }

            const eol = raw.includes('\r\n') ? '\r\n' : '\n';
            fs.writeFileSync(targetPath, lines.join(eol), 'utf-8');
            resolve({ success: true, updatedLineIndex: targetIdx, updatedLine: lines[targetIdx] });
          } catch (e: any) {
            resolve({ success: false, error: e.message });
          }
        }).catch((err) => {
          resolve({ success: false, error: err.message });
        });
      });
      return lockRes;
    }
    if (action === 'createEmptyExcel') {
      let target = payload.path;
      if (!target) return { success: false, error: 'File path is required' };
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'output.xlsx');
      } else if (!path.extname(target)) {
        target = target + '.xlsx';
      }
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const b64 = 'UEsDBBQAAAAIAAxhMV24O/sYBAEAAC8CAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbK2RPU8DMQyGdyT+Q5QVNWkZEEK968DHCAzlB5ic7y66xI7itFz/Peq1ZUClE5MHv36fR/JyNcagtpjFM1V6YeZaITluPHWV/li/zO61kgLUQGDCSu9Q9Kq+vlqudwlFjTGQVLovJT1YK67HCGI4IY0xtJwjFDGcO5vADdChvZ3P76xjKkhlVvYdul4+YQubUNTzWJAOJhmDaPV4CO5ZlYaUgndQPJPdUvOLMjsSTMYwZaT3SW7GGLQ9S9hv/gYc7962mLNvUL1DLq8QsdJ2DPaL8/DJPJjLJWcsuW29w4bdJiIVIykjNNIjlhjMNE0ETyfvC/wpLHYai38W+ek/edjp3fU3UEsDBBQAAAAIAAxhMV00bwOttgAAACkBAAALAAAAX3JlbHMvLnJlbHONz7FqwzAQxvG9kHcQt8dyOpRSLHsJgazFfQBVPtvC0p3QKany9l2T0KH7x+/j3w01BnXFLJ7JwKFpQSE5njwtBr7G0/4dlBRLkw1MaOCGAkO/e+k+MdjimWT1SVSNgcTAWkr60FrcitFKwwmpxjBzjrZIw3nRybrNLqhf2/ZN53sD+gdTnScD+TwdQI23hP+xeZ69wyO7S0Qqf1w8LUCNNi9YDNSgfzhv38xbU2MA3Xf6IbD/BVBLAwQUAAAACAAMYTFdLPrEtLsAAAAqAQAAGgAAAHhsL19yZWxzL3dvcmtib29rLnhtbC5yZWxzjc8xa8MwEAXgvdD/IG6vz85QSrGcpRSyFucHCPlsi0h3Qqekzr8PZCgNdOj04A3f4/X7LUVzoaJB2ELXtGCIvUyBFwvH8fPlDYxWx5OLwmThSgr74fmp/6LoahDWNWQ1W4qsFtZa8zui+pWS00Yy8ZbiLCW5qo2UBbPzJ7cQ7tr2FctvA4YH0xwmC+UwdWDGa6b/2DLPwdOH+HMirn9M4LeUk65EFczoykLVwk+leI+u2VIEHHp8eDjcAFBLAwQUAAAACAAMYTFdHFJZMMAAAAAdAQAADwAAAHhsL3dvcmtib29rLnhtbI2PwU7DMBBE70j8g7V34oQDQlGcXhBSz8AHmHjTWPXuRrtuCX+PaOmd04xGmjeaYbdRcWdUy8IBuqYFhzxJynwI8PH++vAMzmrkFIswBvhGg914fzd8iR4/RY5uo8IWYKl17b23aUGK1siKvFGZRSlWa0QP3lbFmGxBrFT8Y9s+eYqZ4Uro9T8Mmec84YtMJ0KuV4hiiTUL25JXg3G4LNifOo6EAd5+fQfuku1TgA6c9jkF0H3qwI+Dv9X87dn4A1BLAwQUAAAACAAMYTFdgNjUEYYAAACeAAAAGAAAAHhsL3dvcmtzaGVldHMvc2hlZXQxLnhtbD3MQQrCMBBA0b3gHcLs7VQXIpKkG/EEeoChHdtiZlIyQevtBRduP7zvu1WSe3GxOWuAfdOCY+3zMOsY4H677k7grJIOlLJygA8bdHG78e9cnjYxV7dKUgsw1bqcEa2fWMiavLCukh65CFVrchnRlsI0/JAkPLTtEYVmheh/7UKVMHr8n+MXUEsBAhQAFAAAAAgADGExXbg7+xgEAQAALwIAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACAAMYTFdNG8DrbYAAAApAQAACwAAAAAAAAAAAAAAgAE1AQAAX3JlbHMvLnJlbHNQSwECFAAUAAAACAAMYTFdLPrEtLsAAAAqAQAAGgAAAAAAAAAAAAAAgAEUAgAAeGwvX3JlbHMvd29ya2Jvb2sueG1sLnJlbHNQSwECFAAUAAAACAAMYTFdHFJZMMAAAAAdAQAADwAAAAAAAAAAAAAAgAEHAwAAeGwvd29ya2Jvb2sueG1sUEsBAhQAFAAAAAgADGExXYDY1BGGAAAAngAAABgAAAAAAAAAAAAAAIAB9AMAAHhsL3dvcmtzaGVldHMvc2hlZXQxLnhtbFBLBQYAAAAABQAFAEUBAACwBAAAAAA=';
      fs.writeFileSync(target, Buffer.from(b64, 'base64'));
      return { success: true, path: target };
    }

    const colToIdx = (colStr: string): number => {
      const trimmed = colStr.trim();
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        return Math.max(0, num - 1);
      }
      let cIdx = 0;
      const upper = trimmed.toUpperCase();
      for (let i = 0; i < upper.length; i++) {
        cIdx = cIdx * 26 + (upper.charCodeAt(i) - 64);
      }
      return Math.max(0, cIdx - 1);
    };

    if (action === 'readExcel') {
      if (!fs.existsSync(payload.path)) {
        return { success: false, error: 'Excel file does not exist' };
      }
      const wb = XLSX.readFile(payload.path);
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      const sheetName = wb.SheetNames[sheetIdx] || wb.SheetNames[0];
      if (!sheetName || !wb.Sheets[sheetName]) {
        return { success: false, error: `Sheet index ${sheetIdx} does not exist` };
      }
      const ws = wb.Sheets[sheetName];
      const colIdx = colToIdx(String(payload.col || 'A'));
      const rowNum = parseInt(String(payload.row || '1'), 10) || 1;
      const cellAddress = XLSX.utils.encode_cell({ c: colIdx, r: rowNum - 1 });
      const cell = ws[cellAddress];
      const val = cell ? (cell.v !== undefined ? String(cell.v) : (cell.w || '')) : '';
      return { success: true, value: val };
    }
    if (action === 'readExcelAllRows') {
      if (!fs.existsSync(payload.path)) {
        return { success: false, error: 'Excel file does not exist' };
      }
      const wb = XLSX.readFile(payload.path);
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      const sheetName = wb.SheetNames[sheetIdx] || wb.SheetNames[0];
      if (!sheetName || !wb.Sheets[sheetName]) {
        return { success: false, error: `Sheet index ${sheetIdx} does not exist` };
      }
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      return { success: true, sheetName, rows };
    }
    if (action === 'writeExcel') {
      let wb: XLSX.WorkBook;
      if (fs.existsSync(payload.path)) {
        wb = XLSX.readFile(payload.path);
      } else {
        wb = XLSX.utils.book_new();
      }
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      let sheetName = wb.SheetNames[sheetIdx];
      let ws: XLSX.WorkSheet;
      if (!sheetName || !wb.Sheets[sheetName]) {
        sheetName = `Sheet${sheetIdx + 1}`;
        ws = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        ws = wb.Sheets[sheetName];
      }
      const colIdx = colToIdx(String(payload.col || 'A'));
      const rowNum = parseInt(String(payload.row || '1'), 10) || 1;
      const cellAddress = XLSX.utils.encode_cell({ c: colIdx, r: rowNum - 1 });
      XLSX.utils.sheet_add_aoa(ws, [[payload.value ?? '']], { origin: cellAddress });
      const dir = path.dirname(payload.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      XLSX.writeFile(wb, payload.path);
      return { success: true };
    }
    if (action === 'appendExcel') {
      let wb: XLSX.WorkBook;
      if (fs.existsSync(payload.path)) {
        wb = XLSX.readFile(payload.path);
      } else {
        wb = XLSX.utils.book_new();
      }
      const sheetIdx = parseInt(payload.sheetIndex, 10) || 0;
      let sheetName = wb.SheetNames[sheetIdx];
      let ws: XLSX.WorkSheet;
      if (!sheetName || !wb.Sheets[sheetName]) {
        sheetName = `Sheet${sheetIdx + 1}`;
        ws = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        ws = wb.Sheets[sheetName];
      }
      const colIdx = colToIdx(String(payload.col || 'A'));
      let nextRow = 1;
      while (
        ws[XLSX.utils.encode_cell({ c: colIdx, r: nextRow - 1 })] &&
        String(ws[XLSX.utils.encode_cell({ c: colIdx, r: nextRow - 1 })].v ?? '').trim() !== ''
      ) {
        nextRow++;
      }
      const cellAddress = XLSX.utils.encode_cell({ c: colIdx, r: nextRow - 1 });
      XLSX.utils.sheet_add_aoa(ws, [[payload.value ?? '']], { origin: cellAddress });
      const dir = path.dirname(payload.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      XLSX.writeFile(wb, payload.path);
      return { success: true, row: nextRow };
    }
    if (action === 'folderExists') {
      const exists = fs.existsSync(payload.path) && fs.statSync(payload.path).isDirectory();
      return { success: true, exists };
    }
    if (action === 'createFolder') {
      if (!fs.existsSync(payload.path)) {
        fs.mkdirSync(payload.path, { recursive: true });
      }
      return { success: true };
    }
    if (action === 'moveFolder') {
      if (!fs.existsSync(payload.src)) {
        return { success: false, error: 'Source folder does not exist' };
      }
      const destDir = path.dirname(payload.dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.renameSync(payload.src, payload.dest);
      return { success: true };
    }
    if (action === 'deleteFolder') {
      if (fs.existsSync(payload.path)) {
        fs.rmSync(payload.path, { recursive: true, force: true });
      }
      return { success: true };
    }
    if (action === 'cloneProfileExtensions') {
      const srcDir = (payload?.src || '').trim();
      const destDir = (payload?.dest || '').trim();
      const allowInIncognito = payload?.allowInIncognito !== false;

      if (!srcDir || !fs.existsSync(srcDir)) {
        return { success: false, error: 'Source profile folder does not exist: ' + srcDir };
      }
      if (!destDir) {
        return { success: false, error: 'Destination profile folder is required' };
      }

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const destDefaultDir = path.join(destDir, 'Default');
      if (!fs.existsSync(destDefaultDir)) {
        fs.mkdirSync(destDefaultDir, { recursive: true });
      }

      const srcDefaultDir = path.join(srcDir, 'Default');

      // 1. Copy toàn bộ thư mục extensions & cache từ profile gốc
      const foldersToClone = [
        { src: path.join(srcDir, 'extensions_crx_cache'), dest: path.join(destDir, 'extensions_crx_cache') },
        { src: path.join(srcDefaultDir, 'Extensions'), dest: path.join(destDefaultDir, 'Extensions') },
        { src: path.join(srcDefaultDir, 'Local Extension Settings'), dest: path.join(destDefaultDir, 'Local Extension Settings') },
        { src: path.join(srcDefaultDir, 'Sync Extension Settings'), dest: path.join(destDefaultDir, 'Sync Extension Settings') },
        { src: path.join(srcDefaultDir, 'Extension Rules'), dest: path.join(destDefaultDir, 'Extension Rules') },
        { src: path.join(srcDefaultDir, 'Extension Scripts'), dest: path.join(destDefaultDir, 'Extension Scripts') },
        { src: path.join(srcDefaultDir, 'Extension State'), dest: path.join(destDefaultDir, 'Extension State') },
        { src: path.join(srcDefaultDir, 'DNR Extension Rules'), dest: path.join(destDefaultDir, 'DNR Extension Rules') },
      ];

      for (const item of foldersToClone) {
        if (fs.existsSync(item.src)) {
          try {
            if (!fs.existsSync(item.dest)) fs.mkdirSync(item.dest, { recursive: true });
            fs.cpSync(item.src, item.dest, { recursive: true, force: true });
          } catch (e) {}
        }
      }

      // Copy IndexedDB chrome-extension_* nếu có
      const srcIndexedDB = path.join(srcDefaultDir, 'IndexedDB');
      if (fs.existsSync(srcIndexedDB)) {
        try {
          const destIndexedDB = path.join(destDefaultDir, 'IndexedDB');
          const entries = fs.readdirSync(srcIndexedDB);
          for (const entry of entries) {
            if (entry.includes('chrome-extension')) {
              const sEntry = path.join(srcIndexedDB, entry);
              const dEntry = path.join(destIndexedDB, entry);
              if (!fs.existsSync(destIndexedDB)) fs.mkdirSync(destIndexedDB, { recursive: true });
              fs.cpSync(sEntry, dEntry, { recursive: true, force: true });
            }
          }
        } catch (e) {}
      }

      // 2. Copy cấu hình Preferences, Secure Preferences, Local State
      const filesToClone = [
        { src: path.join(srcDir, 'Local State'), dest: path.join(destDir, 'Local State') },
        { src: path.join(srcDefaultDir, 'Preferences'), dest: path.join(destDefaultDir, 'Preferences') },
        { src: path.join(srcDefaultDir, 'Secure Preferences'), dest: path.join(destDefaultDir, 'Secure Preferences') },
        { src: path.join(srcDefaultDir, 'Extension Cookies'), dest: path.join(destDefaultDir, 'Extension Cookies') },
      ];

      for (const item of filesToClone) {
        if (fs.existsSync(item.src)) {
          try {
            fs.copyFileSync(item.src, item.dest);
          } catch (e) {}
        }
      }

      // 3. Đảm bảo toàn bộ extensions có cờ incognito: true (Allow in Incognito) & developer_mode: true
      const updatePrefsIncognito = (filePath: string) => {
        if (!fs.existsSync(filePath)) return;
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const json = JSON.parse(content);
          let changed = false;

          if (!json.extensions) json.extensions = {};
          if (!json.extensions.ui) json.extensions.ui = {};
          if (json.extensions.ui.developer_mode !== true) {
            json.extensions.ui.developer_mode = true;
            changed = true;
          }

          if (json.extensions && json.extensions.settings && typeof json.extensions.settings === 'object') {
            for (const extId of Object.keys(json.extensions.settings)) {
              const setting = json.extensions.settings[extId];
              if (setting && typeof setting === 'object') {
                if (allowInIncognito) {
                  setting.incognito = true;
                  setting.newAllowFileAccess = true;
                  changed = true;
                }
              }
            }
          }

          if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
          }
        } catch (e) {}
      };

      updatePrefsIncognito(path.join(destDefaultDir, 'Secure Preferences'));
      updatePrefsIncognito(path.join(destDefaultDir, 'Preferences'));

      return { success: true };
    }
    if (action === 'folderGetFileList') {
      if (!fs.existsSync(payload.path)) {
        return { success: false, error: 'Folder does not exist' };
      }
      const getFilesRecursively = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of list) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
          } else {
            results.push(fullPath);
          }
        }
        return results;
      };
      const files = getFilesRecursively(payload.path);
      return { success: true, files };
    }
    if (action === 'getClipboard') {
      const text = await clipboard.readText();
      return { success: true, text: typeof text === 'string' ? text : String(text ?? '') };
    }
    if (action === 'setClipboard') {
      await clipboard.writeText(payload.text ?? '');
      return { success: true };
    }
    if (action === 'httpRequest') {
      const { url, method, headers, data, timeout } = payload;
      if (!url) return { success: false, error: 'URL is required' };

      // Tự động encode URI nếu URL chứa khoảng trắng (như tên profile $profileName trong query string)
      let cleanUrl = String(url).trim();
      try {
        cleanUrl = encodeURI(cleanUrl);
      } catch {}

      const headerObj: Record<string, string> = {};
      if (headers && typeof headers === 'string') {
        const lines = headers.split(/\r?\n/);
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const k = line.substring(0, colonIdx).trim();
            const v = line.substring(colonIdx + 1).trim();
            if (k) headerObj[k] = v;
          }
        }
      }

      const controller = new AbortController();
      const timeoutSec = parseFloat(timeout) || 60;
      const timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);

      try {
        const reqInit: any = {
          method: (method || 'GET').toUpperCase(),
          headers: headerObj,
          signal: controller.signal,
        };
        if (data && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(reqInit.method)) {
          reqInit.body = data;
        }

        // Bỏ qua hoàn toàn proxy của profile và proxy môi trường - luôn kết nối mạng trực tiếp (Direct IP)
        // để tránh IP proxy bị chậm, yếu hoặc bị chặn khi gọi các API (GET, POST, PUT, DELETE)
        const resp = await fetch(cleanUrl, reqInit);
        clearTimeout(timeoutId);
        const text = await resp.text();
        return { success: true, status: resp.status, statusText: resp.statusText, data: text };
      } catch (err: any) {
        clearTimeout(timeoutId);
        return { success: false, error: err.message || String(err) };
      }
    }
    if (action === 'httpDownload') {
      const { url, savePath, headers } = payload;
      if (!url) return { success: false, error: 'URL is required' };
      if (!savePath) return { success: false, error: 'Save Path is required' };

      let cleanUrl = String(url).trim();
      try {
        cleanUrl = encodeURI(cleanUrl);
      } catch {}

      const headerObj: Record<string, string> = {};
      if (headers && typeof headers === 'string') {
        const lines = headers.split(/\r?\n/);
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const k = line.substring(0, colonIdx).trim();
            const v = line.substring(colonIdx + 1).trim();
            if (k) headerObj[k] = v;
          }
        }
      }

      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Luôn kết nối trực tiếp không qua proxy của profile
      const resp = await fetch(cleanUrl, { method: 'GET', headers: headerObj });
      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status} ${resp.statusText}` };
      }
      const arrayBuffer = await resp.arrayBuffer();
      fs.writeFileSync(savePath, Buffer.from(arrayBuffer));
      return { success: true, status: resp.status };
    }
    if (action === 'imageToBase64') {
      const { path: imgPath } = payload;
      if (!imgPath || !fs.existsSync(imgPath)) {
        return { success: false, error: 'Image file does not exist' };
      }
      const ext = path.extname(imgPath).toLowerCase().replace('.', '');
      let mime = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'gif') mime = 'image/gif';
      else if (ext === 'bmp') mime = 'image/bmp';
      else if (ext === 'svg') mime = 'image/svg+xml';

      const fileBuf = fs.readFileSync(imgPath);
      const b64 = `data:${mime};base64,${fileBuf.toString('base64')}`;
      return { success: true, base64: b64 };
    }
    if (action === 'findImage') {
      const templatePath = payload?.templatePath || payload?.path || '';
      const threshold = parseFloat(payload?.threshold) || 0.7;
      const trueColor = payload?.trueColor === 'Yes' || payload?.trueColor === true || payload?.trueColor === 'yes';
      const port = payload?.port;

      if (!templatePath || !fs.existsSync(templatePath)) {
        return { success: false, error: `Template image not found: ${templatePath}` };
      }

      // 1. Capture primary display screen
      let screenshotBuf: Buffer | null = null;
      try {
        const primary = screen.getPrimaryDisplay();
        const scale = primary.scaleFactor || 1;
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: {
            width: Math.round(primary.bounds.width * scale),
            height: Math.round(primary.bounds.height * scale),
          },
        });
        if (sources.length > 0 && sources[0].thumbnail) {
          screenshotBuf = sources[0].thumbnail.toPNG();
        }
      } catch (errScreen) {}

      // Fallback: If desktopCapturer empty and port is provided, capture CDP Page screenshot
      if ((!screenshotBuf || screenshotBuf.length === 0) && port) {
        try {
          const list = await httpGet(`http://127.0.0.1:${port}/json/list`);
          if (Array.isArray(list)) {
            const page = list.find((t: any) => t.type === 'page');
            if (page?.webSocketDebuggerUrl) {
              const snap = await sendWs(page.webSocketDebuggerUrl, 'Page.captureScreenshot', { format: 'png' });
              if (snap?.result?.data) {
                screenshotBuf = Buffer.from(snap.result.data, 'base64');
              }
            }
          }
        } catch (e) {}
      }

      // Spawn python scripts/find_image.py
      const scriptPath = path.join(app.getAppPath(), 'scripts', 'find_image.py');
      return new Promise((resolve) => {
        try {
          const pyArgs = [scriptPath, templatePath, String(threshold), trueColor ? 'Yes' : 'No'];
          if (screenshotBuf && screenshotBuf.length > 0) {
            pyArgs.push('--stdin');
          }
          const py = spawn('python', pyArgs);
          let stdoutData = '';
          let stderrData = '';

          py.stdout.on('data', (d) => { stdoutData += d.toString(); });
          py.stderr.on('data', (d) => { stderrData += d.toString(); });

          py.on('close', (code) => {
            if (stdoutData.trim()) {
              try {
                const parsed = JSON.parse(stdoutData.trim());
                resolve(parsed);
                return;
              } catch (e) {}
            }
            resolve({ success: false, error: stderrData || `Image search failed with exit code ${code}` });
          });

          py.on('error', (err) => {
            resolve({ success: false, error: `Python spawn error: ${err.message}` });
          });

          if (screenshotBuf && screenshotBuf.length > 0) {
            py.stdin.write(screenshotBuf);
            py.stdin.end();
          }
        } catch (err: any) {
          resolve({ success: false, error: err.message });
        }
      });
    }
    if (action === 'osClick') {
      const x = Math.round(Number(payload?.x) || 0);
      const y = Math.round(Number(payload?.y) || 0);
      const button = payload?.button || 'left';
      const clicks = Math.max(1, Number(payload?.clicks) || 1);

      const psClick = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32OsClick {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);
}
"@
[Win32OsClick]::SetProcessDPIAware() | Out-Null
[Win32OsClick]::SetCursorPos(${x}, ${y}) | Out-Null
Start-Sleep -Milliseconds 40
$down = ${button === 'right' ? '0x0008' : button === 'middle' ? '0x0020' : '0x0002'}
$up = ${button === 'right' ? '0x0010' : button === 'middle' ? '0x0040' : '0x0004'}
for ($i = 0; $i -lt ${clicks}; $i++) {
    [Win32OsClick]::mouse_event($down, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 35
    [Win32OsClick]::mouse_event($up, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 35
}
Write-Output '{"success":true}'
`;
      const encodedPs = Buffer.from(psClick, 'utf16le').toString('base64');
      return new Promise((resolve) => {
        try {
          const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedPs], {
            windowsHide: true,
          });
          let stdoutData = '';
          ps.stdout.on('data', (d) => { stdoutData += d.toString(); });
          ps.on('close', (code) => {
            resolve({ success: code === 0, output: stdoutData.trim() });
          });
          ps.on('error', (err) => {
            resolve({ success: false, error: err.message });
          });
        } catch (err: any) {
          resolve({ success: false, error: err.message });
        }
      });
    }
    return { success: false, error: `Unknown fs action: ${action}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Helper to find Chrome executable across standard installation locations
const findChromePath = (): string | null => {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidatePaths = [
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const getAutomationProfileDir = () => {
  const dir = path.join(app.getPath('userData'), 'ChromeAutomationProfile');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return dir;
};

const launchChrome = (
  port: string | number = 43076,
  targetUrl: string = 'about:blank',
  profileName: string = 'ChromeAutomationProfile',
  windowSize?: { width: number; height: number },
  scale?: number,
  proxy?: string,
  windowPosition?: { x: number; y: number }
) => {
  const chromePath = findChromePath();
  if (!chromePath) {
    throw new Error('Google Chrome installation not found. Please install Google Chrome.');
  }

  const profileDir = path.join(app.getPath('userData'), profileName);
  if (!fs.existsSync(profileDir)) {
    try { fs.mkdirSync(profileDir, { recursive: true }); } catch (e) {}
  }

  const args = [
    targetUrl,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
  ];

  if (proxy && proxy.trim()) {
    const cleanProxy = proxy.trim().replace(/^[a-z]+:\/\//i, '');
    const parts = cleanProxy.split(':');
    if (parts[0] && parts[1]) {
      args.push(`--proxy-server=http://${parts[0]}:${parts[1]}`);
    }
  }

  if (windowPosition && windowPosition.x !== undefined && windowPosition.y !== undefined) {
    args.push(`--window-position=${Math.round(windowPosition.x)},${Math.round(windowPosition.y)}`);
  }

  if (windowSize && windowSize.width && windowSize.height) {
    args.push(`--window-size=${Math.round(windowSize.width)},${Math.round(windowSize.height)}`);
  } else {
    args.push('--start-maximized');
  }

  if (scale && scale !== 100) {
    args.push(`--force-device-scale-factor=${scale / 100}`);
  }

  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { success: true, message: `Chrome started on port ${port}: ${targetUrl}` };
};

// Check IP / Proxy before opening profile
ipcMain.handle('automation:checkIp', async (_, options?: { proxy?: string; timeoutMs?: number }) => {
  const timeoutMs = options?.timeoutMs || 5000;
  const proxy = options?.proxy?.trim();

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: any) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const timer = setTimeout(() => {
      finish({ success: false, error: 'Connection timed out (Proxy/Network unreachable)' });
    }, timeoutMs);

    if (proxy) {
      try {
        let proxyHost = '';
        let proxyPort = 8080;
        let proxyUser = '';
        let proxyPass = '';

        if (proxy.includes('@')) {
          const withoutProto = proxy.replace(/^[a-z]+:\/\//i, '');
          const [authPart, hostPart] = withoutProto.split('@');
          const [u, p] = authPart.split(':');
          const [h, port] = (hostPart || '').split(':');
          proxyUser = u || '';
          proxyPass = p || '';
          proxyHost = h || '';
          proxyPort = parseInt(port, 10) || 8080;
        } else {
          const withoutProto = proxy.replace(/^[a-z]+:\/\//i, '');
          const parts = withoutProto.split(':');
          proxyHost = parts[0];
          proxyPort = parseInt(parts[1], 10) || 8080;
          proxyUser = parts[2] || '';
          proxyPass = parts[3] || '';
        }

        const headers: Record<string, string> = {
          'Host': 'ip-api.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        };
        if (proxyUser && proxyPass) {
          headers['Proxy-Authorization'] = `Basic ${Buffer.from(`${proxyUser}:${proxyPass}`).toString('base64')}`;
        }

        const req = http.request({
          host: proxyHost,
          port: proxyPort,
          path: 'http://ip-api.com/json',
          method: 'GET',
          headers,
          timeout: timeoutMs,
        }, (res) => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            clearTimeout(timer);
            try {
              const json = JSON.parse(data);
              if (json.status === 'success' || json.query) {
                finish({
                  success: true,
                  ip: json.query || json.ip,
                  country: json.country || json.countryCode || '',
                  city: json.city || '',
                  isp: json.isp || '',
                });
              } else {
                finish({ success: false, error: json.message || 'Proxy returned invalid status' });
              }
            } catch {
              finish({ success: false, error: 'Invalid response through proxy' });
            }
          });
        });

        req.on('error', (err) => {
          clearTimeout(timer);
          finish({ success: false, error: `Proxy connection error: ${err.message}` });
        });
        req.end();
      } catch (err: any) {
        clearTimeout(timer);
        finish({ success: false, error: `Invalid proxy format: ${err.message}` });
      }
    } else {
      const req = http.get('http://ip-api.com/json', { timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          clearTimeout(timer);
          try {
            const json = JSON.parse(data);
            if (json.status === 'success' || json.query) {
              finish({
                success: true,
                ip: json.query || json.ip,
                country: json.country || json.countryCode || '',
                city: json.city || '',
                isp: json.isp || '',
              });
            } else {
              finish({ success: false, error: json.message || 'Failed to retrieve IP' });
            }
          } catch {
            finish({ success: false, error: 'Failed to parse IP response' });
          }
        });
      });

      req.on('error', (err) => {
        clearTimeout(timer);
        finish({ success: false, error: `Network error: ${err.message}` });
      });
    }
  });
});

// Launch Chrome directly with remote debugging port
ipcMain.handle('automation:launchBrowser', async (_, options?: {
  port?: string | number;
  url?: string;
  profileName?: string;
  windowSize?: { width: number; height: number };
  windowPosition?: { x: number; y: number };
  scale?: number;
  proxy?: string;
}) => {
  try {
    const port = options?.port || 43076;
    const url = options?.url || 'about:blank';
    const profile = options?.profileName || `ChromeProfile_${port}`;
    return launchChrome(port, url, profile, options?.windowSize, options?.scale, options?.proxy, options?.windowPosition);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Launch multiple Chrome instances for multi-threading
ipcMain.handle('automation:launchMultiThreads', async (_, req: {
  threads: Array<{ id: number; port: number; name: string; url?: string; proxy?: string; windowPosition?: { x: number; y: number } }>;
  windowSize?: { width: number; height: number };
  scale?: number;
}) => {
  try {
    const results = [];
    for (const t of req.threads) {
      const res = launchChrome(
        t.port,
        t.url || 'https://google.com',
        `ChromeProfile_Thread_${t.id}_${t.port}`,
        req.windowSize,
        req.scale,
        t.proxy,
        t.windowPosition
      );
      results.push({ ...t, success: res.success });
      await new Promise(r => setTimeout(r, 450));
    }
    return { success: true, threads: results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Get all connected displays & resolutions for window arrangement
ipcMain.handle('system:getDisplays', async () => {
  try {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    return displays.map((d, idx) => ({
      id: d.id,
      index: idx,
      isPrimary: d.id === primary.id,
      label: `Screen ${idx + 1} • ${d.bounds.width}x${d.bounds.height}${d.id === primary.id ? ' (primary)' : ''}`,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
    }));
  } catch (err: any) {
    return [];
  }
});

// Automation Runner: Launch Chrome with automation flags and remote debugging port
ipcMain.handle('automation:run', async (_, projectData: any) => {
  try {
    let targetUrl = 'https://google.com';
    const script = projectData?.script;

    if (script) {
      const scanForUrl = (nodes: any[]) => {
        for (const n of nodes) {
          if (n.type === 39 && n.raw_input) {
            try {
              const parsed = typeof n.raw_input === 'string' ? JSON.parse(n.raw_input) : n.raw_input;
              const urlItem = parsed.find((p: any) => p.Key === 'URL');
              if (urlItem && urlItem.Value && urlItem.Value.startsWith('http')) {
                targetUrl = urlItem.Value;
                return;
              }
            } catch (e) {}
          }
          if (n.nodes && Array.isArray(n.nodes)) {
            scanForUrl(n.nodes);
          }
        }
      };

      scanForUrl(script.before_init?.nodes || []);
      scanForUrl(script.main_logic?.nodes || []);
      scanForUrl(script.after_quit?.nodes || []);
    }

    return launchChrome(43076, targetUrl);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Test Chrome Debugging Port
ipcMain.handle('automation:testPort', async (_, port: string | number) => {
  try {
    const http = await import('http');
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 2500 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              success: true,
              data: parsed,
              webSocketUrl: parsed.webSocketDebuggerUrl,
            });
          } catch (e: any) {
            resolve({
              success: false,
              error: `Invalid response from http://127.0.0.1:${port}`,
            });
          }
        });
      });
      req.on('error', () => {
        resolve({
          success: false,
          error: `Failed to fetch browser webSocket url from http://127.0.0.1:${port}.`,
        });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: `Failed to fetch browser webSocket url from http://127.0.0.1:${port}.`,
        });
      });
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// CDP Browser Controller via Remote Debugging Port (Node.js level, no CORS restrictions)
ipcMain.handle('automation:cdpAction', async (_, req: { port: string | number; action: string; payload?: any }) => {
  const { port, action, payload } = req;

  const getPageTarget = async () => {
    const list = await httpGet(`http://127.0.0.1:${port}/json/list`).catch(() => null);
    if (Array.isArray(list)) {
      if (payload?.targetId) {
        const found = list.find((t: any) => t.id === payload.targetId);
        if (found) return found;
      }
      const pages = list.filter((t: any) => t.type === 'page');
      if (pages.length === 1) return pages[0];

      // If multiple tabs exist, detect the one that is currently active/visible to the user
      if (pages.length > 1) {
        for (let i = pages.length - 1; i >= 0; i--) {
          const p = pages[i];
          if (p.webSocketDebuggerUrl) {
            try {
              const visRes = await sendWs(p.webSocketDebuggerUrl, 'Runtime.evaluate', {
                expression: 'document.visibilityState',
                returnByValue: true,
              }, 300).catch(() => null);
              if (visRes?.result?.result?.value === 'visible') {
                return p;
              }
            } catch (e) {}
          }
        }
      }

      // If visibility couldn't be determined, fallback to the latest opened tab
      return pages[pages.length - 1] || pages[0] || list[0];
    }
    return null;
  };

  try {
    if (action === 'listTargets') {
      const list = await httpGet(`http://127.0.0.1:${port}/json/list`);
      if (Array.isArray(list)) {
        // Return all targets (page, iframe, other) except service_worker so no OOPIF frame is missed
        const valid = list.filter((t: any) => t.type !== 'service_worker');
        return { success: true, targets: valid };
      }
      return { success: false, error: 'Failed to list targets' };
    }

    if (action === 'activateTarget') {
      const targetId = payload?.targetId || payload?.id;
      if (targetId) {
        await httpGet(`http://127.0.0.1:${port}/json/activate/${targetId}`);
        return { success: true };
      }
      return { success: false, error: 'No targetId provided' };
    }

    if (action === 'getFrameTree') {
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      const wsRes = await sendWs(page.webSocketDebuggerUrl, 'Page.getFrameTree', {});
      return wsRes;
    }

    if (action === 'createIsolatedWorld') {
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      const frameId = payload?.frameId;
      const worldName = payload?.worldName || 'gpmWorld';
      const wsRes = await sendWs(page.webSocketDebuggerUrl, 'Page.createIsolatedWorld', {
        frameId,
        worldName,
        grantUniversalAccess: true,
      });
      return wsRes;
    }

    if (action === 'initVirtualMouse') {
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      const script = payload?.script || '';
      if (script) {
        await sendWs(page.webSocketDebuggerUrl, 'Page.addScriptToEvaluateOnNewDocument', {
          source: script,
        }).catch(() => {});
        await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
          expression: `(() => { try { ${script}; if (window.__gpmVirtualMouse) { window.__gpmVirtualMouse.init(); } return true; } catch(e){ return false; } })()`,
          returnByValue: true,
        }).catch(() => {});
      }
      return { success: true };
    }

    if (action === 'setWindowBounds') {
      const { x, y, width, height } = payload || {};
      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        // 1. Try Browser.setWindowBounds via CDP Browser target
        try {
          const versionInfo = await httpGet(`http://127.0.0.1:${port}/json/version`);
          const browserWs = versionInfo?.webSocketDebuggerUrl;
          if (browserWs) {
            const winRes = await sendWs(browserWs, 'Browser.getWindowForTarget', { targetId: page.id }).catch(() => null);
            const windowId = winRes?.result?.windowId;
            if (windowId) {
              await sendWs(browserWs, 'Browser.setWindowBounds', {
                windowId,
                bounds: {
                  left: Math.round(x),
                  top: Math.round(y),
                  width: Math.round(width),
                  height: Math.round(height),
                  windowState: 'normal',
                },
              }).catch(() => {});
            }
          }
        } catch (e) {}

        // 2. Also execute JS window.moveTo and window.resizeTo
        if (width && height) {
          await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
            expression: `try { window.moveTo(${Math.round(x)}, ${Math.round(y)}); window.resizeTo(${Math.round(width)}, ${Math.round(height)}); } catch(e){}`,
          }).catch(() => {});
        }
        return { success: true };
      }
      return { success: false, error: 'No active Chrome page' };
    }

    if (action === 'evaluate') {
      const expression = payload?.expression || '';
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      const evalParams: any = {
        expression,
        returnByValue: true,
        awaitPromise: true,
      };
      if (payload?.contextId !== undefined && payload?.contextId !== null) {
        evalParams.contextId = Number(payload.contextId);
      }
      const evalTimeout = Number(payload?.timeoutMs) || 300000;
      const wsRes = await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', evalParams, evalTimeout);
      if (!wsRes.success) {
        return { success: false, error: wsRes.error || 'Evaluation failed' };
      }
      const cdpRes = wsRes.result;
      if (cdpRes?.exceptionDetails) {
        const desc = cdpRes.exceptionDetails.exception?.description || cdpRes.exceptionDetails.text || 'JavaScript Exception';
        return { success: false, error: desc };
      }
      return { success: true, value: cdpRes?.result?.value };
    }

    if (action === 'insertText') {
      const { text } = payload || {};
      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        await sendWs(page.webSocketDebuggerUrl, 'Input.insertText', { text: String(text || '') }).catch(() => {});
        return { success: true };
      }
      return { success: false, error: 'No active Chrome page found.' };
    }

    if (action === 'typeText') {
      const { text, delay, delayMs } = payload || {};
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      const str = String(text || '');
      const wsUrl = page.webSocketDebuggerUrl;
      const rawDelay = String(delay ?? delayMs ?? '').trim();

      // If rawDelay is -1: instant paste
      if (rawDelay === '-1') {
        await sendWs(wsUrl, 'Input.insertText', { text: str }).catch(() => {});
        return { success: true };
      }

      let getDelay = () => Math.floor(Math.random() * 41) + 35;
      if (rawDelay === '0' || rawDelay === '0,0') {
        getDelay = () => 0;
      } else if (rawDelay.includes(',') || rawDelay.includes('-')) {
        const parts = rawDelay.includes(',') ? rawDelay.split(',') : rawDelay.split('-');
        const minD = Math.max(0, parseInt(parts[0], 10) || 0);
        const maxD = Math.max(minD, parseInt(parts[1], 10) || minD);
        getDelay = () => Math.floor(Math.random() * (maxD - minD + 1)) + minD;
      } else if (rawDelay) {
        const base = parseInt(rawDelay, 10);
        if (!isNaN(base) && base > 0) {
          const minD = Math.max(10, Math.round(base * 0.7));
          const maxD = Math.round(base * 1.3);
          getDelay = () => Math.floor(Math.random() * (maxD - minD + 1)) + minD;
        } else if (base === 0) {
          getDelay = () => 0;
        }
      }

      const normalizedWsUrl = wsUrl.replace('//localhost:', '//127.0.0.1:');
      return new Promise((resolve) => {
        try {
          const ws = new WebSocket(normalizedWsUrl);
          const cleanup = () => {
            try { ws.close(); } catch (e) {}
          };
          const timer = setTimeout(() => {
            cleanup();
            resolve({ success: false, error: 'typeText timeout' });
          }, Math.max(15000, str.length * 500 + 10000));

          ws.onerror = (err) => {
            clearTimeout(timer);
            cleanup();
            resolve({ success: false, error: String(err) });
          };

          ws.onopen = async () => {
            try {
              for (let i = 0; i < str.length; i++) {
                const char = str[i];
                const reqId = ++nextWsId;
                ws.send(JSON.stringify({ id: reqId, method: 'Input.insertText', params: { text: char } }));
                const wait = getDelay();
                if (wait > 0) {
                  await new Promise((r) => setTimeout(r, wait));
                }
              }
              clearTimeout(timer);
              cleanup();
              resolve({ success: true });
            } catch (err: any) {
              clearTimeout(timer);
              cleanup();
              resolve({ success: false, error: err.message });
            }
          };
        } catch (e: any) {
          resolve({ success: false, error: e.message });
        }
      });
    }

    if (action === 'dispatchKeyEvent') {
      const { type, key, code, windowsVirtualKeyCode, modifiers, text } = payload || {};
      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        await sendWs(page.webSocketDebuggerUrl, 'Input.dispatchKeyEvent', {
          type: type || 'rawKeyDown',
          key,
          code,
          windowsVirtualKeyCode,
          modifiers: modifiers || 0,
          text,
        }).catch(() => {});
        return { success: true };
      }
      return { success: false, error: 'No active Chrome page found.' };
    }

    if (action === 'mouseMove' || action === 'moveCoordinates') {
      const { x, y } = payload || {};
      const posX = parseFloat(x) || 0;
      const posY = parseFloat(y) || 0;

      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        try {
          await sendWs(page.webSocketDebuggerUrl, 'Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: posX,
            y: posY,
          });
        } catch (e) {}
      }

      return { success: true, x: posX, y: posY };
    }

    if (action === 'mouseWheel') {
      const { x, y, deltaX, deltaY } = payload || {};
      const posX = Math.round(parseFloat(x) || 500);
      const posY = Math.round(parseFloat(y) || 400);
      const dX = Math.round(parseFloat(deltaX) || 0);
      const dY = Math.round(parseFloat(deltaY) || 0);

      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        try {
          await sendWs(page.webSocketDebuggerUrl, 'Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            x: posX,
            y: posY,
            deltaX: dX,
            deltaY: dY,
          });
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }
      return { success: false, error: 'No active Chrome page found.' };
    }

    if (action === 'clickCoordinates') {
      const { x, y } = payload || {};
      const posX = parseFloat(x) || 0;
      const posY = parseFloat(y) || 0;

      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        try {
          await sendWs(page.webSocketDebuggerUrl, 'Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: posX,
            y: posY,
          });
          await sendWs(page.webSocketDebuggerUrl, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: posX,
            y: posY,
            button: 'left',
            clickCount: 1,
          });
          await sendWs(page.webSocketDebuggerUrl, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: posX,
            y: posY,
            button: 'left',
            clickCount: 1,
          });
        } catch (e) {}
      }

      return { success: true, x: posX, y: posY };
    }

    if (action === 'newTab') {
      const url = payload?.url ? `?${encodeURIComponent(payload.url)}` : '';
      const tab = await httpPut(`http://127.0.0.1:${port}/json/new${url}`);
      if (tab && tab.id) {
        await httpGet(`http://127.0.0.1:${port}/json/activate/${tab.id}`).catch(() => null);
        if (tab.webSocketDebuggerUrl) {
          await sendWs(tab.webSocketDebuggerUrl, 'Page.bringToFront', {}, 1000).catch(() => null);
        }
        return { success: true, tab, targetId: tab.id };
      }
      return { success: true, tab };
    }

    if (action === 'closeTab') {
      const page = await getPageTarget();
      if (page && page.id) {
        await httpGet(`http://127.0.0.1:${port}/json/close/${page.id}`).catch(() => null);
        return { success: true };
      }
      return { success: false, error: 'No active tab found to close' };
    }

    if (action === 'closeAllTab') {
      const list = await httpGet(`http://127.0.0.1:${port}/json/list`);
      if (Array.isArray(list)) {
        const pages = list.filter((t: any) => t.type === 'page');
        if (pages.length > 1) {
          for (let i = 1; i < pages.length; i++) {
            try {
              await httpGet(`http://127.0.0.1:${port}/json/close/${pages[i].id}`).catch(() => null);
            } catch (e) {}
          }
        }
        if (pages[0]?.id) {
          await httpGet(`http://127.0.0.1:${port}/json/activate/${pages[0].id}`).catch(() => null);
        }
      }
      return { success: true };
    }

    if (action === 'activeTab') {
      const { mode, target } = payload || {};
      const list = await httpGet(`http://127.0.0.1:${port}/json/list`);
      if (Array.isArray(list)) {
        const pages = list.filter((t: any) => t.type === 'page');
        let targetTab = null;
        if (mode?.toLowerCase().includes('prefix')) {
          targetTab = pages.find((t: any) => t.url && t.url.startsWith(target));
        } else {
          const idx = parseInt(target, 10) || 0;
          targetTab = pages[idx] || pages[0];
        }
        if (targetTab && targetTab.id) {
          await httpGet(`http://127.0.0.1:${port}/json/activate/${targetTab.id}`).catch(() => null);
          if (targetTab.webSocketDebuggerUrl) {
            await sendWs(targetTab.webSocketDebuggerUrl, 'Page.bringToFront', {}, 1000).catch(() => null);
          }
          return { success: true, tab: targetTab, targetId: targetTab.id };
        }
      }
      return { success: false, error: 'Target tab not found' };
    }

    if (action === 'goToUrl') {
      let url = (payload?.url || '').trim();
      if (!url || url === 'https://') {
        url = 'https://google.com';
      } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:') && !url.startsWith('chrome://')) {
        url = `https://${url}`;
      }

      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        // 1. Activate tab and bring page to front so it is the active visible tab on screen
        await httpGet(`http://127.0.0.1:${port}/json/activate/${page.id}`).catch(() => null);
        await sendWs(page.webSocketDebuggerUrl, 'Page.bringToFront', {}, 1500).catch(() => null);
        // 2. Ensure Page domain is enabled in CDP
        await sendWs(page.webSocketDebuggerUrl, 'Page.enable', {}, 2000).catch(() => null);

        // 3. Send Page.navigate to instruct browser engine to load URL
        const navRes = await sendWs(page.webSocketDebuggerUrl, 'Page.navigate', { url }, 5000).catch(() => null);

        // 4. Fallback ONLY if Page.navigate returned error or failed
        if (!navRes || navRes.error || navRes?.result?.errorText) {
          await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
            expression: `window.location.href = ${JSON.stringify(url)};`,
          }, 2000).catch(() => null);
        }

        return { success: true, targetId: page.id };
      }

      // ONLY if there are NO tabs at all in Chrome (empty browser), open the initial tab
      await httpPut(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`).catch(() => {});
      return { success: true };
    }

    if (action === 'reload') {
      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        await sendWs(page.webSocketDebuggerUrl, 'Page.reload');
        return { success: true };
      }
      return { success: false, error: 'No active Chrome page found to reload' };
    }

    if (action === 'backUrl') {
      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', { expression: 'window.history.back()' });
        return { success: true };
      }
      return { success: false, error: 'No active Chrome page found for back URL' };
    }

    if (action === 'setCookies') {
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      await sendWs(page.webSocketDebuggerUrl, 'Network.enable', {}).catch(() => {});

      let rawData = payload?.cookies;
      // If someone passed a file path, auto-read file content
      if (typeof rawData === 'string') {
        const trimmed = rawData.trim().replace(/^["']|["']$/g, '');
        if ((trimmed.endsWith('.json') || trimmed.endsWith('.txt') || trimmed.includes('\\') || trimmed.includes('/')) && fs.existsSync(trimmed)) {
          try {
            rawData = fs.readFileSync(trimmed, 'utf-8');
          } catch (e) {}
        }
      }

      let cookieList: any[] = [];
      if (typeof rawData === 'string') {
        let str = rawData;
        if (str.charCodeAt(0) === 0xFEFF) {
          str = str.slice(1);
        }
        const trimmed = str.trim();

        // 1. JSON format (array, or object with cookies/data, or key-value object)
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              cookieList = parsed;
            } else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.cookies)) {
                cookieList = parsed.cookies;
              } else if (Array.isArray(parsed.data)) {
                cookieList = parsed.data;
              } else {
                cookieList = Object.entries(parsed).map(([k, v]) => ({ name: k, value: String(v) }));
              }
            }
          } catch (e) {}
        }

        // 2. Netscape tab-separated format
        if (cookieList.length === 0 && trimmed.includes('\t')) {
          const lines = trimmed.split(/\r?\n/);
          for (const line of lines) {
            const l = line.trim();
            if (!l || l.startsWith('#')) continue;
            const parts = line.split('\t');
            if (parts.length >= 7) {
              cookieList.push({
                domain: parts[0].trim(),
                path: parts[2].trim(),
                secure: parts[3].trim().toUpperCase() === 'TRUE',
                expires: parseInt(parts[4].trim(), 10) || 0,
                name: parts[5].trim(),
                value: parts[6].trim(),
              });
            }
          }
        }

        // 3. Semicolon-separated format (name1=val1; name2=val2)
        if (cookieList.length === 0 && trimmed.length > 0) {
          cookieList = trimmed.split(';').map((pair: string) => {
            const idx = pair.indexOf('=');
            if (idx === -1) return null;
            return {
              name: pair.substring(0, idx).trim(),
              value: pair.substring(idx + 1).trim(),
            };
          }).filter(Boolean) as any[];
        }
      } else if (Array.isArray(rawData)) {
        cookieList = rawData;
      }

      if (!Array.isArray(cookieList) || cookieList.length === 0) {
        return { success: false, error: 'Không tìm thấy cookie nào hợp lệ (cần danh sách JSON hoặc chuỗi cookie)' };
      }

      const fallbackUrl = (page.url && page.url.startsWith('http')) ? page.url : undefined;

      const formattedCookies = cookieList.map((c: any) => {
        if (!c) return null;
        const name = c.name || c.Name || c.key || c.Key;
        if (!name) return null;
        const value = c.value !== undefined ? c.value : (c.Value !== undefined ? c.Value : '');
        const cookie: any = {
          name: String(name),
          value: String(value),
        };

        const domain = c.domain || c.Domain;
        if (domain) {
          cookie.domain = String(domain);
        }

        const path = c.path || c.Path || '/';
        cookie.path = String(path);

        const secure = c.secure ?? c.Secure;
        if (typeof secure === 'boolean') cookie.secure = secure;

        // Auto-enforce secure for __Secure- and __Host- cookies as required by Chrome CDP RFC 6265
        if (cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-')) {
          cookie.secure = true;
        }

        // RFC 6265: __Host- cookies MUST NOT have a domain attribute, MUST be secure, MUST have path '/'
        if (cookie.name.startsWith('__Host-')) {
          delete cookie.domain;
          cookie.path = '/';
          cookie.secure = true;
          const host = (c.domain || c.Domain || '').replace(/^\./, '');
          if (host) {
            cookie.url = `https://${host}/`;
          } else if (fallbackUrl) {
            cookie.url = fallbackUrl;
          }
        } else {
          const url = c.url || c.Url;
          if (url) {
            cookie.url = String(url);
          } else if (!cookie.domain && fallbackUrl) {
            cookie.url = fallbackUrl;
          }
        }

        if (cookie.secure && cookie.url && cookie.url.startsWith('http://')) {
          cookie.url = cookie.url.replace(/^http:\/\//, 'https://');
        }

        const httpOnly = c.httpOnly ?? c.HttpOnly;
        if (typeof httpOnly === 'boolean') cookie.httpOnly = httpOnly;

        const expiresVal = c.expires ?? c.Expires ?? c.expirationDate ?? c.ExpirationDate;
        if (typeof expiresVal === 'number' && expiresVal > 0) {
          cookie.expires = Math.floor(expiresVal);
        }

        const rawSameSite = c.sameSite ?? c.SameSite;
        if (rawSameSite) {
          const ss = String(rawSameSite).toLowerCase();
          if (ss === 'strict') cookie.sameSite = 'Strict';
          else if (ss === 'lax') cookie.sameSite = 'Lax';
          else if (ss === 'none' || ss === 'no_restriction') {
            cookie.sameSite = 'None';
            cookie.secure = true;
          } else if (ss === 'unspecified') {
            if (cookie.secure) {
              cookie.sameSite = 'None';
            } else {
              cookie.sameSite = 'Lax';
            }
          }
        }

        return cookie;
      }).filter(Boolean);

      if (formattedCookies.length === 0) {
        return { success: false, error: 'Không có cookie nào có tên và giá trị hợp lệ' };
      }

      // Deduplicate formatted cookies so the most complete one is preserved
      const cookieMap = new Map<string, any>();
      for (const c of formattedCookies) {
        const key = `${c.name}|${c.domain || ''}|${c.path || '/'}`;
        cookieMap.set(key, c);
      }
      const uniqueCookies = Array.from(cookieMap.values());

      // If YouTube LOGIN_INFO is in the cookies, sync to sessionStorage and inject hook so YouTube doesn't wipe auth
      const ytLoginInfo = uniqueCookies.find((c: any) => c.name === 'LOGIN_INFO');
      if (ytLoginInfo && ytLoginInfo.value) {
        await sendWs(page.webSocketDebuggerUrl, 'Page.addScriptToEvaluateOnNewDocument', {
          source: `try { sessionStorage.setItem('session_logininfo', ${JSON.stringify(ytLoginInfo.value)}); } catch (e) {}`
        }).catch(() => {});
        await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
          expression: `try { sessionStorage.setItem('session_logininfo', ${JSON.stringify(ytLoginInfo.value)}); } catch (e) {}`
        }).catch(() => {});
      }

      // 1. Try batch Network.setCookies
      const res = await sendWs(page.webSocketDebuggerUrl, 'Network.setCookies', { cookies: uniqueCookies }).catch(() => null);
      if (res && res.success) {
        return { success: true, count: uniqueCookies.length };
      }

      // 2. Fallback: Set each cookie individually with Network.setCookie so valid cookies still import
      let successCount = 0;
      for (const c of uniqueCookies) {
        const singleRes = await sendWs(page.webSocketDebuggerUrl, 'Network.setCookie', c).catch(() => null);
        if (singleRes && singleRes.success && singleRes.result?.success !== false) {
          successCount++;
        }
      }

      if (successCount > 0) {
        return { success: true, count: successCount };
      }

      return { success: false, error: res?.error || 'Lỗi khi nạp cookies vào trình duyệt' };
    }

    if (action === 'getCookies') {
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      await sendWs(page.webSocketDebuggerUrl, 'Network.enable', {}).catch(() => {});

      let cookies: any[] = [];

      // 1. If active page is on a real website (starts with http) or url is passed, prioritize getting site-specific cookies
      const targetUrl = (payload?.url || (page.url && page.url.startsWith('http') ? page.url : ''));
      if (targetUrl) {
        const netRes = await sendWs(page.webSocketDebuggerUrl, 'Network.getCookies', { urls: [targetUrl] }).catch(() => null);
        if (netRes?.success && Array.isArray(netRes.result?.cookies) && netRes.result.cookies.length > 0) {
          cookies = netRes.result.cookies;
        }
      }

      // 2. Fallback to Storage.getCookies across all domains if Network.getCookies was empty or page is on about:blank
      if (cookies.length === 0) {
        const storageRes = await sendWs(page.webSocketDebuggerUrl, 'Storage.getCookies', {}).catch(() => null);
        if (storageRes?.success && Array.isArray(storageRes.result?.cookies) && storageRes.result.cookies.length > 0) {
          cookies = storageRes.result.cookies;
        }
      }

      // 3. Fallback Network.getCookies without parameters
      if (cookies.length === 0) {
        const netResAll = await sendWs(page.webSocketDebuggerUrl, 'Network.getCookies', {}).catch(() => null);
        if (netResAll?.success && Array.isArray(netResAll.result?.cookies)) {
          cookies = netResAll.result.cookies;
        }
      }

      // Format cookies to the EXACT standard format requested by user:
      // sameSite: "no_restriction" | "lax" | "strict" | null
      // storeId: null
      const formattedCookies = (cookies || []).map((c: any) => {
        if (!c || !c.name) return null;
        const domain = c.domain ? String(c.domain) : '';
        const rawSameSite = c.sameSite ? String(c.sameSite).toLowerCase() : '';

        // Standard extension sameSite format:
        // 'none' / 'no_restriction' -> 'no_restriction'
        // 'lax' -> 'lax'
        // 'strict' -> 'strict'
        // default / unspecified / none -> null
        let sameSite: 'no_restriction' | 'lax' | 'strict' | null = null;
        if (rawSameSite === 'none' || rawSameSite === 'no_restriction') {
          sameSite = 'no_restriction';
        } else if (rawSameSite === 'lax') {
          sameSite = 'lax';
        } else if (rawSameSite === 'strict') {
          sameSite = 'strict';
        } else {
          sameSite = null;
        }

        const exp = typeof c.expires === 'number' && c.expires > 0
          ? c.expires
          : (typeof c.expirationDate === 'number' && c.expirationDate > 0 ? c.expirationDate : undefined);

        const cookieItem: any = {
          domain,
        };

        if (exp !== undefined) {
          cookieItem.expirationDate = exp;
        }

        cookieItem.hostOnly = domain ? !domain.startsWith('.') : false;
        cookieItem.httpOnly = Boolean(c.httpOnly);
        cookieItem.name = String(c.name);
        cookieItem.path = c.path || '/';
        cookieItem.sameSite = sameSite;
        cookieItem.secure = Boolean(c.secure || c.name.startsWith('__Secure-') || c.name.startsWith('__Host-'));
        cookieItem.session = Boolean(c.session || !exp);
        cookieItem.storeId = null;
        cookieItem.value = String(c.value !== undefined ? c.value : '');

        // For __Host- cookies, conform strictly to RFC 6265
        if (cookieItem.name.startsWith('__Host-')) {
          delete cookieItem.domain;
          cookieItem.hostOnly = true;
          cookieItem.path = '/';
          cookieItem.secure = true;
        }

        return cookieItem;
      }).filter(Boolean);

      return { success: true, cookies: formattedCookies };
    }

    if (action === 'clearCookies') {
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }
      await sendWs(page.webSocketDebuggerUrl, 'Network.enable', {}).catch(() => {});
      const domain = (payload?.domain || '').trim();
      if (domain) {
        const getRes = await sendWs(page.webSocketDebuggerUrl, 'Network.getCookies', {});
        if (getRes?.success && Array.isArray(getRes.result?.cookies)) {
          const matched = getRes.result.cookies.filter((c: any) =>
            (c.domain && c.domain.includes(domain)) || (domain.includes(c.domain))
          );
          for (const c of matched) {
            await sendWs(page.webSocketDebuggerUrl, 'Network.deleteCookies', {
              name: c.name,
              domain: c.domain,
              path: c.path,
            }).catch(() => {});
          }
          return { success: true, count: matched.length };
        }
      }
      const res = await sendWs(page.webSocketDebuggerUrl, 'Network.clearBrowserCookies', {});
      if (res && res.success) {
        return { success: true };
      }
      return { success: false, error: res?.error || 'Failed to clear cookies' };
    }

    if (action === 'uploadFile' || action === 'setFileInputFiles') {
      const { xpath, files } = payload || {};
      let fileList: string[] = [];

      if (Array.isArray(files)) {
        fileList = files.map((f: any) => String(f).trim()).filter(Boolean);
      } else if (typeof files === 'string') {
        const trimmed = files.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              fileList = parsed.map((f: any) => String(f).trim()).filter(Boolean);
            }
          } catch (e) {}
        }
        if (fileList.length === 0 && trimmed) {
          if (trimmed.includes('\n')) {
            fileList = trimmed.split('\n').map((f: string) => f.trim()).filter(Boolean);
          } else if (trimmed.includes('|')) {
            fileList = trimmed.split('|').map((f: string) => f.trim()).filter(Boolean);
          } else {
            fileList = [trimmed];
          }
        }
      }

      if (fileList.length === 0) {
        return { success: false, error: 'No files provided to upload' };
      }

      // Check if files exist on disk
      for (const f of fileList) {
        if (!fs.existsSync(f)) {
          return { success: false, error: `File not found on disk: ${f}` };
        }
      }

      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }

      // 1. Find the input element RemoteObject
      const findScript = `(() => {
        let el = null;
        if (${JSON.stringify(xpath || '')}) {
          try {
            el = document.evaluate(${JSON.stringify(xpath || '')}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          } catch (e) {}
        }
        if (!el) {
          // Auto fallback: find active/visible file input or any file input accepting images
          const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
          el = inputs.find(i => (i.getAttribute('accept') || '').includes('image/*') && i.hasAttribute('multiple'))
            || inputs.find(i => (i.getAttribute('accept') || '').includes('image'))
            || inputs[inputs.length - 1];
        }
        return el;
      })()`;

      const evalRes = await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
        expression: findScript,
        returnByValue: false,
      });

      const objectId = evalRes?.result?.result?.objectId;
      if (!objectId) {
        return { success: false, error: 'Không tìm thấy thẻ <input type="file"> để tải tệp lên' };
      }

      // 2. Call DOM.setFileInputFiles
      const setRes = await sendWs(page.webSocketDebuggerUrl, 'DOM.setFileInputFiles', {
        files: fileList,
        objectId,
      });

      if (!setRes.success) {
        return { success: false, error: setRes.error || 'DOM.setFileInputFiles failed' };
      }

      // 3. Dispatch input and change events to notify the website
      await sendWs(page.webSocketDebuggerUrl, 'Runtime.evaluate', {
        expression: `(() => {
          try {
            let el = null;
            if (${JSON.stringify(xpath || '')}) {
              try {
                el = document.evaluate(${JSON.stringify(xpath || '')}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              } catch(e) {}
            }
            if (!el) {
              const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
              el = inputs.find(i => (i.getAttribute('accept') || '').includes('image/*') && i.hasAttribute('multiple'))
                || inputs.find(i => (i.getAttribute('accept') || '').includes('image'))
                || inputs[inputs.length - 1];
            }
            if (el) {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch(e) {}
        })()`,
        returnByValue: true,
      }).catch(() => {});

      return { success: true, count: fileList.length };
    }

    if (action === 'acceptAlert' || action === 'cancelAlert') {
      const accept = action === 'acceptAlert';
      const page = await getPageTarget();
      if (page && page.webSocketDebuggerUrl) {
        await sendWs(page.webSocketDebuggerUrl, 'Page.enable', {}, 1200).catch(() => null);
        const jsDialogRes = await sendWs(
          page.webSocketDebuggerUrl,
          'Page.handleJavaScriptDialog',
          { accept },
          1200
        ).catch(() => null);
        if (jsDialogRes && jsDialogRes.success) {
          return {
            success: true,
            method: 'javascript-dialog',
            button: accept ? 'OK (JS Alert)' : 'Cancel (JS Alert)',
          };
        }
      }

      // Handle Native Browser Dialog (e.g. Chrome Web Store "Thêm tiện ích" / "Add extension" prompt)
      const cleanPort = String(port || '').trim();
      const boolStr = accept ? '$true' : '$false';
      const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32DialogHelper {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }
}
"@

[Win32DialogHelper]::SetProcessDPIAware() | Out-Null

$targetPort = "${cleanPort}"
$isAccept = ${boolStr}

if ($isAccept) {
    $targetNames = @('Thêm tiện ích', 'Add extension', 'Add Extension', 'Cho phép', 'Allow', 'Tiếp tục', 'Continue', 'Xác nhận', 'Confirm', 'Keep', 'Giữ', 'OK')
} else {
    $targetNames = @('Huỷ', 'Hủy', 'Cancel', 'Chặn', 'Block', 'Đóng', 'Close', 'Remove', 'Xóa')
}

$targetPids = @()
if ($targetPort) {
    $procs = Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%--remote-debugging-port=$targetPort%'"
    foreach ($p in $procs) {
        if ($p.CommandLine -notlike '*--type=*') {
            $targetPids += [int]$p.ProcessId
        }
    }
    if ($targetPids.Count -eq 0) {
        foreach ($p in $procs) {
            $targetPids += [int]$p.ProcessId
        }
    }
}

$root = [System.Windows.Automation.AutomationElement]::RootElement
$classCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Chrome_WidgetWin_1')
$btnCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)

$foundBtn = $null
$foundWin = $null
$matchedName = ''

for ($attempt = 0; $attempt -lt 18; $attempt++) {
    $allWins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $classCond)
    $orderedWins = @()
    $otherWins = @()
    foreach ($w in $allWins) {
        if ($targetPids -contains $w.Current.ProcessId) {
            $orderedWins += $w
        } else {
            $otherWins += $w
        }
    }
    $searchWins = $orderedWins + $otherWins

    foreach ($w in $searchWins) {
        $btns = $w.FindAll([System.Windows.Automation.TreeScope]::Descendants, $btnCond)
        foreach ($b in $btns) {
            $bName = $b.Current.Name
            if (-not $bName) { continue }
            $bNameTrim = $bName.Trim()
            foreach ($tn in $targetNames) {
                if ($bNameTrim -ieq $tn -or (($tn.Length -ge 8) -and ($bNameTrim -ilike "*$tn*"))) {
                    if (-not $b.Current.IsOffscreen -and $b.Current.IsEnabled) {
                        $foundBtn = $b
                        $foundWin = $w
                        $matchedName = $bNameTrim
                        break
                    }
                }
            }
            if ($foundBtn) { break }
        }
        if ($foundBtn) { break }
    }

    if ($foundBtn) { break }
    Start-Sleep -Milliseconds 400
}

if ($foundBtn) {
    # Wait 600ms to pass Chromium ExtensionInstallDialogView 500ms input_protector anti-clickjacking timer
    Start-Sleep -Milliseconds 600

    $invoked = $false
    $pat = $null
    if ($foundBtn.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pat)) {
        try {
            $pat.Invoke()
            $invoked = $true
        } catch {}
    }

    Start-Sleep -Milliseconds 250

    $stillVisible = $false
    try {
        $rect = $foundBtn.Current.BoundingRectangle
        if (-not $foundBtn.Current.IsOffscreen -and $rect.Width -gt 2 -and $rect.Height -gt 2) {
            $stillVisible = $true
        }
    } catch {}

    if (-not $invoked -or $stillVisible) {
        try {
            $hwnd = [IntPtr]$foundWin.Current.NativeWindowHandle
            if ($hwnd -ne [IntPtr]::Zero) {
                [Win32DialogHelper]::SetForegroundWindow($hwnd) | Out-Null
                Start-Sleep -Milliseconds 80
            }
            $rect = $foundBtn.Current.BoundingRectangle
            if ($rect.Width -gt 2 -and $rect.Height -gt 2 -and -not [double]::IsInfinity($rect.Left)) {
                $origPt = New-Object Win32DialogHelper+POINT
                [Win32DialogHelper]::GetCursorPos([ref]$origPt) | Out-Null
                $cx = [int][Math]::Round($rect.Left + ($rect.Width / 2.0))
                $cy = [int][Math]::Round($rect.Top + ($rect.Height / 2.0))
                [Win32DialogHelper]::SetCursorPos($cx, $cy) | Out-Null
                Start-Sleep -Milliseconds 45
                [Win32DialogHelper]::mouse_event(0x0002, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 45
                [Win32DialogHelper]::mouse_event(0x0004, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 45
                [Win32DialogHelper]::SetCursorPos($origPt.X, $origPt.Y) | Out-Null
            } else {
                $foundBtn.SetFocus()
                Start-Sleep -Milliseconds 50
                [Win32DialogHelper]::keybd_event(0x0D, 0, 0, 0)
                Start-Sleep -Milliseconds 30
                [Win32DialogHelper]::keybd_event(0x0D, 0, 2, 0)
            }
        } catch {}
    }

    Write-Output ("{" + '"success":true,"method":"native-uia","button":' + ($matchedName | ConvertTo-Json -Compress) + "}")
    exit 0
}

Write-Output '{"success":false,"error":"Không tìm thấy hộp thoại cảnh báo hoặc nút Thêm tiện ích"}'
exit 0
`;
      const encodedPs = Buffer.from(psScript, 'utf16le').toString('base64');
      return new Promise((resolve) => {
        try {
          const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encodedPs], {
            windowsHide: true,
          });
          let stdoutData = '';
          let stderrData = '';
          ps.stdout.on('data', (d) => { stdoutData += d.toString(); });
          ps.stderr.on('data', (d) => { stderrData += d.toString(); });
          ps.on('close', () => {
            const lines = stdoutData.trim().split(/\r?\n/).filter(Boolean);
            const lastLine = lines[lines.length - 1] || '';
            try {
              const parsed = JSON.parse(lastLine);
              resolve(parsed);
              return;
            } catch {}
            resolve({
              success: false,
              error: stderrData.trim() || 'Không tìm thấy hộp thoại trên trình duyệt',
            });
          });
          ps.on('error', (err) => {
            resolve({ success: false, error: err.message });
          });
        } catch (err: any) {
          resolve({ success: false, error: err.message });
        }
      });
    }

    if (action === 'screenshot') {
      const { outputPath, fileName, fullPage } = payload || {};
      const page = await getPageTarget();
      if (!page || !page.webSocketDebuggerUrl) {
        return { success: false, error: 'No active Chrome page found.' };
      }

      const wsUrl = page.webSocketDebuggerUrl;
      const cdpParams: any = {
        format: 'png',
      };
      if (fullPage) {
        cdpParams.captureBeyondViewport = true;
      }

      const snapRes = await sendWs(wsUrl, 'Page.captureScreenshot', cdpParams, 30000);
      if (!snapRes?.success || !snapRes.result?.data) {
        return { success: false, error: snapRes?.error || 'Failed to capture screenshot via CDP' };
      }

      const base64Data = snapRes.result.data;
      const buffer = Buffer.from(base64Data, 'base64');

      let targetDir = outputPath ? path.resolve(outputPath) : app.getPath('pictures');
      if (outputPath && (outputPath.endsWith('.png') || outputPath.endsWith('.jpg') || outputPath.endsWith('.jpeg'))) {
        targetDir = path.dirname(outputPath);
      }

      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      } catch (err: any) {
        return { success: false, error: `Failed to create directory "${targetDir}": ${err.message}` };
      }

      const finalName = fileName || `screenshot_${Date.now()}.png`;
      const finalPath = path.join(targetDir, finalName);

      try {
        fs.writeFileSync(finalPath, buffer);
        return { success: true, filePath: finalPath };
      } catch (err: any) {
        return { success: false, error: `Failed to save screenshot: ${err.message}` };
      }
    }

    return { success: false, error: 'Unknown action' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running. Quitting this process will trigger
  // 'second-instance' in the first process, which opens a new window seamlessly
  // without disk cache locks or errors.
  app.quit();
} else {
  app.on('second-instance', (_, commandLine) => {
    // When the user opens the application again or launches a package .exe,
    // create and focus a new window with the given commandLine arguments!
    const newWin = createWindow(commandLine);
    if (newWin) {
      if (newWin.isMinimized()) newWin.restore();
      newWin.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (windows.size === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
