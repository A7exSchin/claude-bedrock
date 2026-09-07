# bedrock

Compaction-proof context injection for coding agents — reads a set of markdown files from
a knowledge vault and injects them into the session so long-running work doesn't lose
context that matters. Two implementations, one per tool, sharing a single config schema:

| | [`pi/`](pi/) | [`claude-code/`](claude-code/) |
|---|---|---|
| Tool | [Pi](https://github.com/earendil-works/pi) | [Claude Code](https://claude.com/product/claude-code) |
| Mechanism | `before_agent_start` hook, re-injects every turn | `SessionStart` hook, injects on `startup`/`resume`/`clear`/`fork`/`compact` |
| Install | `pi install git:github.com/A7exSchin/bedrock` (path resolution TBD post-rename — see below) | `/plugin install bedrock@a7exschin-plugins` |
| Config env var | `PI_BEDROCK_CONFIG` | `CLAUDE_BEDROCK_CONFIG`, falling back to `PI_BEDROCK_CONFIG` |

Both point at the same `pi-bedrock.json` file, so editing one config keeps both tools in
sync. See each subdirectory's own README for implementation details, and
[`pi-bedrock.example.json`](pi/pi-bedrock.example.json) for the config schema.

## Why one repo

These were two separate repos (`pi-bedrock`, `claude-bedrock`) until they were fused here
via `git subtree` (history from both preserved — see `pi/`'s and `claude-code/`'s original
commits in `git log`). Pi is still in active use (against a self-hosted LiteLLM instance,
not the Claude subscription), so this isn't a "retire one, keep the other" situation — it's
one concept with two maintained implementations, and one repo is the right home for that:
config schema changes get made (and documented) in one place instead of coordinated across
two repos, even though the actual code — Pi's TypeScript/Vitest extension vs. Claude Code's
plain-JS plugin — stays fully separate in its own subdirectory.

## Repo rename in progress

This repo is being renamed from `claude-bedrock` to `bedrock` to match. Once that's done,
the `a7exschin-plugins` marketplace entry and the `pi install` URL above need updating to
the new repo name.

## License

MIT (each subdirectory's own `LICENSE`/`package.json` is the authoritative source per tool).
