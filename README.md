# tomomo

**Build your AI agent team and do anything.**

Create, customize, and launch specialized AI agents with persistent memory and unique characters. Powered by any runtime: Claude Code, Codex, and more.

## Quick Start

```bash
npm install -g @tomomo/cli
tomomo create --name MyAgent
tomomo launch my-agent .
```

## Commands

```bash
tomomo                                   # Interactive mode (agent list, create, launch)
tomomo create --name <name>              # Create a new agent
tomomo create                            # Interactive creation (prompts for name)
tomomo list                              # List all agents
tomomo info <agent>                      # Show agent details with character
tomomo edit <agent>                      # Open soul.md in your editor
tomomo delete <agent>                    # Delete an agent (with confirmation)
tomomo clone <agent> <name>              # Clone an agent
tomomo launch <agent> [path]             # Launch an agent on a project
tomomo resume <agent> [path]             # Resume last session
tomomo memory <agent>                    # View agent memory
tomomo memory <agent> --compact          # Compact agent memory
tomomo memory <agent> --projects         # List all projects
tomomo skills <agent>                    # List equipped skills
tomomo skills <agent> add <path>         # Add a skill
tomomo skills <agent> remove <name>      # Remove a skill
tomomo mcp <agent> list                  # List agent's MCP servers
tomomo mcp <agent> add <name> -- <command...>  # Add an MCP server to an agent
tomomo mcp <agent> remove <name>         # Remove an MCP server
tomomo adapter add <package>             # Install a community adapter
tomomo adapter remove <runtime>          # Uninstall an adapter
tomomo adapter list                      # Show all adapters
tomomo install <owner/repo[/path]>       # Install agent from GitHub
tomomo export <agent>                    # Export agent to a folder
tomomo import <file>                     # Import agent from archive
tomomo doctor                            # Check system health
tomomo config                            # View global config
tomomo config <key> <value>              # Set a config value
```

All commands support `--json` for machine-readable output.

## Packages

| Package                                 | Description       | Status      |
| --------------------------------------- | ----------------- | ----------- |
| [`@tomomo/cli`](./packages/cli)         | CLI, the brain    | In progress |
| [`@tomomo/desktop`](./packages/desktop) | Desktop app       | In progress |
| [`@tomomo/vscode`](./packages/vscode)   | VS Code extension | Planned     |
| [`@tomomo/website`](./packages/website) | Marketing website | In progress |

## How It Works

1. **Create** an agent with a name, runtime, and optional model preference
2. Each agent gets a `soul.md` (personality), `memory.md` (what it learns), and a unique pixel art character
3. **Connect** services via MCP servers. Each agent can have its own GitHub, Linear, Slack, or any service account
4. **Launch** the agent on any project directory. Tomomo assembles the context (soul + memory + MCP servers) and hands off to the runtime
5. The agent **remembers** across sessions. Project knowledge stays scoped to that project. Universal knowledge travels everywhere.
6. **Resume** picks up where you left off

## Adapters

Tomomo is a launcher, not a wrapper. It supports multiple agent runtimes through adapters:

- **Claude Code**, **Codex**, and **Gemini CLI** are built in
- Community adapters: `tomomo adapter add <npm-package>`
- Local adapters: drop a folder in `~/.tomomo/adapters/<name>/`

```bash
tomomo adapter add tomomo-adapter-aider     # Install (runtime name comes from the adapter)
tomomo adapter list                         # Show all adapters
tomomo adapter remove aider                 # Uninstall
```

## Agent Accounts

Give each agent its own service identities. Larry commits to GitHub as larry-bot. Sparkling books hotels with its own API key. Each agent is independent. Your environment is never touched.

Agents use MCP servers from the ecosystem (GitHub, Linear, Slack, and 195+ more in the Anthropic registry). Tomomo manages which servers each agent has, with each agent's own credentials.

```bash
tomomo mcp larry add github -- npx -y @modelcontextprotocol/server-github \
  --env GITHUB_PERSONAL_ACCESS_TOKEN=ghp_larry_xxxxx
```

This creates two files in the agent directory:

- `mcp.json` (portable, safe to share): describes what services the agent uses with `${VAR}` references
- `.env` (never shared, gitignored): holds the actual secrets

When you clone or share an agent, recipients get the `mcp.json` showing what services are needed. They add their own keys.

At launch, Tomomo resolves the variables and passes the config to the runtime. Credentials flow to MCP server subprocesses, never to the LLM context.

## Agent Sharing

Share agents through GitHub. Any repo (or subfolder) with an `agent.json` and `soul.md` is installable:

```bash
tomomo install user/repo/agent-name         # Install agent from GitHub
```

## Desktop App

The desktop app provides a visual interface for managing and running your agents. Build it locally:

```bash
cd packages/desktop
npm run build
npx electron-builder --mac --dir    # or --win or --linux
```

## Development

```bash
git clone https://github.com/withtomomo/tomomo.git
cd tomomo
npm install
npm run build --workspace=packages/cli
npm test --workspace=packages/cli
```

## License

MIT
