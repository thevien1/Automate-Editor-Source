import path from 'path';

export function chromeCandidates(platform: string, home: string, env: NodeJS.ProcessEnv): string[] {
  if (platform === 'darwin') {
    return ['/Applications', path.join(home, 'Applications')].flatMap(root => [
      path.join(root, 'Google Chrome.app/Contents/MacOS/Google Chrome'),
      path.join(root, 'Chromium.app/Contents/MacOS/Chromium'),
      path.join(root, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
    ]);
  }
  if (platform !== 'win32') return ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return [
    path.join(env.ProgramFiles || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
    path.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
    path.join(env.LOCALAPPDATA || path.join(home, 'AppData/Local'), 'Google/Chrome/Application/chrome.exe'),
    path.join(env.ProgramFiles || 'C:\\Program Files', 'Microsoft/Edge/Application/msedge.exe'),
    path.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
  ];
}

export function macLauncher(packageName: string): string {
  const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
  return `#!/bin/sh\nSCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1\nexec /usr/bin/open -b com.svbrowser.automateeditor "$SCRIPT_DIR"/${quote(packageName)}\n`;
}
