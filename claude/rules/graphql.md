---
description: GraphQL の操作（fragment・query・mutation）を使うフィーチャーの graphqls/ に置くコロケーションと、サブフィーチャーの fragment の扱い
paths:
  - "**/src/features/**"
---

# GraphQL の操作のガイドライン

GraphQL の操作（fragment・query・mutation）を、使うフィーチャーの `graphqls/` に置く（コロケーション）ときの書き方を決めます。
サブフィーチャーが使うフィールドは fragment で宣言し、親のクエリが取り込みます（fragment colocation）。
コードレビュー時は以下のルールに基づいて指摘してください。

- フィーチャーとサブフィーチャーの構成 → `feature-directory.md`
- import のパス（相対パスと `@/`）の書き方 → `import-path.md`
- `mocks.ts` と story の書き方 → `storybook.md`・`spec-test.md`
- 例は gql.tada（`graphql()`・`readFragment`・`FragmentOf`・`maskFragments`）で書く。ほかのライブラリでは、同じ役割の関数に読み替える
- リポジトリ側に独自の GraphQL の規約がある場合は、そちらを優先してください

## 操作は使うフィーチャーの `graphqls/<operation-name>.ts` に置く

fragment・query・mutation は、それを使うフィーチャーの `graphqls/` に 1 操作 1 ファイルで置いてください。
`src/api/` のような、フィーチャーの外のディレクトリにまとめません。

- fragment は、`readFragment` で読むフィーチャーに置く
- query は、送る（`useQuery` などを呼ぶ）フィーチャーに置く
- mutation は、送る（`useMutation` などを呼ぶ）フィーチャーに置く

操作をフィーチャーの外にまとめると、どの操作をどのフィーチャーが使うかがディレクトリから読み取れません。
フィーチャーを消しても、使われない操作が残ります。
使うフィーチャーの中に置けば、フィールドや操作の追加と削除がそのフィーチャーの中で閉じます。

```text
src/features/todo-page/features/
├── todo-add/
│   ├── index.tsx
│   ├── service.ts
│   └── graphqls/
│       └── create-todo-mutation.ts
└── todo-list/
    ├── index.tsx
    ├── service.ts
    ├── graphqls/
    │   └── todos-query.ts             // ...TodoItem で子の fragment を取り込む
    └── features/
        └── todo-item/
            ├── index.tsx
            ├── service.ts             // readFragment で fragment を読む
            ├── mocks.ts               // fragment のモック（TodoItemFragmentMocks）
            └── graphqls/
                ├── todo-item-fragment.ts
                ├── delete-todo-mutation.ts
                └── update-todo-mutation.ts
```

- ファイル名は、操作の名前を kebab-case にし、種類（`-fragment`・`-query`・`-mutation`・`-subscription`）で終える
- export は、`graphql()` で書いた操作 1 つだけにする。名前はファイル名の PascalCase（`todo-item-fragment.ts` → `TodoItemFragment`）
- GraphQL の操作の名前は、export の名前から種類を外したものにする（`fragment TodoItem on Todo`・`query Todos`・`mutation CreateTodo`）
- `graphqls/` の中にはディレクトリを切らず、ファイルを直接置く
- `queryOptions` や送る関数は `graphqls/` に置かず、`service.ts` に書く

```ts
// Good: todo-item/graphqls/todo-item-fragment.ts
export const TodoItemFragment = graphql(`
  fragment TodoItem on Todo {
    completed
    id
    title
  }
`);

// Bad: 1 ファイルに複数の操作を置いている
// src/api/todo.ts
export const TodosQuery = graphql(/* ... */);
export const CreateTodoMutation = graphql(/* ... */);

// Bad: ファイル名と export の名前が食い違っている
// todo-item/graphqls/todo-item-fragment.ts
export const TodoFragment = graphql(/* ... */);
```

同じ mutation を複数のフィーチャーで送るときも、操作はそれぞれのフィーチャーの `graphqls/` に置きます。
ほかのフィーチャーの `graphqls/` を import しないでください（`no-cross-feature-import` が報告します）。
取り直しに使う query key のように、複数のフィーチャーで使う値だけをフィーチャーの外に置きます。

## サブフィーチャーが使うフィールドは、サブフィーチャーの fragment に書く

クエリの結果を Props で受け取って描画するサブフィーチャーは、描画に使うフィールドを自分の `graphqls/` に fragment で宣言してください。
親のクエリにサブフィーチャーのフィールドを直接書きません。

親のクエリにフィールドを並べると、サブフィーチャーに要るフィールドを親が知っていなければなりません。
サブフィーチャーで表示を足すたびに親のクエリも直すことになり、サブフィーチャーを消しても親のクエリにフィールドが残ります。

```ts
// Bad: 親のクエリに、子の描画に使うフィールドを直接並べている
// todo-list/graphqls/todos-query.ts
export const TodosQuery = graphql(`
  query Todos {
    todos {
      completed
      id
      title # todo-item しか使わない
    }
  }
`);
```

クエリには、そのフィーチャー自身が使うフィールドと、直下のサブフィーチャーの fragment のスプレッドだけを書きます。
fragment をスプレッドしたら、`graphql()` の第 2 引数に fragment を渡します。渡さないと、結果の型に fragment が入りません。

```ts
// Good: todo-list/graphqls/todos-query.ts
// 一覧は件数の completed と key の id だけを使い、1 件分の表示は TodoItem の fragment に任せる
export const TodosQuery = graphql(
  `
    query Todos {
      todos {
        completed
        id
        ...TodoItem
      }
    }
  `,
  [TodoItemFragment],
);
```

