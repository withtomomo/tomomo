---
name: design-guidelines
description: Use when creating, modifying, or reviewing any UI component, screen, style, or visual element in the Tomomo desktop app, VS Code extension, or website. Also use when choosing colors, fonts, icons, spacing, or layout patterns.
---

# Tomomo Design System

## Core Philosophy

Bold flat color from agents. Clean neutral chrome. Super-rounded everything. No shadows on surfaces, no hover animations, no gradients. The UI is calm and flat. Agent colors are the only source of vibrancy.

Key rules:

- **Bold flat color.** Agent cards, sidebar selection, terminal headers, and launch buttons all use the agent's FULL color as background with white text. Not tinted, not washed out. The actual color.
- **Neutral chrome.** Everything that is not agent-colored uses the bg/fg scale. No accent colors on structural elements.
- **Characters are free.** Agent avatars render on transparent backgrounds. Never trapped inside grey boxes or containers.
- **No shadows on surfaces.** Cards, buttons, and containers have zero box-shadow. Shadows exist ONLY on floating overlays (dropdowns, modals, toasts).
- **No hover animations.** No translateY, no scale, no shadow changes on hover. Hover ONLY changes background color or opacity. Use `transition-colors duration-[120ms]` everywhere.
- **All buttons are pills.** Every single button uses rounded-full (9999px). No exceptions.
- **No borders.** Differentiation comes from background color contrast (bg-0 through bg-4), not borders or dividers.
- **No tabs.** Navigation uses action cards that open breadcrumb views, not tab bars.

## Onboarding Flow

The first-run experience lives in `@tomomo/ui` as `<OnboardingFlow />` and is shared byte-identically between desktop and vscode. It is a five-phase finite state machine (`loading` → `intro` → `starter` → `name` → `creating`).

### Phase 1: Intro narrative (6 steps)

Only shown on the user's first launch, gated by `introComplete` in `~/.tomomo/config.json`. Skippable via a "Skip intro" button top-right. Replayable later from Settings Help without rewriting persistence.

Layout for every intro step:

```
[step dots 1/6]                          [Skip intro]

            Tomo 180 px, centered, idle-animated

        [optional illustration row, real design-system atoms]

               Title (text-4xl, bold, tracking-tight)
              Body (text-lg, fg-2, max-width 440 px)

[Back ←]                            [Next → / Begin →]
```

- Tomo stays mounted across all 6 steps so the idle animation is continuous. No page transitions.
- Step progress dots: 22×4 px rounded-full pills. Active is indigo `#5B6CFF`, inactive is bg-3.
- Primary button is indigo full flat background, white text, rounded-full. Reads "Next" on steps 1-5, "Begin" on step 6.
- Back is `ghost` variant, disabled on step 1.
- Skip is a small text button top-right.
- Keyboard: Enter / Space / → advance, ← / Esc go back, handler ignores inputs and textareas.
- Illustrations use real `@tomomo/ui` atoms only (no custom SVG art, no gradients). Disable animation inside illustrations; only Tomo animates. Illustrations render at roughly 280-320 px wide.
- Step 1 has no illustration (Tomo alone).

### Phase 2: Starter pick

Three rounded-[28px] containers side by side. Fixed trio of colors from `STARTER_COLORS`, ordered left-to-right: Red `#FF5555`, Indigo `#5B6CFF` (center, default-selected), Gold `#DDBB00`. Seeds are random per-onboarding but colors and positions are locked. Indigo at index 1 lands in the default `selectedIndex = 1` hero slot so the brand accent gets the largest animated card.

- Selected container: 220×340 px, full agent color background, 104 px character, filled dot below
- Unselected: 160×260 px, muted background, 64 px character, empty dot
- Click or `←` / `→` arrow keys navigate, Enter selects
- Primary CTA "Choose this one" uses the selected agent's color as background
- Back from the name screen preserves the trio (seeds owned by the parent orchestrator)

