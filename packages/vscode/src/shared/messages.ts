export interface RequestMessage {
  id: string;
  type: "request";
  method: string;
  args: unknown[];
}

export interface ResponseMessage {
  id: string;
  type: "response";
  result?: unknown;
  error?: string;
}

export interface EventMessage {
  type: "event";
  event: "terminal:data" | "terminal:exit";
  sessionId: string;
  data?: string;
  exitCode?: number;
}
