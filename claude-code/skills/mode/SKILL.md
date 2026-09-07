---
description: Bind a named bedrock mode (from the vault config's "modes" section) to this session. Usage — /bedrock:mode <mode-name>.
argument-hint: <mode-name>
disable-model-invocation: true
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/bedrock.js" mode "${CLAUDE_SESSION_ID}" "$ARGUMENTS"`

Confirm the mode binding result shown above.