### Phase 3: Name your agent

Standard form layout with:
- 160×160 px character circle at the top in the chosen agent's color
- Name input, prefilled with an auto-generated suggestion from `generateAgentName(seed)`, focused and pre-selected on mount
- Runtime Select, with three distinct states the component MUST handle:
  1. `runtimesLoaded === false`: render a "Loading runtimes..." placeholder, disable Create
  2. `runtimesLoaded && runtimes.length === 0`: render an error state "No runtimes installed. Install Claude Code, Codex, or Gemini CLI to continue." in bg-error/10 + text-error
  3. Normal: render the Select, enable Create once the user has picked
- Back (or Cancel in add-mode) on the left, primary CTA on the right using the chosen agent's color as background

### Add-agent screen

Same `NameYourAgent` form, wrapped in `<CreateAgentScreen />` with a Shuffle button top-right. Shuffle re-rolls the random seed, which regenerates the suggested name unless the user has already edited the field.

## Architecture: Two Views

### 1. Agent Hero

The primary view when "Agents" is active in the titlebar. The app auto-selects an agent and shows this view directly. The embedded chat panel is the dominant element. Two modes:

**Overview mode (default):**
- Big character sprite (72px, animated)
- Agent name: text-2xl bold, colored with the agent's color
- Description: fg-1
- Runtime badge: agent color bg, white text, rounded-full
- Model badge: similar styling
- Launch button: prominent, agent color bg, white text, rounded-full
- Stats in agent-color-tinted containers (8% color-mix)
- 2x2 action card grid: Soul, Skills, Memory, Settings. These are navigation destinations, not tabs. Each card is bg-1 background (neutral).
- Recent projects list below

**Breadcrumb mode:**
- When clicking Soul, Skills, Memory, or Settings, the hero collapses to a breadcrumb bar
- Breadcrumb bar contains: back button, mini character sprite, "AgentName / Section" text
- Full area below becomes the section content
- Back button returns to overview mode

**Right sidebar (~140px, bg-1):**
- Always visible in detail view for quick agent switching
- Shows compact agent list
- Selected agent: full agent color as background, white text
- Other agents: neutral background
- Sidebar has rounded-l-2xl shape

### 2. Hub

Full-width terminal grid. Active when "Hub" is selected in the titlebar.

- Each terminal card header uses the agent's FULL flat color as background (not a tint), white text
- Terminal body: xterm.js rendering real process output
- Resizable panels, drag to reorder
- Terminal card top corners: rounded-t-[18px]

## Titlebar

Always visible at the top of the app.

- **Left:** "tomomo" logo, text-base, font-bold, fg-1, tracking-tight
- **Center:** Agents/Hub pill toggle
  - Container: bg-bg-2, rounded-full, padding 3px
  - Active pill: bg-fg-1 (black in light mode), text-bg-0 (white), rounded-full
  - Inactive pill: transparent background, fg-3 text
  - Hub pill shows a running count badge when active sessions > 0
- **Right:** Settings gear icon button, rounded-full, ghost style

## Colors

### App Chrome (CSS Custom Properties)

Light mode (default):

```css
--bg-0: #ffffff;
--bg-1: #f5f5f7;
--bg-2: #ededf0;
--bg-3: #e2e2e7;
--bg-4: #d5d5dc;

--fg-1: #111111;
--fg-2: #555555;
--fg-3: #888888;
--fg-4: #b0b0b0;

--success: #22c586;
--warning: #f5a623;
--error: #f25c54;
--accent: #5b6cff;
--accent-hover: #4a5ae8;
```

Dark mode:

```css
--bg-0: #0c0c12;
--bg-1: #131319;
--bg-2: #1c1c25;
--bg-3: #262632;
--bg-4: #32323f;

--fg-1: #f0f0f5;
--fg-2: #a0a0b8;
--fg-3: #686880;
--fg-4: #484858;

--success: #5cb8a5;
--warning: #e8b44c;
--error: #e26856;
--accent: #7b8aff;
--accent-hover: #8e9bff;
```

