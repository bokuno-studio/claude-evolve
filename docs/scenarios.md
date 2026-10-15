# claude-evolve QA シナリオ

## シナリオ: reflection-agent 基本動作（正常系）
- 前提: Stop hook が発火し、トランスクリプトファイル（JSONLines形式）が渡される
- 操作: `node hooks/reflection-agent.mjs <transcript-path>` を実行する
- 期待結果: Claude API を呼び出してトランスクリプトを解析し、パターンを分類する

## シナリオ: CLAUDE.md 更新（正常系）
- 前提: トランスクリプトから「原則・禁止事項」に関するパターンが抽出された
- 操作: reflection-agent が ~/.claude/CLAUDE.md を読み込んで更新処理を行う
- 期待結果: CLAUDE.md が**書き換え**（追記ではなく）で更新される。200行以内に収まる

## シナリオ: CLAUDE.md 圧縮（正常系）
- 前提: CLAUDE.md が 200行を超えている
- 操作: reflection-agent が圧縮プロンプト（prompts/compress-claude-md.md）を使って圧縮する
- 期待結果: 200行以内に圧縮され、原則・禁止事項セクションが保持されている

## シナリオ: スキル更新（正常系）
- 前提: トランスクリプトから既存スキル（qa/SKILL.md など）の改善パターンが抽出された
- 操作: reflection-agent が対象スキルファイルを読んで更新する
- 期待結果: スキルファイルが書き換えられる。行数制限なし

## シナリオ: standards リポジトリへのコミット・プッシュ（正常系）
- 前提: CLAUDE.md またはスキルファイルが更新された
- 操作: reflection-agent が git add/commit/push を実行する
- 期待結果: `git push origin main` が成功し、エラーなし

## シナリオ: ANTHROPIC_API_KEY 未設定（異常系）
- 前提: 環境変数 `ANTHROPIC_API_KEY` が未設定
- 操作: `node hooks/reflection-agent.mjs <transcript-path>` を実行する
- 期待結果: 明確なエラーメッセージを出力してプロセスが終了（例外をキャッチして適切に処理）

## シナリオ: トランスクリプトファイル不在（異常系）
- 前提: 渡されたトランスクリプトファイルパスが存在しない
- 操作: reflection-agent を存在しないパスで実行する
- 期待結果: エラーログを出力してプロセスが終了（Stop hook 全体を壊さない）

## シナリオ: Stop hook への組み込み（統合）
- 前提: `~/.claude/settings.json` に reflection-agent が Stop hook として登録されている
- 操作: Claude Code のセッションを終了する
- 期待結果: personal-memory-mcp の stop-hook と reflection-agent の両方が順番に実行される

## シナリオ: project-types/ 雛形生成（Step 2）
- 前提: startup-cons-eval/SKILL.md と startup-training-coach-bot/SKILL.md が存在する
- 操作: 共通パターンを抽出して project-types/web-app.md と project-types/bot.md を生成する
- 期待結果: 両ファイルが生成され、プロジェクト固有情報が差分として切り出されている
