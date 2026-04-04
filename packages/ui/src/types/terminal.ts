export interface TerminalSession {
  sessionId: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  agentRuntime: string;
  character: { grid: number[][]; color: string; size: number } | null;
  projectDir: string;
  skipPermissions?: boolean;
}
