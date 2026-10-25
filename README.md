# harness

複数のプロジェクトで共通に使う、lint の設定と Claude Code の設定をまとめて管理するリポジトリ。
curio で育てた lint のルールと Claude Code の設定を、ほかのプロジェクトにも同じ形で当てられるようにする。

| 置き場所                      | 中身                                                                         | 配り方                                                   |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `packages/code-lint`          | oxlint・oxfmt の共通設定と oxlint の JS プラグイン、GraphQL・JSON の検査 CLI | npm（`@ksugawara61/code-lint`）                          |
| `packages/docs-lint`          | Markdown 文書の textlint・markdownlint・文字数上限の検査 CLI                 | npm（`@ksugawara61/docs-lint`）                          |
| `packages/spec`               | 仕様を `spec.ts` で宣言し、Vitest のテストと対応付けて網羅を検査する API     | npm（`@ksugawara61/spec`）                               |
| `claude/`                     | Claude Code のユーザー設定（`settings.json`）とルール（`rules/`）            | clone して `scripts/install.sh` で `~/.claude` に配置    |
| `plugins/`・`.claude-plugin/` | スキル・サブエージェント・フック                                             | Claude Code のプラグイン（マーケットプレイス `harness`） |

プラグインにはルールと `settings.json` を入れられない。
そのため、プラグインにできるものは `plugins/` に、できないものは `claude/` に置く。

## Claude Code の設定

### コンテナの起動時に配置する

Claude Code on the web の環境のセットアップスクリプトや、devcontainer の `postCreateCommand` に次の 1 行を書く。

```bash
curl -fsSL https://raw.githubusercontent.com/ksugawara61/harness/main/scripts/bootstrap.sh | bash
```

`scripts/bootstrap.sh` は harness を `~/.harness` に clone し（2 回目以降は更新し）、`scripts/install.sh` を呼ぶ。
環境変数で clone 先と取り込む版を変えられる。

| 環境変数       | 既定値                                       | 内容                       |
| -------------- | -------------------------------------------- | -------------------------- |
| `HARNESS_DIR`  | `~/.harness`                                 | clone 先                   |
| `HARNESS_REPO` | `https://github.com/ksugawara61/harness.git` | clone 元                   |
| `HARNESS_REF`  | `main`                                       | 取り込むブランチまたはタグ |

手元のマシンでは、clone してから `scripts/install.sh` を直接呼ぶ。

```bash
git clone https://github.com/ksugawara61/harness.git ~/.harness
~/.harness/scripts/install.sh
```

### install.sh が配置するもの

配置先は `~/.claude`（`CLAUDE_CONFIG_DIR` があればそちら）。
`~/.claude` には履歴やセッションなどの実行時データも置かれるため、ディレクトリごとではなく項目単位で配置する。

- `claude/rules/*.md`：`~/.claude/rules/` にシンボリックリンクする。clone を更新すれば、次のセッションから反映される。
  同じ名前のファイルが既にあれば上書きせずにスキップし、harness から消えたルールへのリンクは外す
- `claude/settings.json`：`~/.claude/settings.json` にマージする。ファイルが無ければコピーする。
  オブジェクトは再帰的に、配列（`permissions.allow` など）は和集合でマージし、それ以外の値は harness 側を優先する。
  `claude plugin install` が書き込むため、シンボリックリンクにはしない
- プラグイン：clone したディレクトリをマーケットプレイス `harness` として登録し、全プラグインを user スコープに入れる。
  入れるプラグインは `HARNESS_PLUGINS`（空白区切り）で絞れる。`--no-plugins` を付けると入れない

`settings.json` のマージには `jq` を、プラグインの導入には `claude` コマンドを使う。

### ルール

| ルール                 | 内容                                             |
| ---------------------- | ------------------------------------------------ |
| `javascript.md`        | JavaScript のコーディング規約                    |
| `typescript.md`        | TypeScript のコーディング規約                    |
| `test.md`              | Vitest で書くテストの書き方                      |
| `test-strategy.md`     | 何をテストするか                                 |
| `spec-test.md`         | `spec.ts` と `specIt` で書く仕様テストの書き方   |
| `storybook.md`         | `stories.tsx` で書く Storybook の story の書き方 |
| `working-directory.md` | 作業ディレクトリの扱い                           |

### プラグイン

マーケットプレイスは `.claude-plugin/marketplace.json` にある。
`install.sh` を使わずに入れるときは、Claude Code で次を実行する。

```bash
claude plugin marketplace add ksugawara61/harness
claude plugin install workflow@harness
```

| プラグイン     | 中身                                                                                                | 取り込み元                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `workflow`     | スキル `sync-main`、サブエージェント `explore`                                                      | `plugins/workflow`                                                                                 |
| `js-toolchain` | pnpm のプロジェクトで `npx` を止めるフック、編集後に oxlint の自動修正と oxfmt の整形を掛けるフック | `plugins/js-toolchain`                                                                             |
| `agpr`         | スキル `agpr-pr`・`agpr-fix`                                                                        | [ksugawara61/agpr](https://github.com/ksugawara61/agpr) の `skills/`                               |
| `genshijin`    | スキル `genshijin`・`genshijin-commit` など 5 つ                                                    | [InterfaceX-co-jp/genshijin](https://github.com/InterfaceX-co-jp/genshijin) の `skills/`（v1.3.0） |
| `grill-me`     | スキル `grill-me`                                                                                   | [mattpocock/skills](https://github.com/mattpocock/skills) の `skills/productivity/grill-me`        |

外部のスキルは harness に複製せず、取り込み元のリポジトリを参照する。
`genshijin` は、毎セッションでモードを有効にする取り込み元のフックを入れず、スキルだけを入れる。

`js-toolchain` のフックは、プロジェクトの `node_modules/.bin` にある oxlint・oxfmt だけを使い、無ければ何もしない。
`npx` を止めるのは、プロジェクトのルートに `pnpm-lock.yaml` があるときだけ。

## パッケージ

使い方はそれぞれの README を参照する。

- [packages/code-lint](packages/code-lint/README.md)
- [packages/docs-lint](packages/docs-lint/README.md)
- [packages/spec](packages/spec/README.md)

## 開発

pnpm workspace で管理する。パッケージは `packages/` 配下に置く。

```bash
pnpm install
pnpm test          # 各パッケージの vitest と、scripts/install.test.sh
pnpm typecheck     # 各パッケージの tsc
pnpm lint          # ビルドしてから oxlint・JSON のキー順・文書・シェルスクリプトを検査する
pnpm format        # oxfmt
pnpm knip          # 未使用の export・依存の検出
pnpm build         # 各パッケージの dist/ を出力する
```

harness 自身も `packages/code-lint/oxlintrc.json` と `docs-lint` で検査する。
プラグインとマーケットプレイスは `claude plugin validate .` で検証する。

`<パッケージのディレクトリ名>-v<version>`（例: `code-lint-v0.1.0`）のタグを push すると、GitHub Actions がそのパッケージを npm に公開する。

## ライセンス

MIT
