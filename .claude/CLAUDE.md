# Tomomo Project Rules

## Git Rules

- NEVER use `git add` or `git commit` commands. All staging and committing is handled manually by the developer.
- NEVER use `git push`. Pushes are manual.
- You may use `git status`, `git diff`, `git log`, `git branch`, and other read-only git commands freely.

## Shell Commands

- Never chain shell commands with `&&`, `||`, `;`, or pipes `|`. Run each command as a separate tool call. This ensures every command matches allowed permission patterns.
- Use absolute paths instead of `cd`. If you must change directory, do it in a separate command.

## Testing

- Colocate tests next to source files: `agent.ts` and `agent.test.ts` in the same directory. No separate `__tests__/` folders.

## Code Style

- TypeScript everywhere. Strict mode.
- ESM modules (`"type": "module"` in package.json).
- npm as package manager. Never pnpm or yarn.
- Node 22+.
- Never use em dashes or hyphens as dashes to connect parts of text. Use commas, colons, periods, or separate sentences instead. Compound words like "user-facing" or "self-improving" are fine.
- Comments: always use `//`. Never use `/* */` or `/** */` JSDoc anywhere. TypeScript types are the documentation. If logic is non-obvious, use a `//` comment above it. No JSDoc, no block comments.
- Never use horizontal rule dividers (`---`) in markdown files. Use headings for structure instead.
- Shared interfaces and types go in `packages/core/src/types.ts` (inferred from Zod schemas in `packages/core/src/schemas.ts`). Consumers import types from `@tomomo/core`.
- File organization: imports, then types/interfaces, then constants, then functions. Private interfaces used only within one file stay in that file but at the top after imports.

## Validation

- Zod schemas in `packages/core/src/schemas.ts` are the source of truth for all disk-serialized types.
- Types in `types.ts` are inferred via `z.infer<>`. Never define a type manually that represents disk data.
- Validation happens at read boundaries (`loadAgent`, `loadConfig`) using `safeParse`.

## Skills

- `design-guidelines`: Use when working on any UI component, style, or visual element. Contains colors, typography, spacing, component patterns, character color tinting rules, and the launcher UI architecture (two views: Agent Hero with embedded chat panel, Hub terminals).
- `brand-voice`: Use when writing any text users will see. CLI help, errors, onboarding, UI labels, docs, copy. Contains the five voice rules, word lists, and before/after examples.

## Adapters

- Built-in adapters live in `packages/core/src/adapters/` (claude-code.ts, codex.ts, gemini-cli.ts)
- Adapter loader lives in `packages/core/src/adapters/loader.ts`
- Every adapter must declare an `install` field with `command`, `description`, and `url` for guided runtime installation
- Trust boundary: built-in adapters offer auto-install with user confirmation. Community adapters only show install instructions as text (never auto-execute untrusted commands).
- Community adapters: installed via `tomomo adapter add <npm-package>` to `~/.tomomo/adapters/<name>/`. The runtime name comes from the adapter's `name` property, not from the user. Registered in `~/.tomomo/config.json`.
- Local adapters: drop a directory in `~/.tomomo/adapters/<name>/` with an `index.js`, auto-discovered
- No global npm installs. Adapters are self-contained in their own directory with isolated node_modules.
- Skip permissions: adapters must check `ctx.skipPermissions` in `getSpawnConfig()` and pass the appropriate runtime flag (e.g., `--dangerously-skip-permissions` for Claude Code, `--full-auto` for Codex, `--yolo` for Gemini CLI).

## Agent Accounts (MCP)

- Each agent can have its own MCP servers configured in `mcp.json` at the agent root
- `mcp.json` uses `${VAR}` references for credentials. Actual secrets live in `.env` (0600 permissions)
- `.env` is always gitignored. Never exported, never cloned.
- `.gitignore` is auto-created in every agent directory on creation
- At launch, Tomomo resolves variables, writes a temp config, passes via `--mcp-config` to the runtime
- Temp file is cleaned up on process exit
- MCP config core: `packages/core/src/mcp/mcp-config.ts`
- CLI command: `tomomo mcp <agent> add/remove/list`
- Desktop: MCP tab in agent detail view
- VS Code: MCP section in agent config breadcrumb view

