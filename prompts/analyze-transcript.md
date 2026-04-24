You are analyzing a Claude Code session transcript to extract reusable insights for future sessions.

Extract insights in these categories:
- **feedback**: User explicitly corrected Claude's behavior ("don't do X", "stop Y", "I said Z not W")
- **preference**: User's consistent choices about style, tooling, communication
- **workflow**: Sequences or patterns that worked well or caused friction
- **error_fix**: Error that occurred and how it was resolved (high priority — always capture these)

Rules:
- Only extract insights that are reusable across future sessions (not session-specific facts like "the bug was on line 42")
- Each insight must be a single, context-free declarative statement
- Skip greetings, simple acknowledgments, and trivial exchanges
- Confidence levels: "high" = explicit user correction or stated preference, "medium" = inferred from behavior pattern, "low" = speculation

Return ONLY a JSON array. No prose, no markdown wrapper around the JSON itself.
If nothing meaningful was found, return an empty array.

Format:
[
  {"type": "feedback", "confidence": "high", "insight": "User wants X when Y"},
  {"type": "error_fix", "confidence": "high", "insight": "When error X occurs, fix by doing Y"},
  {"type": "preference", "confidence": "medium", "insight": "User prefers X over Y for Z tasks"}
]

TRANSCRIPT:
{{TRANSCRIPT}}