### Agent Color Palette (8 Colors)

8 vibrant, maximally distinct colors. Every pair is instantly distinguishable at a glance. High saturation, medium lightness, works on both light and dark backgrounds.

```text
#FF5555  Red
#FF9922  Orange
#DDBB00  Gold
#44CC44  Green
#00BBAA  Teal
#5B6CFF  Indigo (brand accent)
#8844EE  Purple
#FF4488  Pink
```

Each agent gets one color from this palette, derived from its `seed` (UUID v4 stored in agent.json). The seed is generated at creation time and never changes, so renaming an agent does not affect its color. Fallback: `agent.seed || agent.id` for backward compatibility.

### Starter Trio (Onboarding)

The onboarding starter pick always shows three characters in a fixed subset of the palette, ordered left-to-right as they render on screen:

```text
#FF5555  Red       (left)
#5B6CFF  Indigo    (center, brand accent, default-selected)
#DDBB00  Gold      (right)
```

Defined as `STARTER_COLORS` in `packages/core/src/character/character.ts` and exported from the browser-safe `@tomomo/core/character` subpath. Indigo sits at index 1 so `StarterPick`'s default `selectedIndex = 1` places the brand accent in the center hero slot, providing visual continuity from the indigo Tomo narrator in the intro. The CLI uses the same trio and the same order, so the brand palette stays consistent across every surface. Enforced via the `genCharacter(seed, { color })` API extension rather than retry-sampling, so starter shapes remain random while colors and positions are locked.

### Bold Flat Color Usage

Where agent color appears as FULL solid background with white text:

- **Selected sidebar item:** full agent color background, white text
- **Terminal headers in hub:** full agent color background, white text
- **Runtime badge:** agent color background, white text, rounded-full
- **Launch button:** agent color background, white text, rounded-full

Where agent color appears as a tint:

- **Stats containers:** 8% agent color via `color-mix(in srgb, var(--agent-color) 8%, var(--bg-1))`
- **Agent hero name text:** `color: var(--agent-color)`

Where agent color does NOT appear:

- Action cards (bg-1, neutral)
- Chrome, borders, dividers, icons, status indicators
- Any general UI element

## Typography

**Outfit** for all UI text. **JetBrains Mono** for terminal and code. Two fonts only.

Load weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold).

Weight philosophy:

| Weight | Name     | Use                                              |
| ------ | -------- | ------------------------------------------------ |
| 700    | Bold     | Page titles, agent hero name, stat values ONLY   |
| 600    | SemiBold | Card names, section titles                       |
| 500    | Medium   | Buttons, labels, emphasis                        |
| 400    | Regular  | Body text, descriptions                          |

Font sizes:

| Token      | Size | Use                                |
| ---------- | ---- | ---------------------------------- |
| text-4xl   | 40px | Page titles, hero text             |
| text-3xl   | 32px | Section headings                   |
| text-2xl   | 24px | Agent detail hero name             |
| text-xl    | 20px | Subtitles, modal titles            |
| text-base  | 15px | Body text, descriptions            |
| text-sm    | 13px | UI labels, secondary text          |
| text-xs    | 11px | Captions, metadata                 |
| text-[10px]| 10px | Stat labels, badge text            |

Use `tracking-tight` on text-2xl and above.

## Icons

Lucide-react. Stroke weight: 1.75px. Round caps and joins. `currentColor`.

Never use emojis. Never use custom SVGs unless Lucide does not have the icon.

Three-dot menu icon: always `MoreVertical`, never horizontal dots.

Icon sizes:

| Size    | Pixels | Use                                     |
| ------- | ------ | --------------------------------------- |
| icon-xs | 14px   | Inside badges, compact buttons          |
| icon-sm | 16px   | Inside buttons, dropdown items          |
| icon-md | 18px   | Standalone inline                       |
| icon-lg | 20px   | Section headers, empty states           |
| icon-xl | 24px   | Large empty states, feature highlights  |

