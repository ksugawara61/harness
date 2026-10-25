# code-lint

oxlint・oxfmt の共通設定と、Biome のルール・コンポーネント設計の規約を検査する oxlint の JS プラグインをまとめたパッケージ。
oxlint が読めない `.graphql` と JSON のキー順を検査する CLI と、フィーチャーの依存を検査する dependency-cruiser のルールも同梱する。

- `oxlintrc.json`：Biome の recommended 相当のルールを有効にした oxlint の設定。プラグインもここから読み込む
- `oxfmtrc.json`：Biome の formatter と organizeImports 相当の oxfmt の設定
- `code-lint/*`：oxlint に同等のルールが無いものを Biome の実装から移植したルールと、規約のルール（既定では無効）
- `code-lint-graphql`・`code-lint-sort-json-keys`：`.graphql` と JSON を検査する CLI
- `@ksugawara61/code-lint/dependency-cruiser`：共有フィーチャーの依存を検査する dependency-cruiser のルール

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

## dependency-cruiser

`sharedFeatureRules()` は、共有フィーチャー（フィーチャーの中の `shared/<name>/`）の依存を検査する dependency-cruiser のルールを返す。
`@ksugawara61/code-lint/dependency-cruiser` から import する。
制約は oxlint の `use-nearest-shared-import` と同じ（下の「規約のルール」を参照）。
dependency-cruiser は optional の peer dependency のため、使うときに利用側で入れる。

```bash
pnpm add -D dependency-cruiser
```

```js
// .dependency-cruiser.mjs
import { sharedFeatureRules } from "@ksugawara61/code-lint/dependency-cruiser";

export default {
  forbidden: [...sharedFeatureRules()],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
  },
};
```

```bash
depcruise src
```

返すルールは 2 種類。

| ルール名              | 報告すること                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `shared-not-nearest`  | 共有フィーチャーを、import するモジュールのフィーチャー自身と親のうち、`shared/` を持つ一番近いもの以外から import する |
| `shared-not-relative` | 共有フィーチャーをパスエイリアス（tsconfig の `paths` など）で import する                                              |

一番近い `shared/` を決めるため、`sharedFeatureRules()` を呼んだ時点のファイルシステムで、各フィーチャーの `shared/` の有無を見る。
dependency-cruiser は実行のたびに設定ファイルを読むため、`shared/` を足したり消したりしても設定を書き換えなくてよい。
`shared-not-relative` は、パスエイリアスを解決できるように `options.tsConfig` を設定したときだけ報告できる。
dependency-cruiser は TypeScript 7 の API にまだ対応していない。
TypeScript 7 のプロジェクトでは、`@swc/core` を入れて `options.parser` を `"swc"` にし、tsc を求める `tsPreCompilationDeps` を外す。

`sharedFeatureRules()` は次のオプションを取る。

| オプション    | 既定値           | 内容                                                                                    |
| ------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `featuresDir` | `"src/features"` | フィーチャーを置くディレクトリ。`cwd` からの相対パス                                    |
| `groups`      | `[]`             | features 直下でフィーチャーをまとめるディレクトリ（`["shared"]` など）                  |
| `cwd`         | `process.cwd()`  | dependency-cruiser を動かすディレクトリ。モジュールのパスはここからの相対パスで書かれる |
| `severity`    | `"error"`        | 違反の重さ                                                                              |

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

| ルール                            | 内容                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `only-use-service-hooks`          | コンポーネントでは `useService` 以外のフック（`use*`）を呼ばない                 |
| `no-handler-in-component`         | コンポーネント内で変数を宣言しない（`const { … } = useService()` だけ許す）      |
| `no-inline-handler-logic`         | JSX の `on*` props に、本体がブロックの関数を直接書かない                        |
| `use-service-single-component`    | 1 ファイルで `useService()` を呼ぶコンポーネントは 1 つまで                      |
| `use-service-handle-only`         | `useService` 内の関数変数の名前は `handleXxx` にする                             |
| `no-raw-setter-return`            | `useService` の return で `useState` の setter をそのまま返さない                |
| `no-router-in-use-service-return` | ルーターのフック（既定は `useRouter()`）の値を `useService` の return に含めない |
| `no-multiple-feature-exports`     | 1 つのファイルから export するのは 1 つだけ（feature の入口に当てる）            |
| `use-service-file-name`           | `useService` は `service.ts` に置き、`service` から import する                  |

