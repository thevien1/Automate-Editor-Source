import packageInfo from '../../package.json';

export const CURRENT_APP_VERSION = packageInfo.version || '3.1.0';
export const GITHUB_REPO = 'thevien1/Automate-Editor';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
  setupDownloadUrl?: string;
  portableDownloadUrl?: string;
  checkedAt: number;
  error?: string;
}

/**
 * Compare two semver strings (e.g. '3.0.9' and '3.0.8', or 'v3.0.9' and '3.0.8').
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  // Extract numeric parts before any hyphen (e.g. 3.0.8-stable -> 3.0.8)
  const base1 = clean1.split('-')[0];
  const base2 = clean2.split('-')[0];

  const parts1 = base1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = base2.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Check for updates from GitHub Releases API
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const defaultInfo: UpdateInfo = {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    releaseName: '',
    releaseNotes: '',
    publishedAt: '',
    htmlUrl: `https://github.com/${GITHUB_REPO}/releases`,
    checkedAt: Date.now(),
  };

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        ...defaultInfo,
        error: `GitHub API returned ${response.status}`,
      };
    }

    const data = await response.json();
    const rawTag = data.tag_name || '';
    const latestVersion = rawTag.replace(/^v/i, '').trim();

    if (!latestVersion) {
      return defaultInfo;
    }

    const hasUpdate = compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;

    let setupDownloadUrl: string | undefined;
    let portableDownloadUrl: string | undefined;

    if (Array.isArray(data.assets) && data.assets.length > 0) {
      // Find setup installer exe
      const setupAsset = data.assets.find(
        (a: any) =>
          typeof a.name === 'string' &&
          a.name.toLowerCase().includes('setup') &&
          a.name.toLowerCase().endsWith('.exe')
      );

      // Find portable exe (doesn't contain setup)
      const portableAsset = data.assets.find(
        (a: any) =>
          typeof a.name === 'string' &&
          !a.name.toLowerCase().includes('setup') &&
          a.name.toLowerCase().endsWith('.exe')
      );

      // Fallback: any exe
      const anyExeAsset = data.assets.find(
        (a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe')
      );

      setupDownloadUrl = setupAsset?.browser_download_url || anyExeAsset?.browser_download_url;
      portableDownloadUrl = portableAsset?.browser_download_url;
    }

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion,
      releaseName: data.name || `Version ${rawTag}`,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
      htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/tag/${rawTag}`,
      setupDownloadUrl,
      portableDownloadUrl,
      checkedAt: Date.now(),
    };
  } catch (err: any) {
    return {
      ...defaultInfo,
      error: err.message || 'Network error',
    };
  }
}

/**
 * Open external link using Electron shell or window.open
 */
export function openExternalUrl(url: string) {
  if (!url) return;
  if ((window as any).electronAPI?.openExternal) {
    (window as any).electronAPI.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}
