export interface OpenRuntimeProfile {
  threadId: number;
  profileId: string;
  name: string;
}

type StopRequest = (url: string, timeoutMs: number) => Promise<boolean>;

// Track browser instances actually opened by this runtime, including completed
// workflows whose browser was intentionally left open.
export class RuntimeProfileStopper {
  readonly openProfiles = new Map<string, OpenRuntimeProfile>();
  private pending = new Map<string, Promise<boolean>>();

  constructor(private request: StopRequest) {}

  track(profile: OpenRuntimeProfile) {
    this.openProfiles.set(profile.profileId, profile);
  }

  stop(profileId: string): Promise<boolean> {
    if (!profileId) return Promise.resolve(true);
    const existing = this.pending.get(profileId);
    if (existing) return existing;
    const operation = this.performStop(profileId).then(success => {
      if (success) this.openProfiles.delete(profileId);
      return success;
    }).finally(() => this.pending.delete(profileId));
    this.pending.set(profileId, operation);
    return operation;
  }

  private async performStop(profileId: string) {
    const deadline = Date.now() + 6000;
    const id = encodeURIComponent(profileId);
    const urls = [
      `http://127.0.0.1:8725/api/v1/profiles/stop/${id}`,
      `http://127.0.0.1:8725/api/v1/profiles/close/${id}`,
      `http://127.0.0.1:8725/api/v3/profiles/stop/${id}`,
      `http://127.0.0.1:8725/api/v3/profiles/close/${id}`,
      `http://127.0.0.1:9495/api/v1/profiles/stop/${id}`,
    ];
    for (const url of urls) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const timeoutMs = Math.min(1500, remaining);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const success = await Promise.race([
          this.request(url, timeoutMs),
          new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); }),
        ]);
        if (success) return true;
      } catch { /* Try the next supported API route within the same budget. */ }
      finally { if (timer) clearTimeout(timer); }
    }
    return false;
  }

  async stopAll(onStopping: (profile: OpenRuntimeProfile) => void) {
    const profiles = [...this.openProfiles.values()];
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, profiles.length) }, async () => {
      while (next < profiles.length) {
        const profile = profiles[next++];
        onStopping(profile);
        await this.stop(profile.profileId);
      }
    }));
    return profiles.filter(profile => this.openProfiles.has(profile.profileId));
  }
}
