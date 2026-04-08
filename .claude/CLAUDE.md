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

## Onboarding

- First-run flow: `@tomomo/ui`'s `<OnboardingFlow />` renders a 6-step visual intro narrated by Tomo (the brand mascot), then a 3-character starter pick of three random agents with distinct colors, then a name-your-agent screen with a prefilled editable name from `generateAgentName(seed)`, then creates the agent via a parent-supplied callback. Used by desktop and vscode; CLI has its own Ink-based terminal onboarding that reuses `generateAgentName` for the name prefill.
- Persistence: `~/.tomomo/config.json` has two flags. `onboardingComplete` means tomomo dirs have been initialized. `introComplete` means the visual intro has been seen or skipped. Both are in `GlobalConfigSchema`. Read via `hasSeenIntro()` / written via `markIntroComplete()` from `@tomomo/core`. `runOnboarding()` sets both, so CLI users do not see the visual intro when they later open desktop or vscode.
- Migration: `loadConfig` has a read-side default that sets `introComplete` from `onboardingComplete` when the field is missing from an older config, so existing users do not see the intro on upgrade. No version bump.
- Replay: Settings has a "Replay intro" button in the Help section. Clicking it opens `<OnboardingFlow forceIntro />` as an overlay. Replay never writes to `introComplete`. The flag stays persisted as `true` throughout.
- Tomo: the brand mascot. Grid lives in `packages/ui/src/components/tomo-sprite.tsx` as `TOMO_GRID`, extracted pixel-exact from `assets/icon-dark.png` (12x13 native, padded to 18x18). Color locked to indigo `#5B6CFF`. Rendered via `<TomoSprite />` wrapping the existing `CharacterSprite` animation pipeline. Eye cells are tagged as value `2` for blink animation. One intentional 1-pixel asymmetry at row 10 col 4 vs col 13 matches the brand icon; do not symmetrize it.
- Starter trio: three random characters with distinct colors. The orchestrator (`generateDistinctStarterSeeds` in `packages/ui/src/features/onboarding/onboarding-flow.tsx`, and the equivalent loop in `packages/cli/src/ui/screens/onboarding.tsx`) rolls random UUID seeds and keeps the ones whose `genCharacter(seed).color` has not been seen yet, stopping at three. No color override: `genCharacter(seed)` is pure seed in, color out, so the color the user sees on the starter card is exactly the color the agent will have after creation. The center column (`selectedIndex = 1`) is the default-selected hero slot. Do NOT reintroduce a `STARTER_COLORS` constant or a color override on `genCharacter`: the previous fixed-trio implementation was the root cause of a bug where a starter previewed as indigo but the created agent ended up green, because the preview forced a color that the final agent derivation did not know about.
- Name generation: `AGENT_NAMES` in `packages/core/src/character/names.ts` is a curated ~150-name list with hard rules (2-5 chars, `/^[A-Z][a-z]+$/`, no trademarks, no recognizable franchise characters). `generateAgentName(seed)` uses a FNV-1a hash separate from the character RNG so name and shape do not correlate predictably.

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
- `packages/core`: core business logic, types (Zod schemas), adapters, memory system, launch orchestration. Private package (`@tomomo/core`), never published. Used by all other packages. Ships two entry points. The default `@tomomo/core` is Node-only and used by the CLI, desktop main process, and vscode extension host. The `@tomomo/core/character` subpath is browser-safe and used by `@tomomo/ui`, the desktop renderer, and the vscode webview. It re-exports `CHARACTER_PALETTE`, `genCharacter`, `AGENT_NAMES`, and `generateAgentName`. Runtime values imported into a renderer or webview MUST come from `@tomomo/core/character` to avoid pulling Node deps into the browser bundle. Type-only imports from `@tomomo/core` are always safe.
- `packages/cli`: the CLI, published as `@tomomo/cli` on npm. Thin shell: commands, Ink TUI, bin entry point. Re-exports `@tomomo/core` for backward compatibility.
- `packages/ui`: shared React components, stores, hooks, styles, and IPC context. Private package (`@tomomo/ui`), never published. Used by both desktop and VS Code.
- `packages/desktop`: Electron + React + Vite + Tailwind v4 desktop app. Imports shared atoms from `@tomomo/ui`, owns its own page layouts and features.
- `packages/vscode`: VS Code sidebar extension. React webview with esbuild dual-target build (CJS for extension host, IIFE for webview). Imports shared atoms from `@tomomo/ui`.
- `packages/website`: Next.js 16.2 single hero page for tomomo.app. App Router, Turbopack, Tailwind v4. Animated character field, brand headline, download CTAs. Two components: `hero.tsx` and `characters.tsx` in `src/components/`. Imports shared atoms from `@tomomo/ui` via `transpilePackages`. Hosted on Vercel. Dark default.
- Only `packages/cli` is published to npm. Desktop, VS Code, and website have their own release pipelines.
- Internal packages (desktop, vscode, website) import from `@tomomo/core`, not `@tomomo/cli`.

## Shared UI Package (packages/ui)

- Private workspace package. Never published.
- Contains: atomic components (Button, Badge, Modal, Dropdown, Input, Select, Toast, ToggleGroup, Pill, Empty, SearchBar, CharacterSprite, TomoSprite, TerminalView), stores (theme, toast, settings), hooks (useIpcQuery), styles (theme.css with CSS variables and Tailwind theme tokens), types (TerminalSession), lib (storage), and IPC context (UiIpc interface, IpcProvider, useUiIpc).
- Also contains the shared onboarding feature at `src/features/onboarding/` (`OnboardingFlow`, `CreateAgentScreen`, plus internal intro step + illustration components). Used by both desktop and vscode via the root barrel. This is the one exception to the "only leaf components and shared utilities" rule: the whole onboarding FSM lives here because it must be byte-identical across both apps.
- Barrel export from `src/index.ts`. No `exports` field needed (private workspace package).
- `UiIpc` has three namespaces: required `terminal`, optional `intro` (hasSeen / markSeen), optional `character` (seed-based `preview(seed)`). Desktop provides all three via Electron's preload bridge; vscode provides all three via postMessage. Website uses terminal-free consumers only.
- Page-level layouts and features stay in each app package. Only leaf components, shared utilities, and the shared onboarding feature belong in packages/ui.
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
