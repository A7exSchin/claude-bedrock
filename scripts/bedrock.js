#!/usr/bin/env node
'use strict';

// bedrock.js — single CLI used both as the SessionStart hook (subcommand "hook")
// and as the backend for the /bedrock:* skills. Reads the same config schema as
// pi-bedrock.json so the two tools can point at one file.

const fs = require('fs');
const path = require('path');
const os = require('os');

const MEMORY_FILE_CAP = 8;

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function resolveConfigPath() {
  const candidates = [
    process.env.CLAUDE_BEDROCK_CONFIG,
    process.env.PI_BEDROCK_CONFIG,
    path.join(os.homedir(), '.pi', 'agent', 'pi-bedrock.json'),
    path.join(os.homedir(), '.claude', 'bedrock.json'),
  ]
    .filter(Boolean)
    .map(expandHome);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadConfig() {
  const configPath = resolveConfigPath();
  if (!configPath) return { configPath: null, config: null, error: null };
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return { configPath, config: JSON.parse(raw), error: null };
  } catch (err) {
    return { configPath, config: null, error: err.message };
  }
}

function pluginDataDir() {
  return process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), '.claude', 'plugins-data', 'bedrock');
}

function sessionStatePath(sessionId) {
  return path.join(pluginDataDir(), 'sessions', `${sessionId || 'unknown'}.json`);
}

function readState(sessionId) {
  try {
    const state = JSON.parse(fs.readFileSync(sessionStatePath(sessionId), 'utf8'));
    if (!Array.isArray(state.ephemeral)) state.ephemeral = [];
    return state;
  } catch {
    return { mode: null, ephemeral: [] };
  }
}

