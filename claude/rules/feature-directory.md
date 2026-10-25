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
- GraphQL の操作（fragment・query・mutation）を置く `graphqls/` の書き方 → `graphql.md`
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
GraphQL の fragment を持つ部品もサブフィーチャーにします。`readFragment` を `useService` で呼ぶためです（`graphql.md`）。

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

## GraphQL の操作は `graphqls/<operation-name>.ts` に置く

フィーチャーが使う GraphQL の操作（fragment・query・mutation）は、そのフィーチャーの `graphqls/` に 1 操作 1 ファイルで置いてください。
`graphqls/` の中にはディレクトリを切らず、`todo-item-fragment.ts`・`todos-query.ts` のようにファイルを直接置きます。
ファイル名と export の名前、どのフィーチャーに置くかは `graphql.md` に従います。

```text
// Good: 操作を使うフィーチャーの graphqls/ に直接置く
src/features/todo-page/features/todo-list/
├── index.tsx
├── service.ts
└── graphqls/
    └── todos-query.ts

// Bad: graphqls/ の中にディレクトリを切っている
src/features/todo-page/features/todo-list/graphqls/
└── todos-query/
    └── index.ts
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

## 配下で共通の部品は `shared/<name>/` の共有フィーチャーにする

あるフィーチャーの配下の複数のフィーチャーで使う部品は、使う側すべてに一番近い共通の親のフィーチャーの `shared/<name>/` に置いてください。
`shared/<name>/` を共有フィーチャーと呼びます。
共有フィーチャーは、`features/<name>/` のサブフィーチャーと同じ構成のフィーチャーです。
`index.tsx`・`service.ts`・`spec.ts`・`test.tsx`・`stories.tsx`・`mocks.ts` などを置きます。
中に `features/`・`components/`・`shared/` を同じ規則で置けます。
`shared/` の直下にはファイルを置かず、共有フィーチャーのディレクトリだけを置きます。

```text
// Good: todo-add と todo-item で使うエラーの表示を、2 つに一番近い共通の親（todo-page）の shared/ に置く
src/features/todo-page/
├── index.tsx
├── shared/
│   └── todo-error/
│       ├── index.tsx
│       ├── service.ts
│       ├── spec.ts
│       ├── test.tsx
│       └── stories.tsx
└── features/
    ├── todo-add/
    └── todo-list/
        └── features/
            └── todo-item/

// Bad: 共有する部品を features/ に置き、兄弟や孫から import している
src/features/todo-page/features/
├── todo-error/       // todo-add と todo-item から import する
├── todo-add/
└── todo-list/

// Bad: shared/ の直下にファイルを置いている
src/features/todo-page/shared/
└── todo-error.tsx
```

複数のページで使う部品は、features 直下のグループ（`src/features/shared/<name>/` など）に置きます。
グループの中のフィーチャーは共有フィーチャーではなく、`@/` で import します（`import-path.md`）。

## 共有フィーチャーは一番近い親の `shared/` から相対パスで import する

共有フィーチャーを import できるのは、import するファイルのフィーチャー自身とその親のフィーチャーのうち、`shared/` を持つ一番近いものの `shared/` の中だけです。
import は相対パスで書き、`@/` のパスエイリアスでは書きません。
相対パスの `../` の深さから、どの階層の `shared/` を使っているかがわかります。

次の import はしないでください。

- 兄弟や子のサブフィーチャーの `shared/` の import
- 間により近い `shared/` があるときの、遠い親のフィーチャーの `shared/` の import
- features の外（ルーティングのファイルなど）からの共有フィーチャーの import
- 共有フィーチャーの中のサブフィーチャー（`shared/<name>/features/...`）の import

```ts
// src/features/todo-page/features/todo-list/features/todo-item/index.tsx
// Good: 一番近い親（todo-page）の shared/ を相対パスで import する
import { TodoError } from "../../../../shared/todo-error/index.tsx";

// Bad: パスエイリアスで書いている
import { TodoError } from "@/features/todo-page/shared/todo-error/index.tsx";
```

`todo-list` に `shared/` を足すと、`todo-list` とその配下（`todo-item`）から一番近い `shared/` は `todo-list/shared/` になります。
すると `todo-item` から `todo-page/shared/todo-error/` は import できません。
遠い親の共有フィーチャーを使いたくなったら、一番近い `shared/` から re-export しないでください。
使う側すべてに一番近い共通の親が遠い親なら、近い方の共有フィーチャーも遠い親の `shared/` に移します。
近い `shared/` だけで足りるなら、その共有フィーチャーを近い `shared/` に移します。

共有フィーチャーどうしは、同じ `shared/` の兄弟でも import できます（共有フィーチャー自身が `shared/` を持てば、そちらが一番近くなります）。
循環しないように、依存の向きを決めてください。

## import はフィーチャーの親子の間だけにする

フィーチャーから import するのは、同じフィーチャーのファイルと、直下のサブフィーチャーと、一番近い親の `shared/` の共有フィーチャーだけにしてください。
ページ同士・サブフィーチャー同士の横の import や、子から親への import はしません。
features の外（ルーティングのファイルなど）からは、features 直下のページだけを import します。
ルーティングのライブラリを問わず、ルートのファイルはページを `@/features/<page>/...` から import して描画するだけにします（`routing.md`）。

ほかのフィーチャーの部品を使いたくなったら、それは features 直下のページではありません。使う側の `features/`・`components/` か、使う側に共通の親の `shared/` に移してください。
複数のページで使う部品は、`features/shared/` のようなまとめるディレクトリを決めて置きます。

## lint と dependency-cruiser で強制する

`@ksugawara61/code-lint` の次のルールで、この構成を lint で強制できます。

| ルール                      | 検査すること                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `use-feature-directory`     | フィーチャーの中のディレクトリが `features/<name>/`・`shared/<name>/`・`components/`・`graphqls/` だけか     |
| `no-cross-feature-import`   | 同じフィーチャー・直下のサブフィーチャー・親の共有フィーチャーだけを、features の外からはページだけを import |
| `use-nearest-shared-import` | 共有フィーチャーを import するのが一番近い親の `shared/` からだけで、相対パスで書いているか                  |
| `no-logic-in-components`    | `components/` の部品がフックを呼ばないか                                                                     |

`no-cross-feature-import`・`use-nearest-shared-import` は、相対パスと `@/` のパスエイリアスのどちらで書いた import も検査します。
`use-nearest-shared-import` は、一番近い `shared/` を決めるために、各フィーチャーの `shared/` の有無をファイルシステムで見ます。
どのパスに当てるかは、リポジトリの oxlint の `overrides` に従ってください。

共有フィーチャーの依存は、dependency-cruiser でも検査できます。
`@ksugawara61/code-lint/dependency-cruiser` の `sharedFeatureRules()` は、dependency-cruiser のルールを返します。
制約は `use-nearest-shared-import` と同じです。
dependency-cruiser を使うリポジトリでは、設定ファイルの `forbidden` に広げてください。
