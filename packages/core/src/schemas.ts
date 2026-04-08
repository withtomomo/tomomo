import { z } from "zod";

export const QuickCommandSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt: z.string(),
});

export const MemoryBudgetSchema = z.object({
  agentMemoryChars: z.number(),
  projectMemoryChars: z.number(),
});

export const AgentConfigSchema = z.object({
  version: z.number(),
  id: z.string(),
  seed: z.string(),
  name: z.string(),
  description: z.string(),
  runtime: z.string(),
  createdAt: z.string(),
  lastUsed: z.string(),
  launchCount: z.number(),
  model: z.string().optional(),
  memoryBudget: MemoryBudgetSchema,
  quickCommands: z.array(QuickCommandSchema).optional(),
});

export const AdapterRegistryEntrySchema = z.object({
  package: z.string(),
});

export const GlobalConfigSchema = z.object({
  version: z.number(),
  defaults: z.object({
    runtime: z.string(),
    model: z.string(),
    memoryBudget: MemoryBudgetSchema,
    compactionThresholdBytes: z.number(),
  }),
  adapters: z.record(AdapterRegistryEntrySchema),
  onboardingComplete: z.boolean(),
  introComplete: z.boolean(),
  logLevel: z.string(),
});

export const ProjectInfoSchema = z.object({
  path: z.string(),
  remote: z.string().optional(),
});

export const SessionInfoSchema = z.object({
  lastSessionId: z.string(),
  lastUsed: z.string(),
});

export const McpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
});

export const McpConfigSchema = z.object({
  servers: z.record(McpServerConfigSchema),
});

// Defaults (typed against schemas for safety)

export const DEFAULT_MEMORY_BUDGET: z.infer<typeof MemoryBudgetSchema> = {
  agentMemoryChars: 8000,
  projectMemoryChars: 8000,
};

export const DEFAULT_CONFIG: z.infer<typeof GlobalConfigSchema> = {
  version: 1,
  defaults: {
    runtime: "claude-code",
    model: "sonnet",
    memoryBudget: { ...DEFAULT_MEMORY_BUDGET },
    compactionThresholdBytes: 51200,
  },
  adapters: {},
  onboardingComplete: false,
  introComplete: false,
  logLevel: "error",
};

export const DEFAULT_AGENT: Omit<
  z.infer<typeof AgentConfigSchema>,
  "id" | "seed" | "name" | "createdAt" | "lastUsed"
> = {
  version: 1,
  description: "",
  runtime: "claude-code",
  launchCount: 0,
  memoryBudget: { ...DEFAULT_MEMORY_BUDGET },
};