## Shapes (Border Radius)

| Element                        | Radius              | Value   |
| ------------------------------ | -------------------- | ------- |
| ALL buttons                    | rounded-full         | 9999px  |
| ALL pills and badges           | rounded-full         | 9999px  |
| Cards (grid, action, stat)     | rounded-2xl          | 20px    |
| Terminal card top corners      | rounded-t-[18px]     | 18px    |
| Dropdown menus                 | rounded-xl           | 22px    |
| Modals                         | rounded-2xl          | 28px    |
| Right sidebar                  | rounded-l-2xl        | 20px    |

Buttons are ALWAYS rounded-full. This is the most important shape rule. No rounded-lg, no rounded-xl on buttons. Only rounded-full.

## Shadows

No box-shadow on buttons, cards, or containers. Period.

Shadows exist ONLY on floating overlays:

| Element   | Shadow    |
| --------- | --------- |
| Dropdowns | shadow-lg |
| Modals    | shadow-xl |
| Toasts    | shadow-lg |

Nothing else gets a shadow.

## Borders

None. No borders on cards, inputs, containers, buttons, or any UI element. Differentiation comes from background color contrast (bg-0 vs bg-1 vs bg-2).

## Hover Behavior

The only thing hover does is change background color or opacity. That is it.

```
transition-colors duration-[120ms]
```

Never on hover:
- translateY (no lift)
- scale (no grow/shrink)
- box-shadow changes (no shadow escalation)
- filter changes (no brightness)

## Transitions

```css
--t-fast: 120ms ease;  // hover states, toggles
--t-base: 200ms ease;  // card interactions, theme switch
--t-slow: 300ms ease;  // layout changes
```

In Tailwind, use `duration-[120ms]` for hover states (not `duration-100`).

No page transitions. No fades between screens.

## Spacing

4px base unit. All spacing is a multiple of 4:

```text
4  8  12  16  20  24  32  40  48  64
```

## Component Height Scale

| Size | Height | Use                                           |
| ---- | ------ | --------------------------------------------- |
| sm   | 32px   | Compact contexts, sidebars, secondary actions |
| md   | 40px   | Default buttons, inputs, search bars          |
| lg   | 48px   | Primary actions, hero buttons                 |
| xl   | 56px   | Landing page hero buttons, prominent CTAs     |

Never mix heights at the same level. A button-sm and input-sm in the same row must both be 32px.

## Component Specs

### Buttons

All buttons: rounded-full, font-weight 500 (medium), line-height 1, no border, no shadow.

| Variant   | Background         | Text    | Hover             |
| --------- | ------------------ | ------- | ----------------- |
| primary   | fg-1               | bg-0    | opacity 0.88      |
| secondary | accent/10          | accent  | accent/20         |
| ghost     | transparent        | fg-2    | bg-2, text fg-1   |
| danger    | error/10           | error   | error bg, white   |
| agent     | var(--agent-color) | white   | opacity 0.88      |

Icon buttons: same height as text buttons, square (width = height), padding 0. Default: transparent background, fg-3 text. Hover: bg-2 background, fg-1 text.

Button with icon + text: gap 8px, icon size icon-sm (16px).

### Inputs

Background: bg-2. No border. rounded-full. Placeholder: fg-4 color. Font: medium weight.

Focus: bg-0 background + focus ring.

### Search Bar

Flex row: icon (fg-4, icon-sm) + input. Background: bg-2. rounded-full.

Focus-within: bg-0 + focus ring.

### Badges

Background: status color at 10% opacity. Text: status color. rounded-full.

Padding: 4px 10px. Font: 10px, bold (700). Line-height: 1.

Variants: default (bg-2/fg-2), accent, success, warning, error.

Agent runtime badge is special: agent color background, white text, rounded-full.

### Pills