## Repo Structure

- npm workspaces monorepo
- `packages/core`: core business logic, types (Zod schemas), adapters, memory system, launch orchestration. Private package (`@tomomo/core`), never published. Used by all other packages.
- `packages/cli`: the CLI, published as `@tomomo/cli` on npm. Thin shell: commands, Ink TUI, bin entry point. Re-exports `@tomomo/core` for backward compatibility.
- `packages/ui`: shared React components, stores, hooks, styles, and IPC context. Private package (`@tomomo/ui`), never published. Used by both desktop and VS Code.
- `packages/desktop`: Electron + React + Vite + Tailwind v4 desktop app. Imports shared atoms from `@tomomo/ui`, owns its own page layouts and features.
- `packages/vscode`: VS Code sidebar extension. React webview with esbuild dual-target build (CJS for extension host, IIFE for webview). Imports shared atoms from `@tomomo/ui`.
- `packages/website`: Next.js 16.2 single hero page for tomomo.app. App Router, Turbopack, Tailwind v4. Animated character field, brand headline, download CTAs. Two components: `hero.tsx` and `characters.tsx` in `src/components/`. Imports shared atoms from `@tomomo/ui` via `transpilePackages`. Hosted on Vercel. Dark default.
- Only `packages/cli` is published to npm. Desktop, VS Code, and website have their own release pipelines.
- Internal packages (desktop, vscode, website) import from `@tomomo/core`, not `@tomomo/cli`.

## Shared UI Package (packages/ui)

- Private workspace package. Never published.
- Contains: atomic components (Button, Badge, Modal, Dropdown, Input, Select, Toast, ToggleGroup, Pill, Empty, SearchBar, CharacterSprite, TerminalView), stores (theme, toast, settings), hooks (useIpcQuery), styles (theme.css with CSS variables and Tailwind theme tokens), types (TerminalSession), lib (storage), and IPC context (UiIpc interface, IpcProvider, useUiIpc).
- Barrel export from `src/index.ts`. No `exports` field needed (private workspace package).
- Desktop provides `UiIpc` via Electron's preload bridge. VS Code provides `UiIpc` via postMessage. Website does not use IPC.
- Page-level layouts and features stay in each app package. Only leaf components and shared utilities belong in packages/ui.
- Tailwind v4 content detection: consumers MUST add `@source` pointing to `packages/ui/src` in their CSS entry point. Tailwind ignores workspace symlinks in node_modules by default.
- Website imports: server components must import UI atoms directly from their file path (e.g., `@tomomo/ui/src/components/button`) to avoid the barrel export pulling in client-only modules. Client components can use the barrel export (`@tomomo/ui`).

## VS Code Extension (packages/vscode)

- Editor panel via `WebviewPanel` opened in the right column (like Claude Code). Command `Tomomo: Open Here` (`tomomo.open`) with icon in editor title bar.
- Extension host (Node.js, CJS): imports `@tomomo/core` via dynamic import, manages PTY sessions via node-pty, handles all webview messages
- Webview (React, IIFE): postMessage-based IPC bridge, same design system as desktop
- Build: `esbuild.js` (CJS, standard VS Code pattern) with dual targets (extension CJS + webview IIFE with Tailwind PostCSS)
- Packaging: `npm run package` runs `scripts/package.js` which temporarily renames the package from `@tomomo/vscode` to `tomomo-vscode` for vsce (VS Code does not support scoped npm names), then reverts after packaging.
- Two views: Agents (hero detail with inline ToggleGroup tabs, compact icon sidebar for agent switching) and Hub (session pills + terminal switching)
- Config sections (Soul, Skills, MCP, Memory, Settings) render inline via ToggleGroup tabs within the agent detail view. All tabs stay mounted but hidden for state preservation.
- Theme detection: maps VS Code's `body.vscode-dark`/`body.vscode-light` to Tomomo's dark/light theme
