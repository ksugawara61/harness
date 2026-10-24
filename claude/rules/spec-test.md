---
description: spec.ts と specIt で書く仕様テストの書き方（@ksugawara61/spec）
paths:
  - "**/spec.ts"
  - "**/test.{ts,tsx}"
---

# 仕様テストのコーディングガイドライン

`spec.ts` に宣言した仕様を `@ksugawara61/spec/vitest` の `specIt` / `specIt.each` で検証する **仕様テスト** の書き方を決めます。
コードレビュー時は以下のルールに基づいて指摘してください。

- 何をテストするか → `test-strategy.md`（仕様テストにも適用する）
- 通常の `it` / `describe` で書くテストの書き方 → `test.md`
- リポジトリ側に独自のテスト規約がある場合は、そちらを優先してください

`test.md` のうち `it.each` と、`describe` / `it` の命名の節は、仕様テストでは本ファイルの規約に置き換わります。
両者が食い違う場合は、仕様テストでは本ファイルを優先してください。

## 適用範囲

同じディレクトリに `spec.ts` がある `test.ts` / `test.tsx` を仕様テストとして扱います。
`spec.ts` が無いディレクトリの `test.ts(x)` や、`@ksugawara61/spec` を使っていないリポジトリには適用しません。

- 仕様テストを使うリポジトリで機能（feature・ユースケース）を新しく追加するときは、`spec.ts` と `specIt` による `test.ts(x)` を同時に置いてください
- どのディレクトリを仕様テストの対象にするかは、リポジトリの oxlint の `overrides`（`code-lint/no-raw-vitest-test` などを当てる範囲）に従う

## 仕様テストと単体テストをファイル名で分ける

- `test.ts` / `test.tsx`：同じディレクトリの `spec.ts` に対応する仕様テスト。テストの登録には `specIt` / `specIt.each` だけを使う
- `*.test.ts` / `*.test.tsx`：純粋関数などの単体テスト。`test.md` に従い通常の `it` / `it.each` を使う

仕様テストのファイルに通常の `it` / `test` を書くと、oxlint の `code-lint/no-raw-vitest-test` が診断します。
純粋関数のテストを追加するときは、`transform.test.ts` のような名前のファイルへ分けてください。

## 合意したテストリストは `spec.ts` に残す

`test-strategy.md` の TDD の手順で合意したテストリストは、口頭や PR コメントに残しません。
`defineSpec(featureId, cases)` で `spec.ts` に宣言してください。

- `cases` のキーが仕様 ID で、`caseId()` で `<featureId>.<key>` に展開される
- 仕様 ID は `<feature>.<場面>.<結果>` の 3 階層で命名する（例: `todo-add.submit.ok`）
- 値は Gherkin 記法の `{ given?, when, yields }`
- `when`（操作）と `yields`（観測できる結果）は必須。操作は 1 ケースにつき 1 つだけ書き、2 つ書きたくなったらケースを分ける
- `given`（前提）は前提を持たないケースでは省略できる
- `yields` には観測できる結果だけを書く。内部状態やモックの呼び出しを書きたくなったら、実装の詳細をテストしているサイン

```ts
// src/features/todo-add/spec.ts
import { defineSpec } from "@ksugawara61/spec";

export const spec = defineSpec("todo-add", {
  "submit.ok": {
    given: "タイトルを入力済み",
    when: "フォームを送信する",
    yields: "やることが作成され前の画面に戻る",
  },
  "validation.title-required": {
    given: "タイトルが未入力",
    when: "フォームを送信する",
    yields: "バリデーションエラーが表示され送信されない",
  },
});
```

## `specIt` でケースを登録する

各ケースは `specIt(spec, key, { given?, when, yields })` で登録します。
各フェーズは `{ desc, run }` で書き、`desc` に `spec.ts` の仕様文をそのままコピーします。

```tsx
// src/features/todo-add/test.tsx
import { specIt } from "@ksugawara61/spec/vitest";
import { spec } from "./spec";

specIt(spec, "submit.ok", {
  given: {
    desc: "タイトルを入力済み",
    run: () => {
      render(<TodoAdd />);
      fillTitle("牛乳を買う");
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
});
```

- **`it` の名前は書かない**。`specIt` が `spec.ts` から `Given … / When … / Then …` を生成する。
  `test.md` の「`describe` は対象、`it` は振る舞いで命名する」は仕様テストに適用しない
