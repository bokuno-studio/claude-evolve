import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseEnvAssignment,
  resolveAnthropicApiKey,
  stripTrailingComment,
  unquoteEnvValue
} from "../hooks/reflection-agent.mjs";

test("parseEnvAssignment reads plain and exported ANTHROPIC_API_KEY values", () => {
  assert.equal(parseEnvAssignment("ANTHROPIC_API_KEY=sk-ant-plain\n", "ANTHROPIC_API_KEY"), "sk-ant-plain");
  assert.equal(
    parseEnvAssignment("export ANTHROPIC_API_KEY='sk-ant-exported'\n", "ANTHROPIC_API_KEY"),
    "sk-ant-exported"
  );
});

test("parseEnvAssignment ignores dynamic shell expressions", () => {
  assert.equal(
    parseEnvAssignment("export ANTHROPIC_API_KEY=$(op read op://vault/key)\n", "ANTHROPIC_API_KEY"),
    null
  );
});

test("stripTrailingComment preserves quoted hash characters", () => {
  assert.equal(stripTrailingComment("sk-ant-value # local key"), "sk-ant-value");
  assert.equal(stripTrailingComment("\"sk-ant-#-value\" # local key"), "\"sk-ant-#-value\"");
});

test("unquoteEnvValue removes matching shell quotes", () => {
  assert.equal(unquoteEnvValue("\"sk-ant-value\""), "sk-ant-value");
  assert.equal(unquoteEnvValue("'sk-ant-value'"), "sk-ant-value");
});

test("resolveAnthropicApiKey prefers process env over files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "reflection-agent-"));
  const envFile = path.join(dir, ".env");
  await writeFile(envFile, "ANTHROPIC_API_KEY=sk-ant-file\n");

  const result = await resolveAnthropicApiKey(
    { ANTHROPIC_API_KEY: "sk-ant-env" },
    [envFile]
  );

  assert.deepEqual(result, { apiKey: "sk-ant-env", source: "process.env" });
});

test("resolveAnthropicApiKey reads static values from env files", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "reflection-agent-"));
  const envFile = path.join(dir, ".env");
  await writeFile(envFile, "export ANTHROPIC_API_KEY=\"sk-ant-file\" # local key\n");

  const result = await resolveAnthropicApiKey({}, [envFile]);

  assert.equal(result.apiKey, "sk-ant-file");
  assert.equal(result.source, envFile);
});
