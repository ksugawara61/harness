---
name: sync-main
description: "main ブランチを origin/main に fast-forward で追従する。「main を最新化して」「main 更新して」「main の最新取って」など、main ブランチの更新を依頼されたときに使う。"
---

# sync-main

## 概要

main ブランチを origin/main に追従する。`git fetch origin main && git merge --ff-only origin/main` を実行するのみ。

**前提条件:**

- 対象リポジトリの中で実行していること
- 現在 main ブランチにいること（いない場合は `git switch main` してから実行）

## 手順

```bash
git fetch origin main && git merge --ff-only origin/main
```

出力の `Fast-forward` / `Already up to date` を確認して完了を報告する。
