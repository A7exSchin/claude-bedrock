---
description: Show what bedrock vault context is currently configured and active for this session (core files, matched project, bound mode, session notes).
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/bedrock.js" status "${CLAUDE_PROJECT_DIR}" "${CLAUDE_SESSION_ID}"`

Show the status above to the user as-is. Don't re-fetch or reinterpret it.
