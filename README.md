# tomomo

**Build your AI agent team and do anything.**

Create, customize, and deploy specialized AI agents, powered by any runtime (Claude Code, Codex, and more), with persistent memory and unique characters.

## Quick Start

```bash
npm install -g @tomomo/cli
tomomo create
tomomo launch myagent .
```

## Packages

| Package                                 | Description            |
| --------------------------------------- | ---------------------- |
| [`@tomomo/cli`](./packages/cli)         | CLI, the brain         |
| [`@tomomo/desktop`](./packages/desktop) | Desktop app            |
| [`@tomomo/vscode`](./packages/vscode)   | VS Code extension      |

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
