export interface RuntimeInfo {
  name: string;
  available: boolean;
  install?: { command: string; description: string; url: string };
}
