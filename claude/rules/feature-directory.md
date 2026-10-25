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

## 配下で共通のロジックは `shared/` に置く

フィーチャーとそのサブフィーチャーで共通に使うロジック（関数・型・定数など）は、使う側すべてに一番近い共通の親のフィーチャーの `shared/` に置いてください。
`shared/` の中は、ファイルをそのまま置いても、ディレクトリに分けてもかまいません。
見た目の部品は `shared/` に置かず、`components/` か `features/` に置きます。

```text
// Good: todo-list と todo-item で使う絞り込みは todo-list の shared/ に置く
src/features/todo-page/
├── shared/
│   └── format-date.ts        // todo-add と todo-list の配下で使う
└── features/
    ├── todo-add/
    └── todo-list/
        ├── shared/
        │   └── filter-todos.ts   // todo-list と todo-item で使う
        └── features/
            └── todo-item/

// Bad: todo-list の配下でしか使わないロジックをページの shared/ に置いている
src/features/todo-page/
├── shared/
│   └── filter-todos.ts       // todo-list と todo-item だけが使う
└── features/
    └── todo-list/
```

## `shared/` は一番近い親のものだけを相対パスで import する

`shared/` を import できるのは、import するファイルのフィーチャー自身とその親のフィーチャーのうち、`shared/` を持つ一番近いものの `shared/` だけです。
import は相対パスで書き、`@/` のパスエイリアスでは書きません。
相対パスの `../` の深さから、どの階層の `shared/` を使っているかがわかります。

次の import はしないでください。

- 兄弟や子のサブフィーチャーの `shared/` の import
- 間により近い `shared/` があるときの、遠い親のフィーチャーの `shared/` の import
- features の外（ルーティングのファイルなど）からの `shared/` の import

```ts
// src/features/todo-page/features/todo-list/features/todo-item/service.ts
// Good: 一番近い親（todo-list）の shared/ を相対パスで import する
import { filterTodos } from "../../shared/filter-todos.ts";

// Bad: 一番近い shared/ でも、パスエイリアスで書いている
import { filterTodos } from "@/features/todo-page/features/todo-list/shared/filter-todos.ts";
// Bad: 間に todo-list の shared/ があるのに、ページの shared/ を import している
import { formatDate } from "../../../../shared/format-date.ts";
```

遠い親の `shared/` のロジックを使いたくなったら、一番近い `shared/` から re-export しないでください。
使う側すべてに一番近い共通の親が遠い親なら、近い方の `shared/` のロジックも遠い親の `shared/` に移します。
近い `shared/` だけで足りるなら、そのロジックを近い `shared/` に移します。

## import はフィーチャーの親子の間だけにする

フィーチャーから import するのは、同じフィーチャーのファイルと、直下のサブフィーチャーと、一番近い親の `shared/` だけにしてください。
ページ同士・サブフィーチャー同士の横の import や、子から親への import はしません。
features の外（ルーティングのファイルなど）からは、features 直下のページだけを import します。
ルーティングのライブラリを問わず、ルートのファイルはページを `@/features/<page>/...` から import して描画するだけにします（`routing.md`）。

ほかのフィーチャーの部品を使いたくなったら、それは features 直下のページではありません。使う側の `features/` か `components/` に移してください。
複数のページで使う部品は、`features/shared/` のようなまとめるディレクトリを決めて置きます。

## lint で強制する

`@ksugawara61/code-lint` の次のルールで、この構成を lint で強制できます。

| ルール                      | 検査すること                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `use-feature-directory`     | フィーチャーの中のディレクトリが `features/<name>/` と `components/` と `shared/` だけか         |
| `no-cross-feature-import`   | 同じフィーチャーと直下のサブフィーチャー・親の `shared/`、features の外からはページだけを import |
| `use-nearest-shared-import` | `shared/` を import するのが一番近い親の `shared/` だけで、相対パスで書いているか                |
| `no-logic-in-components`    | `components/` の部品がフックを呼ばないか                                                         |

`no-cross-feature-import`・`use-nearest-shared-import` は、相対パスと `@/` のパスエイリアスのどちらで書いた import も検査します。
`use-nearest-shared-import` は、一番近い `shared/` を決めるために、各フィーチャーの `shared/` の有無をファイルシステムで見ます。

どのパスに当てるかは、リポジトリの oxlint の `overrides` に従ってください。
