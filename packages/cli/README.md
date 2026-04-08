# @tomomo/cli

**Build your AI agent team and do anything.**

The CLI is a thin shell over `@tomomo/core`. It provides commands, the Ink terminal UI, and the bin entry point. All business logic (agent CRUD, memory, adapters, launch orchestration) lives in `@tomomo/core`. The CLI re-exports everything from core for backward compatibility, so external consumers can still `import { ... } from "@tomomo/cli"`.

## Install

```bash
npm install -g @tomomo/cli
```

Requires Node.js 22+.

## Usage

### Interactive Mode

Running `tomomo` with no arguments opens the interactive terminal UI (built with Ink/React). From there you can browse your agents, create new ones, and launch them. On first launch, the CLI walks you through picking a starter character and naming your first agent. The name input is prefilled with a short deterministic suggestion derived from the character's seed, so you can press Enter to accept "Momo" or type to override.

```bash
tomomo
```

### Agent Management

```bash
tomomo create --name WebDev                    # Create an agent
tomomo create                                  # Interactive creation (prompts for name)
tomomo create --name Reviewer --model sonnet   # With model preference
tomomo create --name Coder --runtime codex     # With specific runtime

tomomo list                                    # List all agents
tomomo list --json                             # JSON output

tomomo info web-dev                            # Show details with character art
tomomo info web-dev --json                     # JSON output

tomomo edit web-dev                            # Open soul.md in $EDITOR
tomomo clone web-dev "WebDev Pro"              # Clone (copies soul, not memories)
tomomo delete web-dev                          # Delete with confirmation prompt
tomomo delete web-dev --force                  # Delete without confirmation
```

### Launching

```bash
tomomo launch web-dev .                        # Launch on current directory
tomomo launch web-dev ~/projects/my-app        # Launch on specific path
tomomo launch web-dev . --skip-permissions     # Launch with all runtime permissions bypassed
tomomo resume web-dev .                        # Resume last session
```

When you launch an agent, Tomomo:

1. Merges any previous session memory files into `memory.md` before context assembly
2. Loads the agent's `soul.md` (personality and instructions)
3. Loads `user.md` (your global preferences, if it exists)
4. Loads agent memory and project memory (within character budgets)
5. Assembles everything into a system prompt
6. Hands off to the runtime (Claude Code, Codex, etc.)
7. On exit, updates launch stats and stores the session ID for resume

### Agent Files

Each agent lives in `~/.tomomo/agents/<id>/`:

```text
~/.tomomo/agents/web-dev/
├── agent.json       # Metadata (runtime, model, launch count)
├── soul.md          # Personality, expertise, rules (the agent's identity)
├── memory.md        # What the agent has learned across all projects
├── sessions.json    # Session IDs for resume
├── skills/          # Equipped skills
└── projects/        # Per-project memories
    └── <hash>/
        ├── project.json
        └── memory.md
```

### Memory System

Memory has four layers, loaded in order:

| Layer          | File                        | Scope                     |
| -------------- | --------------------------- | ------------------------- |
| User           | `~/.tomomo/user.md`         | Global, all agents        |
| Soul           | `soul.md`                   | This agent, always loaded |
| Agent memory   | `memory.md`                 | This agent, all projects  |
| Project memory | `projects/<hash>/memory.md` | This agent, this project  |

Memory files use a Summary + Recent format. When memory exceeds the character budget, Summary is always kept and Recent entries are loaded newest-first until the budget fills.

```bash
tomomo memory web-dev                          # View agent-wide memory
tomomo memory web-dev --project .              # View memory for current project
tomomo memory web-dev --projects               # List all projects with memory
tomomo memory web-dev --compact                # Compact memory (keeps recent entries, extracts key facts)
```

### Skills

Skills are directories containing a `SKILL.md` file that gets injected into the agent's context at launch. They let you equip an agent with reusable instructions or domain knowledge.

```bash
tomomo skills web-dev                          # List equipped skills
tomomo skills web-dev add ./my-skill           # Add a skill from a local directory
tomomo skills web-dev remove my-skill          # Remove an equipped skill
```

### Export and Import

Export and import let you share agents or back them up. Project memories are excluded from exports.

