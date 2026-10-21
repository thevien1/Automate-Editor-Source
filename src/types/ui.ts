export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
}

export type ActiveScreen = 'home' | 'editor' | 'runtime';

export interface ActionDefinition {
  type: number;
  name: string;
  category: string;
  description: string;
  icon?: string;
  defaultRawInput?: Array<{ Key: string; Value: string }>;
  hasXPath?: boolean;
  hasOutVar?: boolean;
  defaultOutVar?: string;
  defaultDelay?: string;
}

export interface ActionCategory {
  id: string;
  name: string;
  count: number;
  actions: ActionDefinition[];
}
