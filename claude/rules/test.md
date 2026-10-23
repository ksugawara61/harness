---
description: 通常の it / describe で書くテストの書き方（Vitest）
paths:
  - "**/*.test.{ts,tsx}"
  - "**/test.{ts,tsx}"
---

# テストコードのコーディングガイドライン

Vitest（または Jest 互換のテストランナー）で書くテストの書き方を決めます。
コードレビュー時は以下のルールに基づいて指摘してください。

何をテストするかは `test-strategy.md` を参照してください。
リポジトリ側に独自のテスト規約がある場合は、そちらを優先してください。

## 重複した入出力ケースは `it.each` でデータ駆動化する

「同じ関数を呼んで、入力と期待結果だけが違う」テストを `it` で並べると、
本質的な差分（入力と出力の対応）が assertion 周辺の定型コードに埋もれます。
このようなケースは `it.each` でテーブルにまとめ、
「入力 → 期待結果」の対応が一目で読めるようにしてください。

### タプル形式（引数が少ないとき）

```ts
// Good: しきい値と icon の対応がテーブルで一覧できる
it.each([
  [80, "✅"],
  [100, "✅"],
  [50, "⚠️"],
  [79, "⚠️"],
  [0, "❌"],
  [49, "❌"],
])("renders %s%% coverage with %s icon", (pct, icon) => {
  expect(formatResult(resultWithFile("src/a.ts", pct))).toContain(icon);
});

// Bad: 同じ assertion を 3 回コピペしていて、しきい値の境界が読み取りにくい
it("uses ✅ icon for coverage >= 80%", () => {
  expect(formatResult(resultWithFile("src/a.ts", 80))).toContain("✅");
  expect(formatResult(resultWithFile("src/a.ts", 100))).toContain("✅");
});
it("uses ⚠️ icon for coverage >= 50% and < 80%", () => {
  expect(formatResult(resultWithFile("src/a.ts", 50))).toContain("⚠️");
  expect(formatResult(resultWithFile("src/a.ts", 79))).toContain("⚠️");
});
it("uses ❌ icon for coverage < 50%", () => {
  expect(formatResult(resultWithFile("src/a.ts", 0))).toContain("❌");
  expect(formatResult(resultWithFile("src/a.ts", 49))).toContain("❌");
});
```

### オブジェクト形式（引数が多いとき）

引数が 3 つ以上、または意味が名前から分からないときは
オブジェクト形式にして `$propName` でテスト名にプロパティを差し込んでください。

```ts
// Good: 各ケースの意図が name から読める
it.each([
  { name: "matches *.mocks.ts under any directory", pattern: "*.mocks.ts", input: "src/foo.mocks.ts", expected: true },
  { name: "rejects different extension", pattern: "*.mocks.ts", input: "src/foo.test.ts", expected: false },
  { name: "anchors path-with-slash patterns to start", pattern: "src/*.mocks.ts", input: "other/foo.mocks.ts", expected: false },
])("$name", ({ pattern, input, expected }) => {
  expect(new RegExp(globToRegex(pattern)).test(input)).toBe(expected);
});

// Bad: タプルの 3 列目が boolean だが、何が「true」なのか名前から分からない
it.each([
  ["*.mocks.ts", "src/foo.mocks.ts", true],
  ["*.mocks.ts", "src/foo.test.ts", false],
])("globToRegex %s vs %s", (pattern, input, expected) => { ... });
```

## モックの前提が複数の観点で検証されるなら `describe.each` でスイートを括る

「同じセットアップで、複数の `it` を流したい」ときは `describe.each` でまとめます。
1 ケースに対して `it` 1 個（=観点 1 個）に絞れるので、失敗時にどの観点が壊れたか即座に分かります。

```ts
// Good: 同じ vitest config 配置 → runner detect の各観点を別々の it で検証
describe.each([
  { filename: "vitest.config.ts", content: "export default {}" },
  { filename: "vitest.config.js", content: "module.exports = {}" },
  { filename: "vitest.config.mts", content: "export default {}" },
])("detectRunner with $filename", ({ filename, content }) => {
  it("returns 'vitest'", async () => {
    await writeFile(join(tmpDir, filename), content);
    expect(await detectRunner(tmpDir)).toBe("vitest");
  });
});
```

