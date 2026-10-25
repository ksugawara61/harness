---
description: フィーチャー（src/features）のディレクトリ構成と、サブフィーチャー・components の置き分け
paths:
  - "**/src/features/**"
---

# フィーチャーのディレクトリ構成のガイドライン

画面の機能を `src/features/` の下にフィーチャーとして置くときの構成を決めます。
コードレビュー時は以下のルールに基づいて指摘してください。

- フィーチャーの中のファイル（`service.ts`・`spec.ts`・`stories.tsx` など）の書き方 → `spec-test.md`・`storybook.md`
- ルーティングのディレクトリ（`src/app/`・`src/routes/` など）との役割分担 → `routing.md`
- import のパス（相対パスと `@/`）の書き方 → `import-path.md`
- リポジトリ側に独自のディレクトリ構成の規約がある場合は、そちらを優先してください

## features 直下にはページ相当のフィーチャーだけを置く

`src/features/` の直下には、ルーティングのファイルから描画するページ相当のフィーチャーだけを置いてください。
ページの一部になる部品は、features 直下へ並べずにページの中に置きます。

直下に部品を並べると、どれがページでどれが部品か、どの部品をどのページが使っているかがディレクトリから読み取れません。
ページの中に閉じ込めれば、ページを消すと部品も一緒に消え、使われない部品が残りません。

```text
// Good: ページだけが features 直下にあり、部品はページの中にある
src/features/
└── todo-page/
    ├── index.tsx
    └── features/
        ├── todo-add/
        └── todo-list/

// Bad: ページの部品が features 直下に並んでいる
src/features/
├── todo-page/
├── todo-add/       // todo-page からしか使わない
└── todo-list/      // todo-page からしか使わない
```

## ロジックを持つ部品は `features/<name>/` のサブフィーチャーにする

フックや API の呼び出し（`useService`・`useQuery` など）を持つ部品は、親のフィーチャーの `features/<name>/` にサブフィーチャーとして置いてください。
サブフィーチャーの中の構成は、ページのフィーチャーと同じです（`index.tsx`・`service.ts`・`spec.ts`・`test.tsx`・`stories.tsx`・`mocks.ts` など）。
サブフィーチャーの部品も、同じ規則でさらに `features/` と `components/` に置けます。

```text
// Good: 1 件分の完了・削除を持つ todo-item は todo-list のサブフィーチャー
src/features/todo-page/features/todo-list/
├── index.tsx
├── service.ts
└── features/
    └── todo-item/
        ├── index.tsx
        ├── service.ts
        └── ...

// Bad: features/ を挟まずにディレクトリを切っている
src/features/todo-page/todo-list/index.tsx
```

## ロジックの無い部品は `components/<name>.tsx` に置く

Props だけで描画が決まり、フックを呼ばない部品は、親のフィーチャーの `components/` に 1 ファイルずつ置いてください。
ディレクトリにはしません。フックやテスト・モックが要るようになったら、`features/` のサブフィーチャーに移します。

```text
// Good: ロジックの無い部品は components/ の直下にフラットに置く
src/features/todo-page/features/todo-list/components/
└── todo-remaining.tsx

// Bad: components/ の中でディレクトリにしている
src/features/todo-page/features/todo-list/components/
└── todo-remaining/
    └── index.tsx
```

複数のアプリやフィーチャーで共通に使う見た目だけの部品（ボタン・入力欄など）は、フィーチャーではなく `src/ui/` などに置きます。

## import はフィーチャーの親子の間だけにする

フィーチャーから import するのは、同じフィーチャーのファイルと、直下のサブフィーチャーだけにしてください。
ページ同士・サブフィーチャー同士の横の import や、子から親への import はしません。
features の外（ルーティングのファイルなど）からは、features 直下のページだけを import します。
ルーティングのライブラリを問わず、ルートのファイルはページを `@/features/<page>/...` から import して描画するだけにします（`routing.md`）。

ほかのフィーチャーの部品を使いたくなったら、それは features 直下のページではありません。使う側の `features/` か `components/` に移してください。
複数のページで使う部品は、`features/shared/` のようなまとめるディレクトリを決めて置きます。

## lint で強制する

`@ksugawara61/code-lint` の次のルールで、この構成を lint で強制できます。

| ルール                    | 検査すること                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `use-feature-directory`   | フィーチャーの中のディレクトリが `features/<name>/` と `components/` だけか         |
| `no-cross-feature-import` | 同じフィーチャーと直下のサブフィーチャー、features の外からはページだけを import か |
| `no-logic-in-components`  | `components/` の部品がフックを呼ばないか                                            |

`no-cross-feature-import` は、相対パスと `@/` のパスエイリアスのどちらで書いた import も検査します。

どのパスに当てるかは、リポジトリの oxlint の `overrides` に従ってください。
