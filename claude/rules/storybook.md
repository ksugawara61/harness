---
description: Storybook の story（stories.tsx）の書き方と、story を必ず置く規約
paths:
  - "**/stories.tsx"
  - "**/.storybook/**"
---

# Storybook のコーディングガイドライン

コンポーネントの見た目と状態を、Storybook の story（CSF3）で残す規約を決めます。
コードレビュー時は以下のルールに基づいて指摘してください。

- 振る舞いの検証 → `spec-test.md`・`test.md`
- リポジトリ側に独自の Storybook の規約がある場合は、そちらを優先してください

## コンポーネントの隣に `stories.tsx` を必ず置く

コンポーネントの入口（フィーチャーの `index.tsx`・UI 部品の `index.tsx` など）を追加したら、同じディレクトリに `stories.tsx` を同時に置いてください。
`spec.ts`・`test.tsx` と同じく、ファイル名は `stories.tsx` に固定します。`button.stories.tsx` のような名前にはしません。

`stories.tsx` が無いと、oxlint の `code-lint/use-stories-file` が入口の export を診断します。
どのファイルを入口とみなすかは、リポジトリの oxlint の `overrides`（`code-lint/use-stories-file` を当てる範囲）に従ってください。

## meta は `satisfies Meta` で書き、`title` を書かない

```tsx
// src/features/todo-page/features/todo-list/stories.tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TodoList } from "./index.tsx";
import { TodoListMocks } from "./mocks.ts";

const meta = {
  component: TodoList,
} satisfies Meta<typeof TodoList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  parameters: { msw: { handlers: TodoListMocks.Success } },
};

export const Empty: Story = {
  parameters: { msw: { handlers: TodoListMocks.Empty } },
};
```

- meta は `const meta = { ... } satisfies Meta<typeof X>` で宣言し、`export default meta` する。`args` の型が `StoryObj<typeof meta>` に引き継がれる
- `component` を必ず書く。Docs の Props 表と `args` の型がここから決まる
- `title` は書かない（`code-lint/no-storybook-title`）。ディレクトリから autoTitle が付くため、移動しても名前がずれない
- story は `StoryObj<typeof meta>` の名前付き export で書く。`render` を書くのは、`args` だけで表せないときに限る

## story は状態ごとに 1 つ置く

story はコンポーネントが取りうる表示の状態を並べるために置きます。状態ごとに 1 つ story を書いてください。

- API を呼ぶコンポーネントは、`mocks.ts` のケースごとに story を置く（`Success`・`Empty`・`Failure` など）。story の名前はケースに合わせる
- API のモックは `mocks.ts` のケースをそのまま渡す。story の中でハンドラーやデータを組み立てない
- 見た目だけを持つ UI 部品は、Props の主な組み合わせ（`variant`・`disabled` など）ごとに story を置く
- イベントの Props（`onClick` など）は `args` に `fn()`（`storybook/test`）を渡す
- `Error` のように組み込みの名前と重なる export 名は避け、`Failure` のように言い換える

```tsx
// Good: mocks.ts のケースを渡すだけ
export const Failure: Story = {
  parameters: { msw: { handlers: TodoListMocks.Error } },
};

// Bad: story ごとにハンドラーを組み立てていて、テストのモックとずれる
export const Failure: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/todos", () => new HttpResponse(null, { status: 500 })),
      ],
    },
  },
};
```

## `play` は状態を作るためだけに使う

送信に失敗した後のエラーのように、操作しないと出ない表示は `play` でその状態まで進めてください。
`play` は表示が出るまで待つ（`findBy*`）ところまでにし、`expect` による検証は書きません。
振る舞いの検証は仕様テスト（`spec.ts` と `test.tsx`）が担い、story と二重に持ちません。

```tsx
// Good: エラーが出るまで操作して待つだけ
export const Failure: Story = {
  parameters: { msw: { handlers: TodoAddMocks.Error } },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "やること" }),
      "牛乳を買う",
    );
    await userEvent.click(canvas.getByRole("button", { name: "追加" }));
    await canvas.findByRole("alert");
  },
};

// Bad: 仕様テストと同じ検証を story にも書いている
export const Failure: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "追加" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "やることを追加できませんでした",
    );
  },
};
```

`userEvent` は `play` の引数ではなく `storybook/test` から import してください。
`composeStories` で story をテストから実行するとき、引数の `userEvent` は渡されません。

## story が壊れていないことをテストで確かめる

story は Storybook を開かないと壊れたことに気付きにくいため、テストですべての story を描画してください。
`composeStories` と `import.meta.glob("./**/stories.tsx")` で story を集め、各 story の `run()` を呼ぶテストを 1 つ置きます。
`run()` は描画と `play` を実行し、どちらかで例外が出ればテストが失敗します。

- preview の設定（デコレーター・loader）は `setProjectAnnotations` で読み込み、story と同じ条件で描画する
- ブラウザ専用のモジュール（MSW の `virtual:msw` など）は、テストでは `vi.mock` で Node.js 向けの実装に差し替える
