// Browser-safe client entry point for the character subpath.
//
// This file is intentionally the ONLY surface that @tomomo/ui, desktop renderer,
// and vscode webview code should import for runtime character values. It must
// never import anything that touches Node-only APIs (fs, path, child_process,
// etc.) or the renderer bundle will break.
//
// If you add a new export here, double-check its import graph is clean.
export { CHARACTER_PALETTE, STARTER_COLORS, genCharacter } from "./character";
export type { GenCharacterOptions } from "./character";
export { AGENT_NAMES, generateAgentName } from "./names";
