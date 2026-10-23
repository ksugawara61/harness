#!/bin/bash
# harness を clone（2 回目以降は更新）して、Claude Code の設定を配置する。
# コンテナの起動時（Claude Code on the web の環境のセットアップスクリプトなど）に、次の 1 行で呼ぶ。
#
#   curl -fsSL https://raw.githubusercontent.com/ksugawara61/harness/main/scripts/bootstrap.sh | bash
#
# 引数は scripts/install.sh にそのまま渡す（例: ... | bash -s -- --no-plugins）。
#   HARNESS_DIR  … clone 先（既定は ~/.harness）
#   HARNESS_REPO … clone 元（既定は https://github.com/ksugawara61/harness.git）
#   HARNESS_REF  … 取り込むブランチまたはタグ（既定は main）
set -eu

HARNESS_DIR="${HARNESS_DIR:-$HOME/.harness}"
HARNESS_REPO="${HARNESS_REPO:-https://github.com/ksugawara61/harness.git}"
HARNESS_REF="${HARNESS_REF:-main}"

if [ -d "$HARNESS_DIR/.git" ]; then
  # 手元の変更は消さない。変更があって更新できなければ、checkout が失敗して止まる
  git -C "$HARNESS_DIR" fetch --depth 1 origin "$HARNESS_REF"
  git -C "$HARNESS_DIR" checkout -q --detach FETCH_HEAD
else
  git clone -q --depth 1 --branch "$HARNESS_REF" "$HARNESS_REPO" "$HARNESS_DIR"
fi
echo "harness: $HARNESS_DIR ($(git -C "$HARNESS_DIR" rev-parse --short HEAD))"

exec "$HARNESS_DIR/scripts/install.sh" "$@"
