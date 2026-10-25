---
description: src 配下の import パスの書き方。境界の内側は相対パス、境界を越えるときは @/ のパスエイリアス
paths:
  - "**/src/**"
  - "**/tsconfig*.json"
---

# import パスのガイドライン

`src/` の中の import で、相対パスと `@/` のパスエイリアスを使い分ける規約を決めます。
import のパスを見ただけで、同じまとまりの内側を参照しているのか、別のフィーチャーやレイヤーを参照しているのかを読み取れるようにします。
コードレビュー時は以下のルールに基づいて指摘してください。

- フィーチャーの親子の間の import の制約 → `feature-directory.md`
- ルーティングのファイルからの import → `routing.md`
- リポジトリ側に独自の import の規約がある場合は、そちらを優先してください

## 境界の単位

相対パスで import してよい「内側」は、次の単位です。

| 単位                        | パス                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| features 直下のフィーチャー | `src/features/<name>/` の中（サブフィーチャーを含む）                         |
| グループの中のフィーチャー  | `src/features/shared/<name>/` の中（`shared` などのまとめるディレクトリ）     |
| レイヤー                    | `src/` 直下のほかのディレクトリ（`src/ui/`・`src/api/`・`src/app/` など）の中 |
| `src/` 直下のファイル       | そのファイルだけ（`src/main.tsx` など）                                       |

## 同じ単位の内側は相対パスで import する

同じフィーチャー、同じレイヤーの内側は、相対パスで書いてください。
サブフィーチャーから親のフィーチャーの `schema.ts` を参照するときのように、同じ単位の内側なら親方向の `../` を含んでもかまいません。

```ts
import { TodoItem } from "./features/todo-item/index.tsx";
// Good: 同じフィーチャーの内側
import { useService } from "./service.ts";
```

フィーチャーの中の `shared/` も、同じフィーチャーの内側のため相対パスで書きます。
`shared/` の共通ロジックは、一番近い親のフィーチャーの `shared/` から相対パスでだけ import します（`feature-directory.md`）。
同じ単位の内側でも、`shared/` を `@/` で import しないでください。

```ts
// src/features/todo-page/features/todo-list/features/todo-item/service.ts
// Good: 一番近い親の shared/ を相対パスで import する
import { filterTodos } from "../../shared/filter-todos.ts";
```

## 境界を越える import は `@/` で書く

別のフィーチャー・別のレイヤー・`src/` 直下のファイルを参照するときは、`@/` から始まるパスで書いてください。
`../` の数を数えなくても、どのレイヤーを指しているかがわかります。ファイルを移動しても import が壊れにくくなります。

```ts
// Good: 境界を越える参照は @/ で書く
import { todosQueryOptions } from "@/api/todo.ts";
import { renderFeature } from "@/test-utils/render.tsx";
import { Button } from "@/ui/button/index.tsx";

// Bad: 境界を越える参照を相対パスで書いている
import { todosQueryOptions } from "../../../../api/todo.ts";
import { Button } from "../../ui/button/index.tsx";
```

ルーティングのファイルからページを参照するときも同じです（`import { TodoPage } from "@/features/todo-page/index.tsx";`）。
`vi.mock()` の指定子も、対象のモジュールを import するときと同じ書き方に揃えてください。
`src/` の外（`assets/` など）を参照する import はエイリアスの対象外のため、相対パスのままにします。

## エイリアスはすべてのツールで同じ解決先にする

`@/*` は `src/*` を指すようにし、型検査とバンドラーとテストランナーのすべてで同じ解決先にしてください。

- tsconfig の `compilerOptions.paths` に `"@/*": ["./src/*"]` を書く
- バンドラー（Vite・Metro など）とテストランナー（Vitest など）の設定にも同じエイリアスを書く。tsconfig の `paths` を読むなら書かなくてよい
- Storybook など、別の設定でバンドルするツールにも書く

解決先を変えるときは、すべての設定を同時に変えます。

## lint で強制する

`@ksugawara61/code-lint` の `no-relative-cross-boundary` で、境界を越える相対パスの import を報告できます。
報告のメッセージに、書き換え先の `@/` のパスが出ます。
`no-cross-feature-import` も `@/` のパスを解決するため、エイリアスで書いてもフィーチャーの親子の制約は外れません。
`use-nearest-shared-import` は、`shared/` を `@/` で import すると報告します。

どのパスに当てるか、エイリアスの解決先をどこにするかは、リポジトリの oxlint の `overrides` とルールのオプション（`aliases`）に従ってください。
