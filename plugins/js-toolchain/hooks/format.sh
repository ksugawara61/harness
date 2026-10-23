#!/bin/bash
# Write / Edit したファイルに、プロジェクトに入っている oxlint の自動修正と oxfmt の整形を掛ける。
# oxlint・oxfmt はプロジェクトの node_modules にあるものだけを使い、無ければ何もしない。
# 設定はプロジェクトのもの（.oxlintrc.json・oxfmt の設定）を読む。

file_path=$(jq -r '.tool_input.file_path // empty')
if [ -z "$file_path" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
bin=node_modules/.bin

# JS / TS は oxlint の自動修正（キーの並べ替えなど）をかけてから oxfmt で整形する
if [[ "$file_path" =~ \.(js|mjs|cjs|ts|mts|cts|jsx|tsx)$ ]]; then
  if [ -x "$bin/oxlint" ]; then
    "$bin/oxlint" --fix --no-error-on-unmatched-pattern "$file_path" >/dev/null 2>&1
  fi
  if [ -x "$bin/oxfmt" ]; then
    "$bin/oxfmt" --no-error-on-unmatched-pattern "$file_path" 2>&1
  fi
elif [[ "$file_path" =~ \.(json|jsonc|graphql)$ ]] && [ -x "$bin/oxfmt" ]; then
  "$bin/oxfmt" --no-error-on-unmatched-pattern "$file_path" 2>&1
fi

exit 0
