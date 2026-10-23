#!/bin/bash
# pnpm のプロジェクト（ルートに pnpm-lock.yaml がある）では npx を使わせず、pnpm dlx / pnpm exec に寄せる。
# agpr のスキルは npx で CLI を呼ぶため、@ksugawara61/agpr だけは許す。
COMMAND=$(jq -r '.tool_input.command // empty')

if [ ! -f "${CLAUDE_PROJECT_DIR:-.}/pnpm-lock.yaml" ]; then
  exit 0
fi

if echo "$COMMAND" | grep -qE '(^|[[:space:]])npx([[:space:]]|$)' && ! echo "$COMMAND" | grep -q '@ksugawara61/agpr'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "npx is blocked in this pnpm project. Use pnpm dlx / pnpm exec instead."
    }
  }'
fi
exit 0
