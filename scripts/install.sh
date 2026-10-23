#!/bin/bash
# harness の Claude Code の設定を、ユーザー設定（~/.claude）に配置する。
#
#   - claude/rules/*.md  … ~/.claude/rules/ にシンボリックリンクする（git pull で更新が反映される）
#   - claude/settings.json … ~/.claude/settings.json にマージする（オブジェクトは再帰的に、配列は和集合でマージし、値は harness 側を優先する）
#   - .claude-plugin/marketplace.json … このディレクトリをマーケットプレイス harness として登録し、プラグインを入れる
#
# ~/.claude には履歴やセッションなどの実行時データも置かれるため、ディレクトリごとではなく項目単位で配置する。
# settings.json は claude plugin install が書き込むため、シンボリックリンクにせず実ファイルにする。
#
# 使い方: scripts/install.sh [--no-plugins]
#   CLAUDE_CONFIG_DIR … 配置先（既定は ~/.claude）
#   HARNESS_PLUGINS   … 入れるプラグイン（空白区切り。既定は marketplace.json の全プラグイン）
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/claude"
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
MARKETPLACE="harness"

install_plugins=1
for arg in "$@"; do
  case "$arg" in
    --no-plugins) install_plugins=0 ;;
    -h | --help)
      sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "不明な引数です: $arg" >&2
      exit 2
      ;;
  esac
done

link() {
  local src="$1" dest="$2"
  if [ -L "$dest" ]; then
    ln -sfn "$src" "$dest"
  elif [ -e "$dest" ]; then
    echo "skip: $dest は既に存在します（手動で退避してから再実行してください）" >&2
    return
  else
    ln -s "$src" "$dest"
  fi
  echo "link: $dest -> $src"
}

install_rules() {
  mkdir -p "$DEST/rules"
  # harness から消えたルールへのリンクを外す
  local item target
  for item in "$DEST/rules"/*; do
    if [ -L "$item" ] && [ ! -e "$item" ]; then
      target="$(readlink "$item")"
      case "$target" in
        "$SRC/rules/"*)
          rm "$item"
          echo "unlink: $item（$target は削除されました）"
          ;;
      esac
    fi
  done
  for item in "$SRC/rules"/*.md; do
    link "$item" "$DEST/rules/$(basename "$item")"
  done
}

# オブジェクトは再帰的に、配列は重複を除いた和集合でマージする。それ以外の値は harness 側を優先する
MERGE_FILTER='
def merge($a; $b):
  if ($a | type) == "object" and ($b | type) == "object" then
    reduce ($b | keys_unsorted[]) as $k ($a; .[$k] = merge($a[$k]; $b[$k]))
  elif ($a | type) == "array" and ($b | type) == "array" then
    reduce ($a + $b)[] as $x ([]; if any(.[]; . == $x) then . else . + [$x] end)
  elif $b == null then $a
  else $b
  end;
merge($existing; $harness[0])
'

install_settings() {
  local dest="$DEST/settings.json" existing tmp
  # リンク先が消えたシンボリックリンク（移動前の dotfiles を指すものなど）は、無いものとして扱う
  if [ -L "$dest" ] && [ ! -e "$dest" ]; then
    rm "$dest"
  fi
  if [ ! -e "$dest" ]; then
    cp "$SRC/settings.json" "$dest"
    echo "copy: $dest"
    return
  fi
  if ! command -v jq >/dev/null 2>&1; then
    echo "skip: jq が無いため $dest にマージできません" >&2
    return
  fi
  # 以前のシンボリックリンク（dotfiles の install-claude.sh など）は、リンク先の内容をもとに実ファイルにする
  existing="$(cat "$dest")"
  tmp="$(mktemp)"
  jq -n --argjson existing "$existing" --slurpfile harness "$SRC/settings.json" \
    "$MERGE_FILTER" >"$tmp"
  rm -f "$dest"
  mv "$tmp" "$dest"
  echo "merge: $dest"
}

install_plugins() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "skip: claude コマンドが無いため、プラグインを入れません" >&2
    echo "      claude plugin marketplace add $ROOT で登録してから入れてください" >&2
    return
  fi
  claude plugin marketplace add "$ROOT"
  # 登録済みのときは、git pull した内容を読み直す
  claude plugin marketplace update "$MARKETPLACE"
  local plugins="${HARNESS_PLUGINS:-}" plugin
  if [ -z "$plugins" ]; then
    plugins="$(jq -r '.plugins[].name' "$ROOT/.claude-plugin/marketplace.json")"
  fi
  for plugin in $plugins; do
    claude plugin install "$plugin@$MARKETPLACE" --scope user
  done
}

mkdir -p "$DEST"
install_rules
install_settings
if [ "$install_plugins" = 1 ]; then
  install_plugins
fi
