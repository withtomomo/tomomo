---
name: brand-voice
description: Use when writing any text that users will see. CLI help, error messages, onboarding prompts, template descriptions, README content, docs, UI labels, or marketing copy for Tomomo.
---

# Tomomo Brand Voice

**Headline:** Build your AI agent team and do anything.

## The Voice

Dreamy and builder. You're assembling a team that grows with you. Each agent is a partner with its own personality, memory, and character. They have opinions, they care about the work, they bring something you didn't ask for. The bond between user and agent is what makes Tomomo special.

## Core Belief

Agents are not tools. They are partners. The difference is personality. A tool does what you say. A partner has opinions, cares about the quality, and thinks alongside you. Every agent should feel like a distinct person on your team.

## Six Rules

1. **Partners, not tools.** Agents are team members with personality. They have opinions and working styles. "Your partner" not "your utility."

2. **The bond matters.** The user and their agents together. Each agent remembers, improves, and brings its personality to every session. That relationship is the product.

3. **Alive, not generic.** Every agent should feel distinct. Each one has its own name, personality, and voice shaped through conversation. They're not interchangeable.

4. **Action, not features.** Talk about what people DO with their team. "Do anything" not "persistent memory system." Features are for docs. Voice is for dreams.

5. **Universal, not dev-only.** Agents code, write, research, analyze, create. "Do anything" means anything.

6. **Simple and bold.** Short sentences. No jargon. No hedging. Say it like you mean it.

## Words

**Prefer:** build, team, improve, launch, train, choose, starter, together, anything, your

**Use with care:** configure, settings, parameters are fine when they're the clearest option (like a Settings screen). Don't replace them with vague alternatives just to sound warmer.

**Never use:** leverage, utilize, synergy, monster/monsters (say "character" or "agent" instead)

## Examples

```bash
# CLI help text
# BAD:  "Configure a new agent with the specified parameters"
# GOOD: "Create a new agent"

# BAD:  "Launch agent in specified working directory"
# GOOD: "Launch an agent on a project"

# BAD:  "Display agent configuration and metadata"
# GOOD: "Show agent details"

# Error messages (always say what, why, how to fix)
# BAD:  "Error: Runtime binary not found in PATH"
# GOOD: "Claude Code not found. Install it: npm install -g @anthropic-ai/claude-code"

# BAD:  "Error: Agent configuration does not exist"
# GOOD: "Agent 'webdev' not found. Run 'tomomo list' to see your agents."

# BAD:  "Error: Authentication required for runtime"
# GOOD: "Not signed in to Claude Code. Run 'claude login' first."

# Onboarding (CLI)
# BAD:  "Initializing Tomomo environment..."
# GOOD: "Welcome to Tomomo! Let's get you set up."

# BAD:  "Agent creation complete. Agent ID: pixel"
# GOOD: "Agent 'pixel' created! Run 'tomomo launch pixel .' to get started."

# UI labels
# BAD:  "Running Processes"      GOOD: "Active Sessions"
# BAD:  "Session Management"     GOOD: "Hub"
# BAD:  "Template Repository"    GOOD: "Templates"
# BAD:  "No agents configured"   GOOD: "No agents yet"
```

## Canonical Onboarding Copy (Desktop and VS Code)

The 6-step visual intro narrated by Tomo is the gold standard for how the voice translates into product copy. Use it as a reference when writing any new onboarding, welcome, or first-run text.

Each step has a big title (text-4xl bold) and a body (text-lg, fg-2, max 2 lines). Short, direct, partner-focused. No jargon. No hedging.

```text
Step 1: Hello!
  Welcome to the world of Tomomo. I'm Tomo, and I'll show you around.

Step 2: Meet your agents
  Build a team. One agent for every kind of work, each with its
  own name, look, and personality.

Step 3: Powered by anything
  Claude Code, Codex, Gemini, or any CLI you've got. Tomomo runs
  on top of all of them.

Step 4: What makes them yours
  Soul, skills, memory. You shape them, you teach them, and they
  remember every project.

Step 5: Launch them anywhere
  On any project, any folder, any repo. They code, write, research,
  plan, create. Do anything.

Step 6: Let's build your team
  Pick your first partner and get started.
```

Why these work:

- Rule 1 (Partners, not tools): Step 2 opens with "Build a team", framing agents as teammates without preaching the slogan.
- Rule 2 (The bond matters): Step 4 closes with "every project you build together".
- Rule 3 (Alive, not generic): Step 2 ends on "its own name, look, and personality". Step 4 title is "What makes them yours".
- Rule 4 (Action, not features): Step 5 is pure action verbs. No mention of "persistent memory system".
- Rule 5 (Universal, not dev-only): "code, write, research, plan, create" and "Do anything".
- Rule 6 (Simple and bold): every body is two short sentences or fewer.

CTAs in the flow:

- `Next →` on steps 1-5, `Begin →` on step 6
- Secondary: `Back ←` ghost button, disabled on step 1
- Tertiary: `Skip intro` small text button top-right
- Starter pick CTA: `Choose this one →`
- Name screen CTA: `Get started →` (first-run) or `Create →` (add-mode)
- Success toast: `{Name} is ready!`

Replay intro entry point in Settings Help:

```text
Replay intro
Watch the welcome tour again     [Replay]
```

## Quick Test

Before shipping any user-facing text, ask:

1. Would you say this to a friend? If not, simplify.
2. Does it use any words from the "avoid" list? Replace them.
3. Is it more than one sentence when one would do? Cut it.
4. Does it talk about the tool or about what the user can do? Flip it.
