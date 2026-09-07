# bedrock (Claude Code plugin)

Compaction-proof vault context for Claude Code, ported from the Pi coding agent
extension [pi-bedrock](https://github.com/A7exSchin/pi-bedrock). Injects
configured markdown files from a knowledge vault at session start and again
after every compaction, so long-running sessions never lose the context that
matters.

## Architecture

Unlike pi-bedrock's `before_agent_start` hook (which re-injects every turn),
this plugin uses a `SessionStart` hook. `SessionStart` fires on `startup`,
`resume`, `clear`, `compact`, and `fork` — critically including `compact` —
so context is refreshed exactly when it would otherwise be lost, not on every
message. This is cheaper in tokens and needs no manual re-injection logic.

- `hooks/hooks.json` — registers `scripts/bedrock.js hook` on `SessionStart`.
- `scripts/bedrock.js` — the only piece of logic. Reads the config, resolves
  which tiers apply to the current `cwd`, and either prints markdown (`hook`,
  `reload`) or a status report (`status`, `list`).
- `skills/*/SKILL.md` — thin wrappers around `bedrock.js` subcommands, exposed
  as `/bedrock:status`, `/bedrock:list`, `/bedrock:add`, `/bedrock:clear`,
  `/bedrock:mode`, `/bedrock:reload`. Plugin skills are always namespaced
  (`/plugin-name:skill-name`), so there's no bare `/bedrock` — that's a
  Claude Code constraint, not a design choice.
- Session-scoped state (bound mode, ephemeral notes) is written to
  `${CLAUDE_PLUGIN_DATA}/sessions/<session_id>.json` and read back in on
  every `SessionStart` firing, including `compact` — so anything added mid
  session survives compaction automatically.

## Config compatibility with pi-bedrock

This plugin reads the **exact same JSON schema** as `pi-bedrock.json` — same
`vault`, `core`, `projects` (`path`, `name`, `files`, `memory`, `root`), and
`modes` fields. Point it at the same file pi used and both tools stay in
sync. Config path resolution, in order:

1. `$CLAUDE_BEDROCK_CONFIG`
2. `$PI_BEDROCK_CONFIG` (if you already export this for Pi, zero extra setup)
3. `~/.pi/agent/pi-bedrock.json`
4. `~/.claude/bedrock.json`

One difference from pi-bedrock: a project's `memory` directory is scanned for
`.md` files directly inside it (non-recursive), sorted by most-recently
modified, and the 8 most recent are inlined in full. Adjust `MEMORY_FILE_CAP`
in `scripts/bedrock.js` if you want a different cutoff.

## Setup

```bash
export CLAUDE_BEDROCK_CONFIG=~/GitLib/codeberg/dev.a7exschin.knowledge/_config/pi-bedrock.json
```

(or reuse `PI_BEDROCK_CONFIG` if it's already set for Pi.)

## Local development

```bash
claude --plugin-dir ~/GitLib/Github/claude-bedrock
```

After editing skills/hooks, run `/reload-plugins` inside the session instead
of restarting.

Test the CLI directly without Claude Code:

```bash
node scripts/bedrock.js status <cwd> <session-id>
node scripts/bedrock.js list <cwd> <session-id>
node scripts/bedrock.js add <session-id> "some note"
```

## Ideas / not yet built

- Auto-inject the most recent note from a project's `03-agents/02-sessions/` into
  the "Project" tier, the same way `memory` already scans and injects the most
  recent `.md` files from a memory directory. This was previously a manual
  instruction in the vault's (now-removed) `ai-bootstrap.md` — "read the latest
  session note for open threads" — dropped rather than kept as unautomated policy
  text, since automating it mechanically is exactly what bedrock is for.

## Installing for real use

Once it's working, either keep using `--plugin-dir` (add it to a shell alias
for `claude`), or turn this repo into a minimal marketplace so `/plugin
install` works normally — add `.claude-plugin/marketplace.json` at the repo
root listing this plugin, then `/plugin marketplace add <path-or-url>` and
`/plugin install bedrock@<marketplace-name>`.