孫のサブフィーチャーの fragment は、子の fragment が取り込みます。
親のクエリが取り込むのは、直下のサブフィーチャーの fragment だけです。
import の向きが親から直下のサブフィーチャーだけになり、`no-cross-feature-import` の制約にも沿います。

```ts
// Good: 子の fragment が孫（todo-assignee）の fragment を取り込む
// todo-item/graphqls/todo-item-fragment.ts
export const TodoItemFragment = graphql(
  `
    fragment TodoItem on Todo {
      id
      title
      ...TodoAssignee
    }
  `,
  [TodoAssigneeFragment],
);
```

fragment を持つ部品は、`readFragment` を `useService` で呼ぶため、`components/` ではなく `features/` のサブフィーチャーにします。
共有フィーチャー（`shared/<name>/`）も、使う側から Props でデータを受け取るなら、同じく自分の `graphqls/` に fragment を持ちます。
使う側の fragment やクエリが、共有フィーチャーの fragment を取り込みます。

## サブフィーチャーは masked のまま受け取り、`useService` で `readFragment` する

サブフィーチャーの Props は `FragmentOf<typeof XxxFragment>` にし、名前には `masked` を付けてください（`maskedTodo` など）。
`readFragment` は `service.ts` の `useService` の冒頭で 1 回だけ呼び、読んだ値をコンポーネントに返します。

```ts
// Good: todo-item/service.ts
type Params = {
  maskedTodo: FragmentOf<typeof TodoItemFragment>;
};

export const useService = ({ maskedTodo }: Params) => {
  const todo = readFragment(TodoItemFragment, maskedTodo);
  // ...
  return { completed: todo.completed, title: todo.title /* , ... */ };
};

// Bad: unmask 済みの型やフィールドごとの Props で受け取っている
type Params = { todo: ResultOf<typeof TodoItemFragment> };
type Params = { completed: boolean; id: string; title: string };
```

親は、クエリの結果を `readFragment` せず、masked のまま子に渡します。
親が子の fragment を読むと、子だけが使うフィールドに親が依存し、子のフィールドを子に閉じ込められません。
`readFragment` に渡す fragment は、同じフィーチャーの `graphqls/` のものだけにします。

```tsx
// Good: todo-list/index.tsx。クエリの 1 件をそのまま渡す
const items = todos.map((todo) => <TodoItem key={todo.id} maskedTodo={todo} />);

// Bad: 親で子の fragment を読んでから渡している
const todo = readFragment(TodoItemFragment, maskedTodo);
const item = <TodoItem todo={todo} />;
```

## fragment のモックは `mocks.ts` に `<Feature>FragmentMocks` で置く

サブフィーチャーをテストと story で描画するときの Props の値は、同じフィーチャーの `mocks.ts` に置いてください。
`graphqls/` にはモックを置きません。
`maskFragments` で masked にした値をケースごとに並べます。
`{ ... } satisfies Record<string, FragmentOf<typeof XxxFragment>>` の形で export します。
API のモック（`<Feature>Mocks`）と同じファイルに並べてかまいません。

```ts
// Good: todo-item/mocks.ts
export const TodoItemFragmentMocks = {
  /** 未完了の「牛乳を買う」 */
  Active: maskFragments(
    [TodoItemFragment],
    buildTodo({ id: "todo-1", title: "牛乳を買う" }),
  ),
  /** 完了済みの「ゴミを出す」 */
  Completed: maskFragments(
    [TodoItemFragment],
    buildTodo({ completed: true, id: "todo-2", title: "ゴミを出す" }),
  ),
} satisfies Record<string, FragmentOf<typeof TodoItemFragment>>;

// Bad: テストや story で、masked の型を as でごまかしている
const maskedTodo = { id: "todo-1" } as FragmentOf<typeof TodoItemFragment>;
```

親のクエリのモックは、子の fragment を意識しないで書けるようにします。

- API のモックがスキーマでクエリを実行する（MSW のハンドラーから `graphql()` の実行に渡すなど）なら、初期データを渡すだけでよい。fragment のフィールドはスキーマが選ぶ
- 決まった JSON を返すモックなら、masked にする前の値も子の `mocks.ts` から `Unmasked<Feature>FragmentMocks` で export する。親のモックでは、それと masked の値をスプレッドで重ねる

```ts
// 決まった JSON を返すモックの例: todo-list/mocks.ts
const todo = {
  ...UnmaskedTodoItemFragmentMocks.Active,
  ...TodoItemFragmentMocks.Active,
};
```

## lint で強制する

`@ksugawara61/code-lint` の次のルールで、この規約を lint で強制できます。

| ルール                       | 検査すること                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `use-feature-directory`      | `graphqls/` の中にディレクトリを切らず、ファイルを直接置いているか                                    |
| `use-graphql-operation-file` | `graphqls/` のファイルが操作を 1 つだけ export し、名前と種類がファイル名に合っているか               |
| `use-own-fragment`           | `readFragment` に、同じフィーチャーの `graphqls/` から import した fragment だけを渡しているか        |
| `no-cross-feature-import`    | ほかのフィーチャーの `graphqls/` を import していないか（親から直下の子の fragment の import は許す） |

`use-graphql-operation-file` は `src/features/**/graphqls/*.ts` に当てます。
`use-own-fragment` は `src/features/**` に当てます。
どのパスに当てるかは、リポジトリの oxlint の `overrides` に従ってください。