`it.each` と `describe.each` は次のように使い分けます。

- 検証が assertion 1 行 → `it.each`
- 同じ前提から複数観点を検証 → `describe.each`

## テストデータは Builder / Factory 関数で組み立てる

巨大なオブジェクトをテスト本体にインラインで書くと、「このテストで本質的に違う部分はどこか」が読み取れなくなります。
共通部分はファイル先頭の factory 関数に追い出し、`Partial<T>` のオーバーライドだけテスト本体に書いてください。

```ts
// Good: デフォルト値は factory に押し込み、テスト本体は「差分」だけが残る
const createResult = (
  overrides?: Partial<DiffCoverageResult>,
): DiffCoverageResult => {
  return {
    files: [],
    runner: "jest",
    summary: {/* ... */},
    timestamp: "2024-01-01T00:00:00.000Z",
    uncoveredFiles: [],
    ...overrides,
  };
};

it("includes runner name in header", () => {
  expect(formatResult(createResult({ runner: "vitest" }))).toContain("vitest");
});

// Bad: テストごとに完全なオブジェクトを書いていて、何が変わっているか目視で diff を取る必要がある
it("includes runner name in header", () => {
  const result: DiffCoverageResult = {
    files: [],
    runner: "vitest",
    summary: {/* 同じ巨大なオブジェクト */},
    timestamp: "2024-01-01T00:00:00.000Z",
    uncoveredFiles: [],
  };
  expect(formatResult(result)).toContain("vitest");
});
```

## `describe` は対象、`it` は振る舞いで命名する

- `describe` には「何をテストしているか」（関数名・クラス名）を書く
- `it` には「どう振る舞うか」を `〜する` / `returns 〜` の形で書く
- ケースの内容を細かく書くより、「入力 → 期待結果」の対応が短く分かる名前を優先する

```ts
// Good
describe("getDiffFiles", () => {
  it("returns empty array when git diff reports no changed files", async () => { ... });
  it("filters out test files by default", async () => { ... });
});

// Bad: describe / it の責務が逆転している、または冗長
describe("test for the function that gets diff files from git", () => {
  it("getDiffFiles", async () => { ... });
});
```

## アサーションは「何を検証したいか」で粒度を選ぶ

- 完全な等価検証: `toEqual`（ディープ）/ `toBe`（参照・プリミティブ）
- 部分一致: `toContain`（配列・文字列）/ `toMatchObject`（オブジェクト部分一致）
- モック呼び出し: `toHaveBeenCalledWith` / `toHaveBeenCalledOnce`
- 例外: `toThrow` / 非同期は `await expect(promise).rejects.toThrow(...)`

意図と粒度がズレた matcher を使うと、次の問題が起きます。

- 過剰に厳しい assertion で関係ない変更で壊れる
- 過剰に緩い assertion で本来検出したいリグレッションが通ってしまう

```ts
// Good: 「runner 名がヘッダに入っていること」だけを検証 → toContain
expect(formatResult(makeResult({ runner: "vitest" }))).toContain("vitest");

// Good: 「diff ファイルが正確にこの 1 件であること」を検証 → toEqual
expect(files).toEqual([
  { addedLines: [1, 2, 3], additions: 3, deletions: 0, path: "src/foo.ts" },
]);

// Bad: 「含まれていれば OK」程度の検証なのに完全一致を要求している
expect(formatResult(makeResult({ runner: "vitest" }))).toBe(
  "Header: vitest\n...完全な出力文字列...",
);
```

## 非同期テストは `async` / `await` で書く

`javascript.md` のルールに整合させ、テストでも Promise チェーンや `done` コールバックは使いません。
失敗パスは `await expect(...).rejects.toThrow(...)` で検証します。

```ts
// Good: async/await で素直に書く
it("rejects when ref is missing", async () => {
  await expect(resolveRef("/repo", "missing")).rejects.toThrow(/not found/);
});

// Bad: .then().catch() で失敗時の done を忘れる典型パターン
it("rejects when ref is missing", () => {
  return resolveRef("/repo", "missing").then(
    () => {
      throw new Error("should have thrown");
    },
    (err) => {
      expect(err.message).toMatch(/not found/);
    },
  );
});
```