Background: bg-2. Text: fg-2. rounded-full.

Padding: 5px 12px. Font: text-xs (11px), semibold (600).

### ToggleGroup (Titlebar Pill Toggle)

Container: bg-bg-2, rounded-full, padding 3px.

Active pill: bg-fg-1, text-bg-0, rounded-full.

Inactive pill: transparent, fg-3.

This pattern is used for the Agents/Hub switcher in the titlebar.

### AgentHero (Detail View)

Overview mode layout from top to bottom:
1. Compact identity header: character sprite (48px, animated), agent name (text-lg bold, agent color), description (fg-1)
2. Runtime and model badges inline (agent color bg, white text, rounded-full)
3. Stats inline in agent-color-tinted containers (8% color-mix)
4. AgentChat panel filling flex-1 of remaining space (the dominant element)

Action cards (Soul, Skills, Memory, Settings) have moved to the sidebar as "Configure" links. Recent projects are no longer in the hero. They are accessible via the Launch modal.

Breadcrumb mode: when clicking a Configure link in the sidebar, the hero collapses to a breadcrumb bar with back button + mini character + "AgentName / Section". Section content fills the remaining area.

### AgentChat (Chat Panel)

The primary way to interact with an agent. An embedded terminal session that runs the agent on its own config folder. Starts on demand (user clicks "Start chat"), not automatically.

The agent detects when it is new (empty or minimal soul.md) and automatically interviews the user to configure its personality. No separate setup mode. One prompt handles both new and existing agents.

Visual: bg-1, rounded-2xl, overflow-hidden. Shows a placeholder with character, agent name, and "Start chat" button before the session begins. Once started, the terminal IS the content. Fills flex-1 of its parent.

### AgentSidebar (Right Sidebar)

Width: ~140px. Background: bg-1. Shape: rounded-l-2xl.

Shows compact agent list for quick switching. Selected agent has full agent color background with white text. Unselected agents have neutral background.

Below the agent list, a "Configure" section with links: Soul, Skills, Memory, Settings. Clicking one triggers breadcrumb mode in the hero.

Always visible when in agent detail view.

### Cards (General)

Background: bg-1 for action cards, bg-0 for content cards. rounded-2xl (20px). No border. No shadow.

Hover: background color change only. No lift, no shadow.

### Dropdown Menu

Built with `@radix-ui/react-dropdown-menu`.

Container: bg-0, rounded-xl (22px), shadow-lg (floating overlay), padding 6px. Portal-rendered, z-50.

Item: rounded-[14px], padding 10px 14px, text-sm font-medium, fg-1. Icon: fg-3, 14px. Highlighted: `data-[highlighted]:bg-bg-2`.

Danger item: text-error, icon text-error, highlighted `data-[highlighted]:bg-error/10`.

Divider: 2px height, bg-bg-2, rounded-full, margin 4px horizontal.

### Modal (Dialog)

Built with `@radix-ui/react-dialog`.

Backdrop: fixed inset, bg-black/50, z-50.

Container: bg-0, rounded-2xl (28px), shadow-xl (floating overlay), max-width configurable. No animation.

Content area: `max-h-[70vh] overflow-y-auto` for scrollable content when the modal body exceeds viewport height.

Title: text-xl, font-semibold, fg-1.

Close button: top-right, 32px hit target, rounded-full, fg-3, hover bg-2.

Footer: flex row, justify-end, gap 8px. Cancel (ghost) + Action (primary/danger).

### Toast (Notification)

Built with `@radix-ui/react-toast`.

Container: bg-0, rounded-full (pill), shadow-lg (floating overlay), max-width 360px, padding 12px 16px. No animation.

Position: fixed bottom-right, 16px from edges, z-50.

Icon: 20px. CheckCircle (text-success), AlertCircle (text-error), Info (text-accent).

Auto-dismiss: 4 seconds.

Usage: `const { toast } = useToast()` then `toast({ title: "Done", variant: "success" })`.

