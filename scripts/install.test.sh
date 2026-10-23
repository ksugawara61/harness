#!/bin/bash
# scripts/install.sh と scripts/bootstrap.sh を、一時ディレクトリを配置先にして確かめる。
# プラグインの導入は claude コマンドとネットワークが要るため、--no-plugins で外す。
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

failures=0
pass() { echo "ok: $1"; }
fail() {
  echo "not ok: $1" >&2
  failures=$((failures + 1))
}
check() {
  local name="$1"
  shift
  if "$@"; then pass "$name"; else fail "$name"; fi
}

run_install() {
  CLAUDE_CONFIG_DIR="$1" "$ROOT/scripts/install.sh" --no-plugins >/dev/null 2>&1
}

rule_count="$(find "$ROOT/claude/rules" -maxdepth 1 -name '*.md' | wc -l)"

# 配置先が空なら、ルールをリンクし settings.json をコピーする
dest="$WORK/fresh"
run_install "$dest"
check "ルールを 1 つずつリンクする" \
  test "$(find "$dest/rules" -maxdepth 1 -type l | wc -l)" -eq "$rule_count"
check "リンク先は harness のルール" \
  test "$(readlink "$dest/rules/typescript.md")" = "$ROOT/claude/rules/typescript.md"
check "settings.json はリンクではなく実ファイル" test ! -L "$dest/settings.json"
check "settings.json は harness と同じ内容" \
  test "$(jq -S . "$dest/settings.json")" = "$(jq -S . "$ROOT/claude/settings.json")"

# 2 回目も同じ結果になる
run_install "$dest"
check "再実行しても settings.json は変わらない" \
  test "$(jq -S . "$dest/settings.json")" = "$(jq -S . "$ROOT/claude/settings.json")"

# 既存の settings.json にはマージし、既存のルールのファイルは上書きしない
dest="$WORK/existing"
mkdir -p "$dest/rules"
echo "自分のルール" >"$dest/rules/typescript.md"
ln -s "$ROOT/claude/rules/removed.md" "$dest/rules/removed.md"
cat >"$dest/settings.json" <<'EOF'
{
  "model": "sonnet",
  "permissions": { "allow": ["Bash(ls:*)", "Bash(make:*)"] },
  "theme": "dark"
}
EOF
run_install "$dest"
check "既存のルールのファイルは上書きしない" \
  test "$(cat "$dest/rules/typescript.md")" = "自分のルール"
check "harness から消えたルールへのリンクは外す" test ! -L "$dest/rules/removed.md"
check "harness に無いキーは残す" test "$(jq -r .theme "$dest/settings.json")" = "dark"
check "値は harness 側を優先する" \
  test "$(jq -r .model "$dest/settings.json")" = "$(jq -r .model "$ROOT/claude/settings.json")"
check "配列は和集合にする" \
  test "$(jq '[.permissions.allow[] | select(. == "Bash(make:*)" or . == "Bash(ls:*)")] | length' "$dest/settings.json")" -eq 2
check "配列の重複は除く" \
  test "$(jq '.permissions.allow | length == (unique | length)' "$dest/settings.json")" = "true"

# リンク先が消えた settings.json のシンボリックリンクは、harness の内容で置き換える
dest="$WORK/broken"
mkdir -p "$dest"
ln -s "$WORK/missing/settings.json" "$dest/settings.json"
run_install "$dest"
check "リンク先が消えた settings.json は harness の内容で置き換える" \
  test "$(jq -S . "$dest/settings.json")" = "$(jq -S . "$ROOT/claude/settings.json")"

# bootstrap.sh は clone して install.sh を呼び、2 回目は更新する
repo="$WORK/repo"
mkdir -p "$repo"
cp -R "$ROOT/scripts" "$ROOT/claude" "$ROOT/.claude-plugin" "$repo/"
git -C "$repo" init -q -b main
git -C "$repo" -c user.name=test -c user.email=test@example.com add -A
git -C "$repo" -c user.name=test -c user.email=test@example.com commit -qm init
bootstrap() {
  HARNESS_DIR="$WORK/clone" HARNESS_REPO="$repo" HARNESS_REF=main CLAUDE_CONFIG_DIR="$WORK/bootstrap" \
    bash "$ROOT/scripts/bootstrap.sh" --no-plugins >/dev/null 2>&1
}
bootstrap
check "bootstrap.sh は clone したルールをリンクする" \
  test "$(readlink "$WORK/bootstrap/rules/typescript.md")" = "$WORK/clone/claude/rules/typescript.md"
echo "# 追加" >"$repo/claude/rules/added.md"
git -C "$repo" -c user.name=test -c user.email=test@example.com add -A
git -C "$repo" -c user.name=test -c user.email=test@example.com commit -qm add
bootstrap
check "bootstrap.sh の再実行で更新を取り込む" test -L "$WORK/bootstrap/rules/added.md"

if [ "$failures" -gt 0 ]; then
  echo "$failures 件失敗しました" >&2
  exit 1
fi
echo "すべて成功しました"
