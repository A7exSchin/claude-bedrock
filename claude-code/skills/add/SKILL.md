---
description: Add an ephemeral, session-scoped note to bedrock context. Usage — /bedrock:add <note text>.
argument-hint: <note text>
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/bedrock.js" add "${CLAUDE_SESSION_ID}" "$ARGUMENTS"`

Confirm the note was added. Don't add commentary beyond that.
