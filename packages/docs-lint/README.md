# docs-lint

Markdown 文書を textlint・markdownlint・本文の文字数上限で検査する CLI `docs-lint` を提供するパッケージ。
textlint は、既存文書の違反を段階的に直せるよう、既定では変更で追加・書き換えた行の指摘だけを報告する。

## インストール

Node.js 22 以上で動く。textlint の preset と markdownlint-cli2 はこのパッケージの依存として入るため、利用側で入れる必要はない。

```bash
pnpm add -D @ksugawara61/docs-lint
```

`package.json` の `scripts` に足して使う。

```json
{ "scripts": { "lint:docs": "docs-lint" } }
```

## 使い方

```bash
docs-lint                  # origin/main から変更した文書の、追加・書き換えた行だけを検査する
docs-lint <file...>        # 指定した文書のうち、変更した行だけを検査する
docs-lint --base=<ref>     # 比較元を変える
docs-lint --all [file...]  # 変更の有無によらず全行を検査する（既存違反の棚卸し・修正用）
docs-lint --fix <file...>  # 指定した文書の自動修正できる指摘を全行直して書き込み、残る指摘を表示する
```

markdownlint と文字数の上限は、textlint と同じ対象の文書に掛かる。
ただし変更行ではなく、文書全体を検査する（文字数は本文を数える）。
`--fix` は markdownlint の自動修正を書き込んでから textlint の自動修正を書き込む。文字数は検査しない。

カレントディレクトリをリポジトリのルートとして扱う。
対象は Git が追跡する `*.md` と、未追跡（ignore されていない）の `*.md`。
除外する文書はルートの `.textlintignore` と、`.markdownlint-cli2.jsonc` の `ignores` に書く。

CI で変更行だけを検査するときは、比較元のブランチを取得しておく（GitHub Actions なら `actions/checkout` に `fetch-depth: 0`）。

## プロファイル

textlint の preset の組み合わせは、このパッケージが「プロファイル」として持つ。

| プロファイル | preset                                                          | 向いている文書                                        |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------- |
| `technical`  | `preset-ja-technical-writing`・`@textlint-ja/preset-ai-writing` | 技術文書・README・手順書                              |
| `blog`       | `technical` の 2 つ ＋ `preset-ai-words-ja`                     | AI が書いた文章に多い単語を避けたい文書（ブログ記事） |

プロファイルの textlintrc は `profiles/textlint/<名前>.json` にある。

## markdownlint のルール

markdownlint（markdownlint-cli2）のルールは `profiles/markdownlint.jsonc` にある。
既定ルールをすべて有効にし、日本語の文書に合わない 8 ルールだけを外す。
markdownlint-cli2 は、リポジトリルートの `.markdownlint-cli2.jsonc` を設定として読む。
そこでプロファイルを `extends` で参照し、除外する文書を `ignores` に書く。

```jsonc
// .markdownlint-cli2.jsonc
{
  "config": {
    "extends": "./node_modules/@ksugawara61/docs-lint/profiles/markdownlint.jsonc",
  },
  "ignores": ["**/README.mdx"],
}
```

VS Code の markdownlint 拡張も同じファイルを読むため、エディタと CLI のルールがそろう。

## 設定ファイル

ルートの `docs-lint.config.json` に、どのディレクトリをどのプロファイルで検査するかを書く。
どのディレクトリに何字の上限を掛けるかも、同じファイルに書く。
ファイルが無ければ、すべての文書を `technical` で検査し、文字数の上限は掛けない。

```json
{
  "charLimit": {
    "overrides": [{ "dir": "posts/", "max": 8000 }]
  },
  "textlint": {
    "overrides": [{ "dir": "posts/", "profile": "blog" }],
    "profile": "technical"
  }
}
```

- `textlint.profile`：`overrides` に当てはまらない文書のプロファイル。省略すると `technical`。
- `textlint.overrides`：`dir`（ルートからの相対パス）配下の文書を `profile` で検査する。
  先に書いたものが優先される。`dir` の末尾の `/` は省略できる。
- `charLimit.overrides`：`dir` 配下の文書の本文を `max` 字までにする。
  先に書いたものが優先され、どれにも当てはまらない文書には上限を掛けない。
  超えると `docs-lint` が文書のパス・文字数・上限を表示して exit 1 になる。

## 文字数の数え方

先頭の YAML front matter（`---` で囲んだ部分）を除いた本文を数える。
Markdown の記法とコードブロックを除き、空白を詰めたテキストのコードポイント数を文字数とする。
数え方は `@ksugawara61/docs-lint/char-limit` が export する `toPlainText`・`countBodyChars`・`stripFrontMatter` にある。
ブログの読了時間や抜粋など、利用側でも同じ数え方を使える。

## ライブラリとしての利用

`@ksugawara61/docs-lint` は、変更一覧の扱いに使う関数も export する。

- `parseGitNameStatus`：`git diff --name-status` の出力を変更一覧にする
- `mergeUntrackedChanges`：未追跡のファイルを、追加として変更一覧に足す
- `selectChangedDocs`：変更一覧から検査対象の文書（削除されていない `*.md`）を選ぶ

## 開発

[harness](../../README.md) の pnpm workspace のパッケージとして開発する。

```bash
pnpm --filter @ksugawara61/docs-lint test       # vitest
pnpm --filter @ksugawara61/docs-lint typecheck  # tsc
pnpm --filter @ksugawara61/docs-lint build      # dist/ に JavaScript と型定義を出力する
pnpm lint:docs                                  # リポジトリのルートで harness 自身の文書を検査する
```

`docs-lint-v*` のタグを push すると、GitHub Actions が npm に公開する。

## ライセンス

MIT
