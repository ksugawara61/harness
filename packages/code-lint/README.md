# code-lint

oxlint・oxfmt の共通設定と、Biome のルール・コンポーネント設計の規約を検査する oxlint の JS プラグインをまとめたパッケージ。
oxlint が読めない `.graphql` と JSON のキー順を検査する CLI も同梱する。

- `oxlintrc.json`：Biome の recommended 相当のルールを有効にした oxlint の設定。プラグインもここから読み込む
- `oxfmtrc.json`：Biome の formatter と organizeImports 相当の oxfmt の設定
- `code-lint/*`：oxlint に同等のルールが無いものを Biome の実装から移植したルールと、規約のルール（既定では無効）
- `code-lint-graphql`・`code-lint-sort-json-keys`：`.graphql` と JSON を検査する CLI

## インストール

Node.js 22 以上で動く。oxlint は peer dependency のため、利用側で入れる。

```bash
pnpm add -D @ksugawara61/code-lint oxlint oxfmt
```

## oxlint

`oxlintrc.json` を `extends` する。
oxlint の `extends` はパッケージ名で解決しないため、`node_modules` からのパスで書く。
`code-lint/*` のルールは、`oxlintrc.json` が読み込むプラグインから使える。

```jsonc
// .oxlintrc.json
{
  "extends": ["./node_modules/@ksugawara61/code-lint/oxlintrc.json"],
  "overrides": [
    {
      "files": ["src/**"],
      "rules": { "code-lint/max-lines": ["error", { "maxLines": 500 }] },
    },
  ],
}
```

どのパスにどのルールを当てるかは、利用側の設定に書く。
`oxlintrc.json` は `correctness` のカテゴリを切り、ルールを 1 つずつ有効にしている。

`typescript/no-floating-promises` は型情報を使うルールのため、型情報を使う検査を有効にしたときだけ動く。
使う場合は `oxlint-tsgolint` を入れ、利用側の設定に `"options": { "typeAware": true }` を書く。

## oxfmt

oxfmt の設定は `extends` できないため、`oxfmt.config.mts` で読み込んで広げる。

```ts
// oxfmt.config.mts
import base from "@ksugawara61/code-lint/oxfmtrc.json" with { type: "json" };

export default { ...base, ignorePatterns: ["**/*.md"] };
```

## GraphQL と JSON の検査

oxlint は `.graphql` と JSON を読めない。そのため、次の 2 つの CLI を `lint` スクリプトに足す。

```bash
code-lint-graphql 'src/**/*.graphql'
code-lint-sort-json-keys --ignore '**/*.local.json' 'tsconfig.json' 'src/**/*.json'
```

- `code-lint-graphql [--ignore <グロブ>]... <ファイルまたはグロブ>...`：`.graphql` を検査する。
  JS に埋め込んだ GraphQL と同じ検査（下の `graphql-*`）を掛ける
- `code-lint-sort-json-keys [--write] [--ignore <グロブ>]... <ファイルまたはグロブ>...`：JSON のキーの順を検査する。
  キーが natural order に並んでいなければ指摘する。
  `--write` を付けると並べ替えて書き込む。書き込んだ後は oxfmt で整形する

どちらも `node_modules` の中のファイルは対象にせず、指摘があれば終了コード 1 になる。
`package.json` の `exports` のように、キーの順に意味がある JSON は対象にしない。

## ルール

### Biome の機能の置き換え

oxlint・oxfmt に同等の機能が無いものは、Biome の実装を読んで移植した。
`max-lines` 以外は `oxlintrc.json` で有効にしている。

| ルール                             | 置き換え元                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `sort-keys`・`sort-jsx-attributes` | assist の `useSortedKeys`・`useSortedAttributes`（natural order）                |
| `cognitive-complexity`             | `noExcessiveCognitiveComplexity`（`maxAllowedComplexity`、既定 15）              |
| `max-lines`                        | `noExcessiveLinesPerFile`（`maxLines`、既定 300。`oxlintrc.json` では無効）      |
| `no-unused-template-literal`       | `noUnusedTemplateLiteral`                                                        |
| `use-parse-int-radix`              | `useParseIntRadix`（ESLint の `radix` は式の基数も不正と判定する）               |
| `graphql-*` と `code-lint-graphql` | GraphQL のルール（`noDuplicateFields` など 12 個）                               |
| `code-lint-sort-json-keys`         | JSON の `useSortedKeys`                                                          |
| その他の `no-*`・`use-*`           | oxlint に対応ルールが無い recommended のルール（`noUselessContinue` など 17 個） |

`cognitive-complexity`・`max-lines`・natural order の比較は、Biome と同じ値を返す。
Biome の実装の癖（`else` を抜けるとネストが浅くなる、埋め込み GraphQL を別のドキュメントとして数える、など）も再現している。

GraphQL のルールは、``graphql(`...`)``・``gql`...` ``・``graphql`...` `` に埋め込んだ GraphQL を検査する。
埋め込み式（`${...}`）を含むものは対象にしない。