function writeState(sessionId, state) {
  const statePath = sessionStatePath(sessionId);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function resolveFile(base, rel) {
  const abs = path.isAbsolute(rel) || rel.startsWith('~') ? expandHome(rel) : path.join(base, rel);
  const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
  return { rel, abs, exists };
}

function listMemoryFiles(base, rel) {
  const dir = path.isAbsolute(rel) || rel.startsWith('~') ? expandHome(rel) : path.join(base, rel);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const abs = path.join(dir, f);
      return { rel: path.join(rel, f), abs, exists: true, mtime: fs.statSync(abs).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MEMORY_FILE_CAP);
}

function matchProjects(cwd, config) {
  if (!cwd || !Array.isArray(config.projects)) return [];
  const resolvedCwd = path.resolve(cwd);
  return config.projects.filter((project) => {
    if (!project.path) return false;
    const projectPath = path.resolve(expandHome(project.path));
    return resolvedCwd === projectPath || resolvedCwd.startsWith(projectPath + path.sep);
  });
}

function buildTiers(config, cwd, state) {
  const vault = expandHome(config.vault);
  const tiers = [];

  if (Array.isArray(config.core) && config.core.length) {
    tiers.push({ label: 'Core', items: config.core.map((f) => resolveFile(vault, f)) });
  }

  for (const project of matchProjects(cwd, config)) {
    const base = project.root ? expandHome(project.root) : vault;
    const items = (project.files || []).map((f) => resolveFile(base, f));
    if (project.memory) items.push(...listMemoryFiles(base, project.memory));
    tiers.push({ label: `Project: ${project.name || project.path}`, items });
  }

  if (state.mode && config.modes && config.modes[state.mode]) {
    const items = (config.modes[state.mode].files || []).map((f) => resolveFile(vault, f));
    tiers.push({ label: `Mode: ${state.mode}`, items });
  }

  return tiers;
}

function renderInject(config, cwd, state) {
  const tiers = buildTiers(config, cwd, state);
  const parts = [];
  for (const tier of tiers) {
    const body = tier.items
      .filter((i) => i.exists)
      .map((i) => `### ${i.rel}\n\n${fs.readFileSync(i.abs, 'utf8').trim()}`)
      .join('\n\n');
    if (body) parts.push(`## ${tier.label}\n\n${body}`);
  }
  if (state.ephemeral.length) {
    parts.push(`## Session notes\n\n${state.ephemeral.map((n) => `- ${n}`).join('\n')}`);
  }
  if (!parts.length) return '';
  return `# Vault Context (bedrock)\n\n${parts.join('\n\n')}\n`;
}

function renderList(config, cwd, state, configPath) {
  const lines = [
    '# Bedrock — configured context',
    '',
    `Config: ${configPath}`,
    `Vault: ${expandHome(config.vault)}`,
    '',
  ];
  const tiers = buildTiers(config, cwd, state);
  for (const tier of tiers) {
    lines.push(`## ${tier.label}`);
    for (const item of tier.items) lines.push(`- ${item.exists ? '●' : '?'} ${item.rel}`);
    lines.push('');
  }

  const matchedNames = new Set(matchProjects(cwd, config).map((p) => p.name || p.path));
  for (const project of config.projects || []) {
    if (matchedNames.has(project.name || project.path)) continue;
    lines.push(`## Project: ${project.name || project.path} — ○ inactive (cwd doesn't match ${project.path})`);
  }
  for (const modeName of Object.keys(config.modes || {})) {
    if (modeName === state.mode) continue;
    lines.push(`## Mode: ${modeName} — ○ not bound`);
  }

  lines.push('', `## Session notes (${state.ephemeral.length})`);
  for (const note of state.ephemeral) lines.push(`- ${note}`);
  return lines.join('\n');
}

function readStdinJson() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  const { configPath, config, error } = loadConfig();

  if (cmd === 'hook') {
    if (!config) return; // no config configured yet — stay silent, don't break session start
    const input = readStdinJson();
    const state = readState(input.session_id);
    const out = renderInject(config, input.cwd, state);
    if (out) process.stdout.write(out);
    return;
  }

  if (!config) {
    console.log(
      'No bedrock config found. Checked CLAUDE_BEDROCK_CONFIG, PI_BEDROCK_CONFIG, ' +
        '~/.pi/agent/pi-bedrock.json, ~/.claude/bedrock.json.' +
        (error ? `\nLast error while reading a candidate: ${error}` : '')
    );
    return;
  }

  if (cmd === 'status') {
    const [cwd, sessionId] = rest;
    const state = readState(sessionId);
    const tiers = buildTiers(config, cwd, state);
    const activeFiles = tiers.reduce((n, t) => n + t.items.filter((i) => i.exists).length, 0);
    console.log(`Bedrock config: ${configPath}`);
    console.log(`Vault: ${expandHome(config.vault)}`);
    console.log(`Active tiers: ${tiers.map((t) => t.label).join(', ') || 'none'}`);
    console.log(`Active files: ${activeFiles}`);
    console.log(`Bound mode: ${state.mode || 'none'}`);
    console.log(`Session notes: ${state.ephemeral.length}`);
    return;
  }

  if (cmd === 'list') {
    const [cwd, sessionId] = rest;
    console.log(renderList(config, cwd, readState(sessionId), configPath));
    return;
  }

  if (cmd === 'add') {
    const [sessionId, ...textParts] = rest;
    const text = textParts.join(' ').trim();
    if (!text) {
      console.log('Usage: /bedrock:add <note text>');
      return;
    }
    const state = readState(sessionId);
    state.ephemeral.push(text);
    writeState(sessionId, state);
    console.log(`Added session note (${state.ephemeral.length} total): ${text}`);
    return;
  }

  if (cmd === 'clear') {
    const [sessionId] = rest;
    const state = readState(sessionId);
    const count = state.ephemeral.length;
    state.ephemeral = [];
    writeState(sessionId, state);
    console.log(`Cleared ${count} session note(s).`);
    return;
  }

  if (cmd === 'mode') {
    const [sessionId, ...nameParts] = rest;
    const modeName = nameParts.join(' ').trim();
    if (!modeName) {
      console.log('Usage: /bedrock:mode <mode-name>');
      return;
    }
    if (!config.modes || !config.modes[modeName]) {
      console.log(`Unknown mode "${modeName}". Available: ${Object.keys(config.modes || {}).join(', ') || 'none configured'}`);
      return;
    }
    const state = readState(sessionId);
    state.mode = modeName;
    writeState(sessionId, state);
    console.log(`Bound mode "${modeName}" to this session. Applies now and after every future compaction.`);
    return;
  }

  if (cmd === 'reload') {
    const [cwd, sessionId] = rest;
    const state = readState(sessionId);
    console.log(`Reloaded config from ${configPath}.\n`);
    console.log(renderInject(config, cwd, state) || '(nothing matched for this cwd)');
    return;
  }

  console.log(`Unknown bedrock subcommand: ${cmd}`);
}

main();
