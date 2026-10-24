# spec

仕様（テストケース）を TypeScript のファイルで宣言し、Vitest のテストと機械的に対応付けるパッケージ。
`defineSpec` でフィーチャー単位の仕様を宣言し、テスト側では `specIt` でケースキーを指定して仕様と対応付ける。
宣言したのにテストが無いケースは、reporter と CLI `check-spec-coverage` が検出する。

合意したテストリストを自然言語のルールではなくコード上の成果物として残し、仕様と実装済みテストの対応を検証できるようにする。

- `.`：`defineSpec`・`formatSpecCase` と型。Vitest に依存しない
- `./vitest`：テストラッパの `specIt`・`specIt.each`
- `./reporter`：Vitest の custom reporter の `SpecCoverageReporter`。Node.js 専用
- `check-spec-coverage`：reporter の出力を判定し、未網羅・不明の仕様があれば exit 1 する CLI

`./vitest` と `./reporter` は Vitest に依存する。
ブラウザ向けのバンドル（Storybook など）に Vitest が混ざらないよう、サブパスに分けている。

## インストール

Node.js 22 以上で動く。`./vitest` と `./reporter` を使うときは、Vitest 3.2 以上を利用側で入れる。

```bash
pnpm add -D @ksugawara61/spec vitest
```

## 仕様を宣言する

```ts
// src/features/todo-add/spec.ts
import { defineSpec } from "@ksugawara61/spec";

export const spec = defineSpec("todo-add", {
  "render.form": {
    when: "追加画面を開く",
    yields: "タイトルを入力できるフォームが表示される",
  },
  "submit.ok": {
    given: "タイトルを入力済み",
    when: "フォームを送信する",
    yields: "やることが作成され前の画面に戻る",
  },
});

spec.caseId("render.form"); // "todo-add.render.form"
```

- `cases` はケースキー → `{ given?, when, yields }`（Gherkin 記法）のオブジェクト
- `when`（操作）と `yields`（観測できる結果）は必須。`given`（前提）は前提を持たないケースでは省略できる
- `yields` は `string | readonly string[]`。複数の結果を検証するケースでは配列で宣言できる
- `caseId()` の引数は `cases` で宣言したキーだけを許す型のため、未宣言のキーを渡すと typecheck が失敗する
- `cases` は `const` 型引数で受けるため、仕様文はリテラル型のまま保たれる。
  `specIt` はこのリテラル型を使い、テストに書いた仕様文との一致を型で要求する

### キー名と並び順

Gherkin の Then に対応するキーだけ `yields` という名前にしている。
`code-lint/sort-keys` などのルールはオブジェクトのキーを辞書順に並べ替える。
`then` のままだと `given` / `then` / `when` の順に並び、Gherkin の読み順にならない。
`given` < `when` < `yields` なら辞書順がそのまま読み順になる。
フェーズ内の `{ desc, run }` も同じ理由で `desc` にしている。こうすると仕様文が実装の真上に来る。

表示上の語彙は Gherkin のままで、`formatSpecCase` が生成する `it` 名は `Given … / When … / Then …` になる。
`yields` が配列の場合、1 件目を `Then …`、2 件目以降を `And …` として出力する。

```ts
formatSpecCase({
  given: "タイトルを入力済み",
  when: "フォームを送信する",
  yields: ["やることが作成される", "前の画面に戻る"],
});
// → "Given タイトルを入力済み / When フォームを送信する / Then やることが作成される / And 前の画面に戻る"
```

## テストを書く

各フェーズは `{ desc, run }` のオブジェクトで書く。
`desc` には `spec.ts` に宣言した仕様文をそのまま書き、`run` にそれを実装するコールバックを書く。
仕様文が実装の真上に並ぶため、テストファイルを単体で読んでも「何の振る舞いを確認しているか」が分かる。

```tsx
// src/features/todo-add/test.tsx
import { specIt } from "@ksugawara61/spec/vitest";
import { spec } from "./spec";

specIt(spec, "render.form", {
  // render 自体が when にあたるケースでは render を when に置く
  when: { desc: "追加画面を開く", run: () => render(<TodoAdd />) },
  yields: {
    desc: "タイトルを入力できるフォームが表示される",
    run: () => {
      expect(
        screen.getByPlaceholderText("やることを入力..."),
      ).toBeInTheDocument();
    },
  },
});

specIt(spec, "submit.ok", {
  given: {
    desc: "タイトルを入力済み",
    run: async () => {
      const back = vi.fn();
      render(<TodoAdd onBack={back} />);
      fillTitle("牛乳を買う");
      return { back };
    },
  },
  when: {
    desc: "フォームを送信する",
    run: () =>
      fireEvent.click(screen.getByRole("button", { name: "追加する" })),
  },
  yields: {
    desc: "やることが作成され前の画面に戻る",
    run: async (_when, { back }) => {
      expect(
        await screen.findByText("やることを追加しました"),
      ).toBeInTheDocument();
      expect(back).toHaveBeenCalled();
    },
  },
});
```

- 各フェーズの `desc` は `spec.ts` の仕様文のリテラル型に固定されている。
  どちらか一方だけを書き換えると typecheck が失敗するため、仕様文の二重管理にはならない