### 規約のルール

コンポーネントとテストの書き方の規約を検査するルール。
`oxlintrc.json` では有効にしていないため、当てたいパスを利用側の `overrides` で指定する。
検出範囲は移植元の GritQL 版に合わせている（戻り値の型注釈がある関数を対象にしない、など）。

フックとロジックを `useService` フックへまとめ、コンポーネントと同じ場所に置く規約のルール。

| ルール                                 | 内容                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `only-use-service-hooks`               | コンポーネントでは `useService` 以外のフック（`use*`）を呼ばない            |
| `no-handler-in-component`              | コンポーネント内で変数を宣言しない（`const { … } = useService()` だけ許す） |
| `no-inline-handler-logic`              | JSX の `on*` props に、本体がブロックの関数を直接書かない                   |
| `use-service-single-component`         | 1 ファイルで `useService()` を呼ぶコンポーネントは 1 つまで                 |
| `use-service-handle-only`              | `useService` 内の関数変数の名前は `handleXxx` にする                        |
| `no-raw-setter-return`                 | `useService` の return で `useState` の setter をそのまま返さない           |
| `no-expo-router-in-use-service-return` | `useRouter()` の値を `useService` の return に含めない                      |
| `no-multiple-feature-exports`          | 1 つのファイルから export するのは 1 つだけ（feature の入口に当てる）       |
| `use-service-file-name`                | `useService` は `service.ts` に置き、`service` から import する             |

`use-service-file-name` は、`useService` の宣言と import の両方を見るため、`src/features/**` のように `.ts` と `.tsx` を含むパスに当てる。
`use-service.ts`・`hooks.ts` などに置くと、ファイル名がフィーチャーごとにばらつくため、`service.ts` に揃える。

`specIt(spec, key, { given, when, yields })` の形で仕様テストを書く規約のルール。
`specIt` は [spec](../spec/README.md) が提供する。

| ルール                    | 内容                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `no-raw-vitest-test`      | 仕様テストでは素の `it` / `test` を使わず、`specIt` を使う |
| `no-expect-in-given-when` | given / when フェーズで `expect` を呼ばない                |
| `no-waiting-in-when`      | when フェーズで待たない（`waitFor`・`findBy*` を使わない） |
| `use-expression-when`     | when フェーズの `run` は、操作 1 つの式にする              |
| `no-event-in-yields`      | yields フェーズで `fireEvent` / `userEvent` を呼ばない     |

API のモックを `mocks.ts` にまとめる規約のルール。

| ルール             | 内容                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `use-mocks-record` | export は `〜Mocks` の名前で `{ ... } satisfies Record<string, T>` にし、値に関数（ファクトリ）を置かない |

`T` はモックの型（`HttpHandler`・`HttpHandler[]`・Props の型など）にする。
ケース名で引いた値の型をどのケースでも同じにし、story や test で同じように `server.use(...XxxMocks.Success)` と書けるようにするため。
ほかのモジュールの `〜Mocks` の re-export・素のデータやハンドラ単体の export も報告する。

UI と Storybook のルール。

| ルール                | 内容                                                     |
| --------------------- | -------------------------------------------------------- |
| `no-style-prop-in-ui` | UI コンポーネントの Props に `style` を出さない          |
| `no-test-id`          | `testID` 属性を使わず、`aria-label` などで要素を特定する |
| `no-storybook-title`  | Storybook の meta に `title` を書かず、autoTitle を使う  |

```jsonc
// .oxlintrc.json
{
  "extends": ["./node_modules/@ksugawara61/code-lint/oxlintrc.json"],
  "overrides": [
    {
      "files": ["src/features/**/*.tsx"],
      "rules": {
        "code-lint/no-inline-handler-logic": "error",
        "code-lint/only-use-service-hooks": "error",
      },
    },
    {
      "files": ["src/**/stories.tsx"],
      "rules": { "code-lint/no-storybook-title": "error" },
    },
  ],
}
```

### テスト

ルールごとに `src/rules/<rule>.test.ts` があり、oxlint の `RuleTester` で検出する例としない例を書いている。
ルールが何を担保しているかは、テストの `name` を読めばわかる。

## 開発

[harness](../../README.md) の pnpm workspace のパッケージとして開発する。

```bash
pnpm --filter @ksugawara61/code-lint test       # vitest
pnpm --filter @ksugawara61/code-lint typecheck  # tsc
pnpm --filter @ksugawara61/code-lint build      # dist/ に JavaScript と型定義を出力する
pnpm lint                                       # リポジトリのルートで dist/ をビルドし、oxlintrc.json で harness 全体を検査する
```

Node.js は `node_modules` 配下の `.ts` を実行しないため、プラグインと CLI は `dist/` にビルドして公開する。
`oxlintrc.json` も `dist/plugin.js` を読み込むため、`oxlint` を動かす前にビルドが要る。

`code-lint-v*` のタグを push すると、GitHub Actions が npm に公開する。

## ライセンス

MIT
