<p align="center">
  <img src="assets/icon-dark.png" width="120" alt="Tomomo" />
</p>

<h1 align="center">tomomo</h1>

<p align="center">
  <strong>Build your AI agent team and do anything.</strong>
</p>

Create, customize, and launch specialized AI agents with persistent memory and unique characters. Each agent has a personality, remembers across sessions, and connects to its own services. Powered by any runtime: Claude Code, Codex, Gemini CLI, and more.

## Quick Start

```bash
npm install -g @tomomo/cli
tomomo
```

That's it. The interactive mode walks you through creating your first agent and launching it.

Or if you prefer commands:

```bash
tomomo create --name Pixel
tomomo launch pixel .
```

## What Tomomo Does

1. **Create** an agent with a name and runtime
2. Each agent gets a `soul.md` (personality), `memory.md` (what it learns), and a unique pixel art character
3. **Connect** services via MCP servers. Each agent gets its own GitHub, Linear, Slack, or any service account
4. **Launch** the agent on any project. Tomomo assembles the context and hands off to the runtime
5. The agent **remembers** across sessions. Project knowledge stays scoped. Universal knowledge travels everywhere.
6. **Resume** picks up where you left off

## Adapters

Tomomo is a launcher, not a wrapper. It supports multiple agent runtimes through adapters:

- **Claude Code**, **Codex**, and **Gemini CLI** are built in
- Community adapters: `tomomo adapter add <npm-package>`
- Local adapters: drop a folder in `~/.tomomo/adapters/<name>/`

```bash
tomomo adapter add tomomo-adapter-aider
tomomo adapter list
tomomo adapter remove aider
```

## Agent Accounts

Give each agent its own service identities. Larry commits to GitHub as larry-bot. Sparkling books hotels with its own API key. Each agent is independent. Your environment is never touched.

```bash
tomomo mcp larry add github -- npx -y @modelcontextprotocol/server-github \
  --env GITHUB_PERSONAL_ACCESS_TOKEN=ghp_larry_xxxxx
```

This creates two files in the agent directory:

- `mcp.json` (portable, safe to share): describes what services the agent uses with `${VAR}` references
- `.env` (never shared, gitignored): holds the actual secrets

Credentials flow to MCP server subprocesses, never to the LLM context.

## Agent Sharing

Share agents through GitHub. Any repo (or subfolder) with an `agent.json` and `soul.md` is installable:

```bash
tomomo install user/repo/agent-name
```

## Commands

```bash
tomomo                                         # Interactive mode
tomomo create --name <name>                    # Create a new agent
tomomo list                                    # List all agents
tomomo info <agent>                            # Show agent details
tomomo launch <agent> [path]                   # Launch an agent on a project
tomomo resume <agent> [path]                   # Resume last session
tomomo edit <agent>                            # Open soul.md in your editor
tomomo clone <agent> <name>                    # Clone an agent
tomomo delete <agent>                          # Delete an agent
tomomo memory <agent>                          # View agent memory
tomomo memory <agent> --compact                # Compact agent memory
tomomo skills <agent>                          # List equipped skills
tomomo skills <agent> add <path>               # Add a skill
tomomo skills <agent> remove <name>            # Remove a skill
tomomo mcp <agent> list                        # List MCP servers
tomomo mcp <agent> add <name> -- <command...>  # Add an MCP server
tomomo mcp <agent> remove <name>               # Remove an MCP server
tomomo adapter list                            # Show all adapters
tomomo adapter add <package>                   # Install a community adapter
tomomo adapter remove <runtime>                # Uninstall an adapter
tomomo install <owner/repo[/path]>             # Install agent from GitHub
tomomo export <agent>                          # Export agent to a folder
tomomo import <file>                           # Import agent from archive
tomomo doctor                                  # Check system health
tomomo config                                  # View global config
tomomo config <key> <value>                    # Set a config value
```

All commands support `--json` for machine-readable output.

## Packages

| Package                                 | Description                            |
| --------------------------------------- | -------------------------------------- |
| [`@tomomo/cli`](./packages/cli)         | CLI (published to npm)                 |
| [`@tomomo/core`](./packages/core)       | Shared business logic, types, adapters |
| [`@tomomo/desktop`](./packages/desktop) | Electron desktop app                   |
| [`@tomomo/vscode`](./packages/vscode)   | VS Code extension                      |
| [`@tomomo/ui`](./packages/ui)           | Shared React components                |
| [`@tomomo/website`](./packages/website) | tomomo.app                             |

## Development

```bash
git clone https://github.com/withtomomo/tomomo.git
cd tomomo
npm install
npm run build
npm test
```

Requires Node.js 22+. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more.

## License

MIT