`no-router-in-use-service-return` は、`hooks` オプションでナビゲーションの値を返すフックの名前を変えられる。
ルーティングのライブラリに合わせて、`["useRouter", "useNavigate"]`（TanStack Router）のように指定する。

`use-service-file-name` は、`useService` の宣言と import の両方を見るため、`src/features/**` のように `.ts` と `.tsx` を含むパスに当てる。
`use-service.ts`・`hooks.ts` などに置くと、ファイル名がフィーチャーごとにばらつくため、`service.ts` に揃える。

フィーチャーのディレクトリ構成の規約のルール。
features 直下にはページ相当のフィーチャーだけを置く。
ページの部品は、ロジックがあれば親の `features/<name>/` にサブフィーチャーとして、ロジックが無ければ親の `components/<name>.tsx` に置く。

```text
src/features/
└── todo-page/              # ページ。features の外（ルーティングのファイルなど）から import する
    ├── index.tsx
    ├── service.ts
    ├── components/
    │   └── todo-header.tsx # ロジックの無い部品。1 ファイルずつ直接置く
    ├── shared/
    │   └── todo-error/     # 配下で共通の部品（共有フィーチャー）。サブフィーチャーと同じ構成で、一番近い親の shared/ から相対パスで import する
    └── features/
        └── todo-list/      # ロジックを持つ部品（サブフィーチャー）。同じ構成で入れ子にできる
            ├── index.tsx
            ├── service.ts
            └── features/
                └── todo-item/
```