### Tooltip

Background: fg-1. Text: bg-0. rounded-full. Padding: 8px 16px. Font: text-xs, semibold. Shadow: shadow-md.

### Runtime Management (Settings Modal)

The settings modal uses collapsible sections. Each section has a header row with a ChevronRight icon that rotates open/closed, built as a reusable `Section` component.

The Runtimes section shows all available runtimes (built-in, npm community, local drop-in).

Each runtime row: status dot (success/fg-4), name (text-sm fg-1), type badge (text-[10px] fg-3). Available runtimes show "installed" label. Unavailable runtimes show a "Copy install" pill button that copies the install command to clipboard. No inline monospace command text.

Community adapter install: input + "Install" button at the bottom. Uses accent variant.

### Runtime Missing (AgentChat)

When a runtime is not installed, the AgentChat shows a centered panel (bg-1, rounded-2xl) with: Terminal icon, runtime name, install command in monospace code block, "Learn more" link, and "Retry" button.

### Empty State

Centered placeholder. Icon (icon-xl, fg-4), title (text-base, semibold, fg-2), description (text-sm, fg-3). Optional action button below.

### Settings Help Section

The Settings modal (desktop) and Settings panel (vscode) both include a collapsible "Help" section at the bottom with a single row: "Replay intro" with a ghost "Replay" button. Clicking it closes Settings and opens `<OnboardingFlow forceIntro />` as an overlay. Replay never rewrites `introComplete`, the flag stays persisted as `true` throughout.

## Character Pixel Art and Animation

Characters animate with real pixel movement at 10 FPS. No CSS transforms, no opacity fading. Every frame modifies actual pixel positions in the grid. Animations only run when `animate={true}`.

The canonical algorithm lives in `packages/core/src/character/character.ts`.

Characters use canvas rendering (not SVG) for pixel-perfect display with `image-rendering: pixelated`. Transparent background always.

Character sizes:

| Context                     | Size  |
| --------------------------- | ----- |
| Sidebar compact             | 40px  |
| Hero overview               | 72px  |
| Breadcrumb mini             | 24px  |
| Onboarding starter selected | 104px |
| Onboarding starter idle     | 64px  |
| Onboarding name screen      | 72px  |
| Intro narrator (Tomo)       | 180px |

### Tomo, the brand mascot

Tomo is a dedicated character component wrapping `CharacterSprite`. The grid lives in `packages/ui/src/components/tomo-sprite.tsx` as `TOMO_GRID`, extracted pixel-exact from `assets/icon-dark.png` (12×13 native, padded to 18×18). Color is locked to indigo `#5B6CFF` and is not overridable. Eye cells are tagged as value `2` so the blink animation works. One intentional 1-pixel asymmetry at row 10 col 4 vs col 13 matches the brand icon; do not symmetrize it.

Use `<TomoSprite size={180} animate />` when you need the mascot anywhere (intro narrator, About screen, branded empty states). Do not regenerate Tomo from a seed; always use the fixed grid.

Animations (layered with independent random timers per character):

| Animation      | Description                                    | Timing                          |
| -------------- | ---------------------------------------------- | ------------------------------- |
| Idle bounce    | Shift all pixels up 1px, then back             | 2.4s cycle, up for 300ms        |
| Eye blink      | Fill eye pixels with body color                | Random 2.5-6.5s, 120ms, 25% double blink |
| Look around    | Shift eye pixels 1px left or right             | Random 6-16s, 600-1000ms       |
| Breathing      | Widen middle body rows by 1px each side        | 3.5s cycle, expanded for 1.2s  |
| Leg wiggle     | Shift leg pixels 1px left/right                | 2.8s cycle                      |
| Ear/horn bounce| Shift top features up 1px during bounce        | Synced with bounce              |
| Squash         | Widen bottom rows on landing                   | 200ms after bounce lands        |
| Stretch        | Shift top half up 1px during jump              | First 200ms of bounce           |
| Tail wag       | Shift tail pixels up/down 1px                  | 1.8s cycle                      |
| Happy eyes     | Eyes become ^ ^ squint                         | Random 15-40s, 800-1200ms      |

