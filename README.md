# bedrock

Compaction-proof context injection for coding agents — reads a set of markdown files from
a knowledge vault and injects them into the session so long-running work doesn't lose
context that matters. Two implementations, one per tool, sharing a single config schema:

| | [`pi/`](pi/) | [`claude-code/`](claude-code/) |
|---|---|---|
| Tool | [Pi](https://github.com/earendil-works/pi) | [Claude Code](https://claude.com/product/claude-code) |
| Mechanism | `before_agent_start` hook, re-injects every turn | `SessionStart` hook, injects on `startup`/`resume`/`clear`/`fork`/`compact` |
| Config env var | `BEDROCK_CONFIG` (`PI_BEDROCK_CONFIG` still works as a fallback) | same `BEDROCK_CONFIG` (`CLAUDE_BEDROCK_CONFIG`/`PI_BEDROCK_CONFIG` still work as fallbacks) |

Both point at the same `pi-bedrock.json` file — set `BEDROCK_CONFIG` once and both tools
pick it up, no per-tool config needed. See each subdirectory's own README for
implementation details, and [`pi-bedrock.example.json`](pi/pi-bedrock.example.json) for the
config schema.

## Installing

**Pi**:

```bash
pi install git:github.com/A7exSchin/bedrock
```

**Claude Code**, via the [a7exschin-plugins](https://github.com/A7exSchin/a7exschin-plugins)
marketplace, which points at `claude-code/` here with a `git-subdir` source:

```
/plugin marketplace add A7exSchin/a7exschin-plugins
/plugin install bedrock@a7exschin-plugins
```

## Why one repo

These were two separate repos (`pi-bedrock`, `claude-bedrock`) until they were fused here
via `git subtree` (history from both preserved — see `pi/`'s and `claude-code/`'s original
commits in `git log`) and the combined repo renamed from `claude-bedrock` to `bedrock` to
match. Pi is still in active use (against a self-hosted LiteLLM instance, not the Claude
subscription), so this isn't a "retire one, keep the other" situation — it's one concept
with two maintained implementations, and one repo is the right home for that: config schema
changes get made (and documented) in one place instead of coordinated across two repos, even
though the actual code — Pi's TypeScript/Vitest extension vs. Claude Code's plain-JS plugin
— stays fully separate in its own subdirectory.

## Versioning

One repo, one state, one version: `pi/package.json` and `claude-code/.claude-plugin/plugin.json`
always carry the same version number, tagged once as `vX.Y.Z` — not two separate tags per
side. `.github/workflows/release.yml` enforces this: it fails the build if the two files
disagree, and cuts the single tag + GitHub Release when either changes.

Continues Pi's pre-fuse version lineage (`pi-bedrock` reached v0.3.0 as a standalone repo;
v0.4.0 is the first release from the fused repo). The five `pi-bedrock-v0.1.0`–`v0.3.0` tags
that predate the fuse are kept as-is — legacy markers from when Pi was the only
implementation, not part of the ongoing scheme.

## License

MIT (each subdirectory's own `LICENSE`/`package.json` is the authoritative source per tool).
