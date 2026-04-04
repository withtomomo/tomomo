interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

let api: VsCodeApi | null = null;

export function getVsCodeApi(): VsCodeApi {
  if (!api) {
    // @ts-expect-error acquireVsCodeApi is injected by VS Code
    api = acquireVsCodeApi();
  }
  return api!;
}