Animation pipeline composes on a grid copy each frame:
`bounce(stretch(squash(wiggle(look(blink(breathe(tailwag(base))))))))`

## Focus States

```css
// Light mode
box-shadow: 0 0 0 3px rgba(91, 108, 255, 0.25);

// Dark mode
box-shadow: 0 0 0 3px rgba(123, 138, 255, 0.3);
```

Applied via `box-shadow` on `:focus-visible`. No outline.

## Scrollbars

Thin, minimal, fade in on hover. Transparent by default.

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: transparent; border-radius: 9999px; }
*:hover > ::-webkit-scrollbar-thumb { background: var(--bg-3); }
```

## Tailwind Config Mapping

Colors defined as CSS custom properties for runtime theme switching:

```css
@theme {
  --font-sans: "Outfit", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --color-bg-0: var(--bg-0);
  --color-bg-1: var(--bg-1);
  --color-bg-2: var(--bg-2);
  --color-bg-3: var(--bg-3);
  --color-bg-4: var(--bg-4);
  --color-fg-1: var(--fg-1);
  --color-fg-2: var(--fg-2);
  --color-fg-3: var(--fg-3);
  --color-fg-4: var(--fg-4);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-error: var(--error);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
}
```

## Agent Color Tinting (CSS Patterns)

```css
// Agent name text in hero
color: var(--agent-color);

// Agent launch button (no shadow)
background: var(--agent-color);
color: #fff;

// Stats container (8% tint)
background: color-mix(in srgb, var(--agent-color) 8%, var(--bg-1));

// Selected sidebar agent (full color)
background: var(--agent-color);
color: #fff;

// Hub terminal header (full color)
background: var(--agent-color);
color: #fff;

// Runtime badge (full color)
background: var(--agent-color);
color: #fff;
border-radius: 9999px;
```

## Component Inventory

| Component         | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| AgentHero         | Primary view with overview + breadcrumb modes   |
| AgentChat         | Embedded terminal chat panel in hero view       |
| AgentSidebar      | Compact right sidebar for agent switching       |
| Titlebar          | Top nav with Agents/Hub pill toggle             |
| OnboardingFlow    | Shared 5-phase FSM: intro + starter + name      |
| CreateAgentScreen | Shared add-mode screen with Shuffle re-roll     |
| Button            | rounded-full, no shadows, transition-colors     |
| Badge             | rounded-full, semibold                          |
| SearchBar         | rounded-full, bg-2                              |
| DropdownMenu      | rounded-xl, shadow-lg (floating only)           |
| Modal             | rounded-2xl, shadow-xl (floating only)          |
| Toast             | rounded-full pill, shadow-lg (floating only)    |
| ToggleGroup       | rounded-full container + active/inactive pills  |
| CharacterSprite   | Transparent bg, canvas animated or SVG static   |
| TomoSprite        | Brand mascot wrapping CharacterSprite           |
| useRuntimes       | Hook: runtime status, install, community add    |
| Empty             | Centered placeholder state                      |

## What NOT to Do

- Add borders to anything
- Add box-shadow to buttons, cards, or containers
- Add translateY, scale, or shadow changes on hover
- Use emojis as icons
- Use gradients, glows, or blur effects
- Use tabs for navigation (use action cards and breadcrumbs instead)
- Use agent color tints where full color is expected (sidebar selection, terminal headers)
- Use full agent color where tints are expected (stats containers)
- Hard-code colors instead of CSS custom properties
- Use different fonts for headings vs body
- Mix component heights at the same level
- Use rounded-lg or rounded-xl on buttons (always rounded-full)
- Use MoreHorizontal for three-dot menus (always MoreVertical)