```bash
tomomo export web-dev                          # Export to web-dev.tar.gz in current dir
tomomo export web-dev -o ~/backups/agent.tar.gz  # Export to a specific path
tomomo import web-dev.tar.gz                   # Import from a .tar.gz file
```

### Adapters (Runtimes)

Built-in:

- **claude-code**: Claude Code CLI
- **codex**: OpenAI Codex CLI
- **gemini-cli**: Google Gemini CLI

Managing community adapters:

```bash
tomomo adapter add tomomo-adapter-aider        # Install (name comes from adapter)
tomomo adapter add @myorg/custom-adapter       # Scoped packages work too
tomomo adapter list                            # Show all adapters
tomomo adapter remove gemini                   # Uninstall
```

The adapter declares its own runtime name via the `name` property in its export. Packages are installed locally to `~/.tomomo/adapters/<name>/` (no global npm, no sudo). If an adapter with the same name is already installed, you must remove it first.

Local adapters (no npm needed): drop a folder in `~/.tomomo/adapters/<name>/` with an `index.js` that exports `{ name, install, check(), getSpawnConfig(), launch() }`. Auto-discovered at runtime.

Creating an adapter:

```typescript
// index.js
export default {
  name: "my-runtime",
  install: {
    command: "npm install -g my-runtime-cli",
    description: "My Runtime",
    url: "https://my-runtime.dev",
  },
  async check() {
    // Return { available: true } if the runtime CLI is installed
  },
  async getSpawnConfig(ctx) {
    // Return { command, args, env?, cwd?, cleanup? }
    // Used by both CLI and desktop to spawn the runtime
    const args = ["--system-prompt", ctx.systemPrompt];
    if (ctx.skipPermissions) {
      args.push("--auto-approve"); // Use your runtime's equivalent flag
    }
    args.push(ctx.projectDir);
    return { command: "my-runtime", args };
  },
  async launch(ctx) {
    // Spawn the runtime using getSpawnConfig
    const config = await this.getSpawnConfig(ctx);
    const proc = require("child_process").spawn(config.command, config.args, {
      stdio: "inherit",
      cwd: ctx.projectDir,
    });
    return {
      process: proc,
      onExit(cb) {
        proc.on("exit", cb);
      },
    };
  },
};
```

### Config and Doctor

```bash
tomomo config                                  # View full config as JSON
tomomo config <key>                            # Get a specific config value
tomomo config <key> <value>                    # Set a config value
tomomo config --path                           # Show config directory path

tomomo doctor                                  # Check system health (runtimes, paths, etc.)
```

## Architecture

The CLI is a thin shell. All business logic lives in `@tomomo/core`.

```text
src/
├── bin/tomomo.ts          # Entry point (Commander.js)
├── index.ts               # Re-exports @tomomo/core
├── commands/              # CLI command handlers
└── ui/                    # Interactive terminal UI (Ink/React)
    ├── app.tsx
    ├── screens/
    └── components/
```

Business logic (agent CRUD, adapters, memory, launch, character generation, etc.) lives in `packages/core/`.

## Exports

The CLI re-exports everything from `@tomomo/core` for backward compatibility. Internal packages (desktop, vscode, website) import from `@tomomo/core` directly.

```typescript
import {
  // Agent CRUD
  createAgent,
  loadAgent,
  saveAgent,
  listAgents,
  deleteAgent,
  cloneAgent,
  slugifyName,
  agentExists,

  // Launch
  assembleContext,
  launchAgent,

  // Onboarding
  runOnboarding,
  isOnboarded,
  checkRuntimes,

  // Adapters
  getAdapter,
  listBuiltInAdapters,
  isValidAdapter,
  clearAdapterCache,

  // Memory utilities
  parseMemoryFile,
  truncateWithinBudget,
  basicCompact,

  // Character
  genCharacter,
  renderCharacterToTerminal,
  CHARACTER_PALETTE,
  AGENT_NAMES,
  generateAgentName,

  // Config
  loadConfig,
  saveConfig,

  // Sessions
  storeSession,
  getLastSession,

  // Project
  resolveProjectHash,
  ensureProject,

  // Doctor
  runDiagnostics,

  // Paths, files, types, utils
  shortHash,
  // ...plus all exports from paths, files, and types
} from "@tomomo/cli";
```

## License

MIT
