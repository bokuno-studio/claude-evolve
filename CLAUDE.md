# claude-evolve

Claudeの設定（CLAUDE.md・スキル・エージェント構成）を自己進化させるメタシステム。

## ゴール

1. **自動蒸留**: セッション終了時にトランスクリプトを解析し、繰り返しパターンをCLAUDE.md・スキルに自動反映
2. **スキル自己進化**: スキル自体も改善対象。使用状況に応じて定義を更新
3. **プロジェクト型エージェント自動生成**: 「新プロジェクト始めるよ」→ 内容を聞いて最適なチームを自動構築

## アーキテクチャ

```
Layer 1: 観察
  Stop hook → reflection-agent（Claude API）
       ↓
  トランスクリプト全体を解析

Layer 2: 分類・蒸留
  ├── 原則・禁止事項 → ~/.claude/CLAUDE.md（圧縮・統合）
  ├── ワークフロー   → ~/.claude/skills/<name>/SKILL.md（更新）
  └── エージェント構成 → ~/.claude/project-types/<type>.md（テンプレ進化）

Layer 3: プロジェクト初期化（将来）
  「新プロジェクト」検出 → ヒアリング → project-types/ から最適構成を生成
```

## ディレクトリ構成

```
claude-evolve/
  hooks/
    reflection-agent.mjs   # Stop hookから呼ばれるメインスクリプト
  prompts/
    classify.md            # パターン分類プロンプト
    compress-claude-md.md  # CLAUDE.md圧縮プロンプト
    evolve-skill.md        # スキル改善プロンプト
    evolve-project-type.md # エージェント構成改善プロンプト
  project-types/           # プロジェクト種別ごとのエージェント構成テンプレ
    web-app.md
    bot.md
    data-pipeline.md
  scripts/
    init-project.mjs       # 新プロジェクト初期化（Layer 3）
```

## 既存インフラ

### Stop hook（既に動いてる）

`~/.claude/settings.json` の `hooks.Stop` に登録済み:
```
node /Volumes/Extreme SSD/dev/personal-memory-mcp/hooks/stop-hook.mjs
```

現在はユーザーの判断ターンをSQLiteに保存するだけ。
**このhookを拡張するか、並列で別hookを追加するかを最初に決める。**

### 既存スキル（進化対象）

```
~/.claude/skills/
  startup-cons-eval/SKILL.md     # cons-evalプロジェクト用チーム定義
  startup-training-coach-bot/SKILL.md  # training-coach-bot用チーム定義
  qa/SKILL.md                    # 動作確認スキル
```

`startup-cons-eval` と `startup-training-coach-bot` は構造が類似しているが別ファイル。
project-types/に共通パターンを蒸留し、プロジェクト固有情報だけを差分として持つ設計にしたい。

### CLAUDE.md（進化対象）

`~/.claude/CLAUDE.md` → `~/.claude/standards/CLAUDE.md` のシムリンク
実体: `/Users/naoki/.claude/standards/CLAUDE.md`（GitHub管理）

圧縮・更新後は `git commit & push` まで自動でやる。

### personal-memory-mcp

- Stop hook: `/Volumes/Extreme SSD/dev/personal-memory-mcp/hooks/stop-hook.mjs`
- MCPサーバー: `mcp__personal-memory-mcp__save_memory` / `search_memory`
- DB: `~/.personal-memory/memory.db`（SQLite + sqlite-vec）

## 実装順序

### Step 1: reflection-agent（最初にここから）

Stop hookから呼ばれ、トランスクリプトを解析してCLAUDE.mdとスキルを更新するスクリプト。

**入力**: トランスクリプト全文（JSONLines形式）
**処理**:
1. Claude APIでトランスクリプトを解析
2. 抽出されたパターンを分類（原則/ワークフロー/エージェント構成）
3. 対象ファイルを読む → 更新 → 保存
4. CLAUDE.mdが長すぎる場合は圧縮
5. standards リポジトリにコミット・プッシュ

**呼び出し方**（Stop hookに追記）:
```bash
node /Volumes/Extreme SSD/dev/claude-evolve/hooks/reflection-agent.mjs
```

**制約**:
- Claude APIを使う（`ANTHROPIC_API_KEY` は環境変数から）
- CLAUDE.mdは**200行以内**を死守。超えたら圧縮
- スキルファイルは自由に長くしてよい（個別ファイルなので）
- 更新は**追記ではなく書き換え**（蒸留・統合が原則）

### Step 2: project-types/ の初期定義

既存の `startup-cons-eval` と `startup-training-coach-bot` を分析して共通パターンを抽出し、`project-types/web-app.md` と `project-types/bot.md` の雛形を作る。

### Step 3: 新プロジェクト初期化フロー

「新プロジェクト始めるよ」を検出 → project-types/ を参照して最適チームを生成。

## 注意事項

- reflection-agentは**荒削りでいい**。精度より動くことを優先
- 壊れても手動で直せるようにgit管理を徹底
- standards リポジトリへのpushは `git push origin main`（force不要）
- CLAUDE.mdの書き換えは**原則・禁止事項セクションを最優先で残す**
