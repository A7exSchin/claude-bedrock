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

**Pi** (path resolution TBD post-rename, see below):

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

Both implementations release under the same version number, continuing Pi's pre-fuse
version lineage (`pi-bedrock` reached v0.3.0 as a standalone repo; the first release from
this fused repo is v0.4.0). A shared version doesn't mean every release changes both sides —
it just means whichever side changes, the number moves for both, so "what's the current
bedrock version" always has one unambiguous answer. Each side still gets its own tag on the
same commit — `pi-bedrock-vX.Y.Z` for Pi (matching CI in `.github/workflows/release-pi.yml`,
which watches `pi/package.json`), `bedrock--vX.Y.Z` for Claude Code (`claude plugin tag`,
which validates `claude-code/.claude-plugin/plugin.json`'s version).

## License

MIT (each subdirectory's own `LICENSE`/`package.json` is the authoritative source per tool).