- **`desc` は `spec.ts` の仕様文をそのままコピーする**。`desc` は `spec.ts` のリテラル型に固定されているため、
  どちらか一方だけを書き換えると typecheck が失敗する。仕様文の正本は `spec.ts`
- 各フェーズの責務は `spec.ts` の `given` / `when` / `yields` と 1 対 1 で対応する。
  `given` は前提の構築、`when` は操作 1 つ、`yields` は観測できる結果の検証
- `given` / `when` で `expect` を呼ばない（`code-lint/no-expect-in-given-when`）
- `when` の `run` は操作 1 つの式にし、ブロック本体を書かない（`code-lint/use-expression-when`）。
  `await` が必要な操作は `run: async () => user.click(...)` のように式本体で書く
- `findBy*` / `waitFor` などの待機はすべて `yields` に置く（`code-lint/no-waiting-in-when`）。
  `when` で待つ必要が出たら、操作と検証の境界を引き直す（フォーム入力を `given` に移す、など）
- `yields` で `fireEvent` / `userEvent` を呼ばない（`code-lint/no-event-in-yields`）
- `yields` の `run` が受け取れるのは `when` と `given` の戻り値だけ。必要な値は `given` の戻り値にまとめる
- 各フェーズの `run` は末尾の引数で Vitest の `TestContext` を受け取れる。`ctx.onTestFinished` などはそこから使う

### `yields` を配列で宣言する

同じ `given` / `when` から複数の結果を検証するケースでは、`spec.ts` の `yields` を配列で宣言し、`specIt` の `yields` もフェーズの配列で書きます。
要素数と順序は `spec.ts` の配列と一致させてください（食い違うと typecheck が失敗します）。

`yields` の配列は「1 つの操作に対して複数の結果を検証する」ための機構です。複数の操作を 1 ケースにまとめるためには使いません。

`given` / `when` が同一で `yields` だけが違う複数のケースは、配列にして 1 ケースに束ねられます。
束ねてよいのは、テスト側の `given` / `when` の `run` の中身が同一のときだけです。
`spec.ts` の文言が同じでも、モックの差し替えなど `run` の中身が違うケースは束ねないでください。
束ねたケースの仕様 ID は、束ねた内容を表す `<場面>.<結果>` に付け直してください。

### データ駆動のケースは `specIt.each` を使う

`spec.ts` の 1 ケースを複数行のデータで検証するときは、`it.each` ではなく `specIt.each` を使ってください。
`specIt` と同じく、`desc` が仕様文と一致することを型で強制でき、`it` 名や `annotate` の書き忘れも防げます。

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

- 各行は `{ name: string, ... }` のオブジェクト。`name` は行を区別するラベルで、`it` 名は `<仕様文> / <name>` になる
- 各フェーズの `run` は先頭の引数で行データ（`row`）を受け取る。以降の引数の並びは `specIt` と同じ
- `specIt.each` と `specIt` はフェーズの引数の形が違うため、同じケースに束ねない

### 通常の `it` と手書きの `annotate` を使ってよい条件

`specIt` は「前提の構築 → 操作 1 つ → 検証」を前提にしています。次の場合に限り、通常の `it` の中で `annotate(spec.caseId("<key>"), "spec")` を手書きしてください。

- 1 ケースの検証に、操作 → 中間状態の検証 → 別の操作、のように複数の操作を連続して行う必要がある
- 準備・後処理が `given` / `when` / `yields` の 3 つに収まらない

この場合も `spec.ts` の宣言と `annotate()` による対応付けは省略しないでください。逃げ道は例外として最小限に留めてください。

## 網羅は reporter と `check-spec-coverage` で検査する

Vitest の reporter（`SpecCoverageReporter`）が `spec.ts` の宣言と `annotate()` の呼び出しを突き合わせます。
その結果を `check-spec-coverage` が判定し、次の状態があれば失敗します。

- 未網羅：`spec.ts` に宣言はあるのに、合格したテストが無い
- 不明：テストで `annotate` した仕様 ID が `spec.ts` に宣言されていない

未網羅を指摘されたら、テストを足して対応付けてください。不明を指摘されたら、`spec.ts` に宣言するか ID の typo を直してください。
テストを消して網羅を通すのではなく、仕様が不要になったなら `spec.ts` のケースも同時に消してください。
