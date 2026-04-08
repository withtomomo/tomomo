# @tomomo/core

Core business logic for Tomomo. Private package, never published to npm.

Contains: agent CRUD, memory system, character generation, adapter interface, launch orchestration, MCP config, project management, Zod schemas, and all shared types.

Used by: `@tomomo/cli`, `@tomomo/desktop`, `@tomomo/vscode`, `@tomomo/website`.

## Entry points

### `@tomomo/core` (default, Node-only)

The full package. Safe for the CLI, desktop main process, and vscode extension host. Do not import this entry from any code that runs in a browser, Electron renderer, or webview. It pulls in `fs`, `path`, `child_process`, and other Node modules.

### `@tomomo/core/character` (browser-safe)

A tight subset re-exporting only runtime values that are provably free of Node dependencies. Safe for `@tomomo/ui`, the desktop Electron renderer, and the vscode webview. Source of truth: `src/character/index.ts`.

Exports:

- `CHARACTER_PALETTE`: the 8 canonical agent colors
- `genCharacter(seed)`: seeded character generator. The color is picked from `CHARACTER_PALETTE` by the seed's RNG and never overridden, so the previewed color on the onboarding starter pick always matches the final agent color after creation
- `AGENT_NAMES`: curated list of short names used by auto-name generation
- `generateAgentName(seed)`: deterministic hash of seed into `AGENT_NAMES`, used to prefill the agent-name field on both onboarding and add-agent flows

When you add a new export here, double-check its import graph does not touch any Node API.

## Onboarding helpers

- `hasSeenIntro()` / `markIntroComplete()`: read and write the `introComplete` flag in the global config. Used by desktop and vscode via IPC to decide whether to show the visual intro on first launch.
- `runOnboarding()`: initializes the `~/.tomomo` directory structure and marks both `onboardingComplete` and `introComplete` as `true`. Called by the CLI after terminal onboarding so CLI users do not see the visual intro when they later open desktop or vscode.

Existing users with `onboardingComplete: true` and no `introComplete` field in their on-disk config are migrated on read: `loadConfig` defaults the missing field from `onboardingComplete`, so upgrades never force the intro on someone who already completed it.