- `it` 名は `formatSpecCase(spec.cases[key])` から生成される。名前を渡す引数は無く、`desc` は `it` 名の生成に使われない
- `it` の中で `annotate(spec.caseId(key), "spec")` を呼び、仕様 ID とテストを対応付ける
- `when` は必須（操作は 1 ケースにつき 1 つ）。`given` は `spec.ts` が `given` を宣言したケースでのみ書けて、宣言があれば省略できない。
  宣言が無いケースでは、`when` / `yields` が受け取る `given` の戻り値は `undefined` 型になる
- 各フェーズの `run` は位置引数の末尾に Vitest のテストコンテキストを受け取るので、`onTestFinished` などはそこから使う
- `yields` の `run` が受け取れるのは `when` の結果と `given` の戻り値だけで、`given` の途中の変数は型の上で参照できない
- `spec.ts` の `yields` が配列の場合、`specIt` の `yields` もフェーズの配列で書く。要素数・順序は `spec.ts` の配列と一致させる。
  ランタイムは `yields` のフェーズを宣言順に直列実行する

### データ駆動のケース

`spec.ts` の 1 ケースを複数行のデータで検証するときは `specIt.each` を使う。
`it.each(cases)(name, fn)` と同じくカリー化していて、`spec, key` を先に渡してから `rows, phases` を渡す。

```tsx
specIt.each(spec, "submit.ok")(
  [
    { name: "通常のタイトル", title: "牛乳を買う" },
    { name: "絵文字入りのタイトル", title: "🥛 牛乳を買う" },
  ],
  {
    given: {
      desc: "タイトルを入力済み",
      run: (row) => {
        render(<TodoAdd />);
        fillTitle(row.title);
      },
    },
    when: {
      desc: "フォームを送信する",
      run: () =>
        fireEvent.click(screen.getByRole("button", { name: "追加する" })),
    },
    yields: {
      desc: "やることが作成され前の画面に戻る",
      run: async () => {
        expect(
          await screen.findByText("やることを追加しました"),
        ).toBeInTheDocument();
      },
    },
  },
);
```

- 各行は `{ name: string, ... }` のオブジェクト。`it` 名は `<仕様文> / <name>` になる
- 各フェーズの `run` は先頭の引数で行データ（`row`）を受け取る。それ以降の引数は `specIt` と同じ
- 行ごとに `annotate` を呼ぶ。いずれか 1 行が pass すれば、その仕様 ID は網羅済みと判定される

## 網羅を検査する

`SpecCoverageReporter` を Vitest の `reporters` に足す。
reporter は `spec.ts` の宣言と `annotate()` の呼び出しを突き合わせ、中間 JSON を書き出す。
reporter の中で throw しても Vitest の実行を落とせないため、判定と exit 1 は `check-spec-coverage` が担う。

```ts
// vitest.config.ts
import { resolve } from "node:path";
import { SpecCoverageReporter } from "@ksugawara61/spec/reporter";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: [
      "default",
      new SpecCoverageReporter({
        featuresDir: resolve(import.meta.dirname, "src/features"),
        mode: "full",
        outputFile: resolve(import.meta.dirname, "coverage/spec-coverage.json"),
      }),
    ],
  },
});
```

| オプション    | 内容                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`        | `full` は `featuresDir` 配下のすべての `spec.ts` を対象にする。`related` は実行した `test.ts(x)` と同じディレクトリの `spec.ts` だけを対象にする |
| `featuresDir` | `mode: "full"` で `spec.ts` を探すディレクトリ                                                                                                   |
| `outputFile`  | 中間 JSON の書き出し先。`check-spec-coverage` は `<project-path>/coverage/spec-coverage.json` を読む                                             |

仕様テストのファイル名は `test.ts` / `test.tsx`、仕様のファイル名は `spec.ts` に固定している。
`*.test.ts` のような単体テストは `related` の対象を決めるときに数えない。

テストの後に `check-spec-coverage` を実行する。

```json
{ "scripts": { "test": "vitest run && check-spec-coverage ." } }
```

```bash
check-spec-coverage <project-path> [project-path ...]
```

次のどちらかがあると exit 1 する。未網羅の行には、仕様 ID に加えて `Given … / When … / Then …` の仕様文が出る。

- 未網羅：`spec.ts` に宣言はあるのに、合格した `annotate` が無い
- 不明：`annotate` はあるのに、`spec.ts` に宣言が無い

## lint のルール

[code-lint](../code-lint/README.md) に、`specIt` で書く仕様テストの規約のルールがある。
仕様テストのファイル（`test.ts(x)`）に `overrides` で当てる。

## 開発

[harness](../../README.md) の pnpm workspace のパッケージとして開発する。

```bash
pnpm --filter @ksugawara61/spec test       # vitest
pnpm --filter @ksugawara61/spec typecheck  # tsc
pnpm --filter @ksugawara61/spec build      # dist/ に JavaScript と型定義を出力する
```

`spec-v*` のタグを push すると、GitHub Actions が npm に公開する。

## ライセンス

MIT