| ルール                       | 内容                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-feature-directory`      | features 直下にはディレクトリだけを置き、フィーチャーの中のディレクトリは `features/<name>/`・`shared/<name>/`・`components/` だけにする             |
| `no-cross-feature-import`    | フィーチャーからは同じフィーチャー・直下のサブフィーチャー・親の共有フィーチャーだけを、features の外からは features 直下のフィーチャーだけを import |
| `use-nearest-shared-import`  | 共有フィーチャー（`shared/<name>/`）は、一番近い親のフィーチャーの `shared/` からだけ相対パスで import する                                          |
| `no-logic-in-components`     | `components/` の部品でフック（`useXxx(...)`）を呼ばない                                                                                              |
| `no-relative-cross-boundary` | 境界（フィーチャー・レイヤー・`src/` 直下のファイル）を越える import を相対パスで書かず、`@/` のパスエイリアスで書く                                 |
| `no-logic-in-routes`         | ルーティングのファイルで、`allowHooks` に挙げたもの以外のフックを呼ばない                                                                            |
| `use-own-fragment`           | `readFragment` には、同じディレクトリの `fragment.ts` から import した GraphQL の fragment だけを渡す                                                |

`no-cross-feature-import` は、ページ同士やサブフィーチャー同士の横の import を報告する。
ほかのフィーチャーから使われるフィーチャーはページではない。使う側の `features/` へ移す。
import のパスは、相対パスと `aliases` に挙げたパスエイリアス（既定は `@/` → `src/`）を解決して見る。

共有フィーチャーは、`features/<name>/` のサブフィーチャーと同じ構成で、`shared/<name>/` に置くフィーチャー。
`shared/` を持つフィーチャーの配下の、複数のフィーチャーから使う部品を置く。

`use-nearest-shared-import` は、import するファイルのフィーチャー自身と親のフィーチャーのうち、`shared/` を持つ一番近いものの共有フィーチャーだけを許す。
兄弟や子のフィーチャーの共有フィーチャー、より近い `shared/` があるときの遠い親の共有フィーチャー、features の外からの共有フィーチャーの import を報告する。
一番近い `shared/` でも、パスエイリアスで書いた import は報告する。
一番近い `shared/` を決めるため、各フィーチャーの `shared/` の有無をファイルシステムで見る。
同じ制約を dependency-cruiser でも検査できる（上の「dependency-cruiser」を参照）。

`no-relative-cross-boundary` は、`aliases` の解決先のディレクトリ（既定は `src/`）の中を次の単位に分け、単位を越える相対パスの import を報告する。
報告のメッセージには、書き換え先のエイリアスのパスが出る。

- features 直下のフィーチャー（`groups` に挙げたディレクトリの中は、その中のフィーチャー）
- 解決先の直下のほかのディレクトリ（`ui`・`api`・`app` などのレイヤー）
- 解決先の直下のファイル（`main.tsx` など）。ファイルごとに 1 つの単位

`no-logic-in-routes` は、ルーティングのファイルをライブラリを問わず薄く保つ。
パスのパラメーターを読むフックなど、ルートのファイルで呼んでよいフックを `allowHooks` に挙げる。
expo-router なら `["useLocalSearchParams"]`、TanStack Router なら `["useParams", "useSearch"]` のように指定する。
`Route.useParams()` のようなメンバー呼び出しは、プロパティの名前で判定する。

`use-own-fragment` は、GraphQL の fragment colocation の規約を保つ。
サブフィーチャーは描画に使うフィールドを自分の `fragment.ts` に fragment で宣言し、親のクエリがそれをスプレッドで取り込む。
親は結果を masked のまま子に渡し、子だけが `readFragment` で読む。
`readFragment` の第 1 引数が、同じディレクトリの `fragment.ts` から相対パスで import した識別子でなければ報告する。
`fragment.ts` の中で宣言した fragment は許す。
`fragmentFile` オプションでファイルの名前（拡張子を除く。既定は `"fragment"`）を、`functions` オプションで見る関数（既定は `["readFragment"]`）を変えられる。
`src/features/**` のように、フィーチャーのファイルに当てる。

フィーチャーの構成を見る次のルールは、共通のオプションを取る。

- `use-feature-directory`
- `no-cross-feature-import`
- `use-nearest-shared-import`
- `no-relative-cross-boundary`

| オプション    | 既定値             | 内容                                                                                                                 |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `featuresDir` | `"src/features"`   | フィーチャーを置くディレクトリ。oxlint を動かすディレクトリからの相対パス                                            |
| `groups`      | `[]`               | features 直下でフィーチャーをまとめるディレクトリ（`["shared"]` など）。中のフィーチャーはどこからでも import できる |
| `aliases`     | `{ "@/": "src/" }` | `use-feature-directory` 以外。パスエイリアスの接頭辞と解決先のディレクトリ                                           |
| `allowDirs`   | `[]`               | `use-feature-directory` だけ。フィーチャーの中に置いてよいほかのディレクトリ（`["graphqls"]` など）                  |

```jsonc
// .oxlintrc.json
{
  "overrides": [
    {
      "files": ["src/**"],
      "rules": {
        "code-lint/no-cross-feature-import": "error",
        "code-lint/no-relative-cross-boundary": "error",
        "code-lint/use-nearest-shared-import": "error",
      },
    },
    {
      "files": ["src/features/**"],
      "rules": { "code-lint/use-feature-directory": "error" },
    },
    {
      // TanStack Router で src/app をルーティングのディレクトリにする例
      "files": ["src/app/**"],
      "rules": {
        "code-lint/no-logic-in-routes": [
          "error",
          { "allowHooks": ["useParams", "useSearch"] },
        ],
      },
    },
    {
      "files": ["src/features/**/components/**"],
      "rules": { "code-lint/no-logic-in-components": "error" },
    },
  ],
}
```

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

| ルール                | 内容                                                                |
| --------------------- | ------------------------------------------------------------------- |
| `no-style-prop-in-ui` | UI コンポーネントの Props に `style` を出さない                     |
| `no-test-id`          | `testID` 属性を使わず、`aria-label` などで要素を特定する            |
| `no-storybook-title`  | Storybook の meta に `title` を書かず、autoTitle を使う             |
| `use-stories-file`    | コンポーネントを export するファイルの隣に `stories.tsx` を必ず置く |

`use-stories-file` は、同じディレクトリに `stories.tsx` が無いとき、最初の値の export 文を報告する。
`button.stories.tsx` のような名前は数えず、`spec.ts`・`test.tsx` と同じくファイル名を `stories.tsx` に固定する。
コンポーネントの入口（`src/features/*/index.tsx`・`src/ui/*/index.tsx` など）に当てる。
ファイルシステムを見るため、`stories.tsx` を足してもエディタの診断は古いまま残る場合がある。CLI の `oxlint` で確かめる。

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
      "files": ["src/features/*/index.tsx", "src/ui/*/index.tsx"],
      "rules": { "code-lint/use-stories-file": "error" },
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
