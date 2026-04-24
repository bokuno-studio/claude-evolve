#!/usr/bin/env node
/**
 * Stop hook: analyzes session transcript and appends insights to ~/.claude/evolve/insights.md
 * v1 safety constraint: NEVER modifies CLAUDE.md
 */

import { readFile, appendFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSIGHTS_DIR = path.join(homedir(), ".claude", "evolve");
const INSIGHTS_PATH = path.join(INSIGHTS_DIR, "insights.md");
const PROMPT_PATH = path.join(__dirname, "..", "prompts", "analyze-transcript.md");
const MIN_MESSAGES = 10;
const MAX_TRANSCRIPT_CHARS = 40_000;

async function main() {
  const input = await readStdin();
  if (!input) return;

  const transcriptPath = resolveTranscriptPath(input);
  if (!transcriptPath) return;

  let raw;
  try {
    raw = await readFile(transcriptPath, "utf8");
  } catch {
    return;
  }

  const turns = parseJsonl(raw);
  const dialogTurns = turns.filter(t => t.type === "user" || t.type === "assistant");

  if (dialogTurns.length < MIN_MESSAGES) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    process.stderr.write("[reflection-agent] ANTHROPIC_API_KEY not set\n");
    return;
  }

  const promptTemplate = await readFile(PROMPT_PATH, "utf8");
  const transcript = buildReadableTranscript(dialogTurns);
  const prompt = promptTemplate.replace("{{TRANSCRIPT}}", transcript.slice(0, MAX_TRANSCRIPT_CHARS));

  const insights = await callClaude(apiKey, prompt);
  if (!insights || insights.length === 0) return;

  await writeInsights(insights, input.session_id ?? "unknown");
  process.stderr.write(`[reflection-agent] wrote ${insights.length} insight(s)\n`);
}

function resolveTranscriptPath(input) {
  if (input.transcript_path) return input.transcript_path;

  // Issue #3019 workaround: reconstruct from session_id
  if (input.session_id) {
    const slug = process.cwd().replace(/^\//, "").replace(/\//g, "-");
    return path.join(homedir(), ".claude", "projects", slug, `${input.session_id}.jsonl`);
  }

  return null;
}

function parseJsonl(raw) {
  return raw
    .split("\n")
    .filter(l => l.trim())
    .flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
}

function extractText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .filter(b => b?.type === "text")
    .map(b => b.text ?? "")
    .join("\n")
    .trim();
}

function buildReadableTranscript(turns) {
  return turns
    .map(t => {
      const role = t.type === "user" ? "USER" : "CLAUDE";
      const text = extractText(t.message?.content).slice(0, 800);
      return text ? `[${role}]: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n\n");
}

async function callClaude(apiKey, prompt) {
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });

    const text = response.content[0]?.text ?? "";
    // Try to extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    process.stderr.write(`[reflection-agent] API error: ${e.message}\n`);
    return null;
  }
}

async function writeInsights(insights, sessionId) {
  await mkdir(INSIGHTS_DIR, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const shortId = String(sessionId).slice(0, 8);
  const header = `\n## ${date} | ${shortId}\n`;
  const lines = insights
    .map(i => `- [${i.type}|${i.confidence}] ${i.insight}`)
    .join("\n");

  await appendFile(INSIGHTS_PATH, header + lines + "\n");
}

function readStdin() {
  return new Promise(resolve => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(data)); } catch { resolve(null); }
    });
    process.stdin.on("error", () => resolve(null));
  });
}

main()
  .catch(e => process.stderr.write(`[reflection-agent] fatal: ${e.message}\n`))
  .finally(() => process.exit(0));
