---
description: GraphQL の fragment colocation。サブフィーチャーが使うフィールドを fragment で宣言し、親のクエリが取り込む
paths:
  - "**/src/features/**"
---

# GraphQL の fragment のガイドライン

GraphQL のクエリで取るフィールドを、使うフィーチャーの横に fragment で宣言する（fragment colocation）ときの書き方を決めます。
コードレビュー時は以下のルールに基づいて指摘してください。

- フィーチャーとサブフィーチャーの構成 → `feature-directory.md`
- import のパス（相対パスと `@/`）の書き方 → `import-path.md`
- `mocks.ts` と story の書き方 → `storybook.md`・`spec-test.md`
- 例は gql.tada（`graphql()`・`readFragment`・`FragmentOf`・`maskFragments`）で書く。ほかのライブラリでは、同じ役割の関数に読み替える
- リポジトリ側に独自の GraphQL の規約がある場合は、そちらを優先してください

## サブフィーチャーが使うフィールドは、サブフィーチャーの `fragment.ts` に書く

クエリの結果を Props で受け取って描画するサブフィーチャーは、描画に使うフィールドを自分の `fragment.ts` に fragment で宣言してください。
親のクエリにサブフィーチャーのフィールドを直接書きません。

親のクエリにフィールドを並べると、サブフィーチャーに要るフィールドを親が知っていなければなりません。
サブフィーチャーで表示を足すたびに親のクエリも直すことになり、サブフィーチャーを消しても親のクエリにフィールドが残ります。
fragment にすれば、フィールドの追加と削除がサブフィーチャーの中で閉じます。

```text
src/features/todo-page/features/todo-list/
├── index.tsx
├── service.ts
├── query.ts            // 一覧のクエリ。...TodoItem で子の fragment を取り込む
└── features/
    └── todo-item/
        ├── index.tsx
        ├── service.ts      // readFragment で fragment を読む
        ├── fragment.ts     // TodoItem が使うフィールド
        └── mocks.ts        // fragment のモック（TodoItemFragmentMocks）
```

- `fragment.ts` には、そのフィーチャーの fragment を 1 つだけ置き、`<Feature>Fragment` の名前で export する
- GraphQL の fragment の名前はフィーチャーの名前（PascalCase）にする（`fragment TodoItem on Todo`）
- `fragment.ts` はフィーチャーのディレクトリの直下に置く。`graphqls/` のようなディレクトリは切らない

```ts
// Good: todo-item/fragment.ts
export const TodoItemFragment = graphql(`
  fragment TodoItem on Todo {
    completed
    id
    title
  }
`);

// Bad: 親のクエリに、子の描画に使うフィールドを直接並べている
// todo-list/query.ts
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

孫のサブフィーチャーの fragment は、子の fragment が取り込みます。
親のクエリが取り込むのは、直下のサブフィーチャーの fragment だけです。
import の向きが親から直下のサブフィーチャーだけになり、`no-cross-feature-import` の制約にも沿います。

```ts
// Good: 子の fragment が孫（todo-assignee）の fragment を取り込む
// todo-item/fragment.ts
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

共有フィーチャー（`shared/<name>/`）も、使う側から Props でデータを受け取るなら、同じく自分の `fragment.ts` を持ちます。
使う側の fragment やクエリが、共有フィーチャーの fragment を取り込みます。

## クエリは送るフィーチャーに置き、自分で使うフィールドと子の fragment だけを書く

クエリは、それを送る（`useQuery` などを呼ぶ）フィーチャーに置いてください。
クエリには、そのフィーチャー自身が使うフィールドと、直下のサブフィーチャーの fragment のスプレッドだけを書きます。

```ts
// Good: todo-list/query.ts
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

- fragment をスプレッドしたら、`graphql()` の第 2 引数に fragment を渡す。渡さないと、結果の型に fragment が入らない
- サブフィーチャーの fragment を取り込むクエリは、`src/api/` のようなフィーチャーの外には置けない。外からはサブフィーチャーを import できないため
- 複数のフィーチャーで使う値（取り直しに使う query key など）だけを、フィーチャーの外に置く

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
`readFragment` に渡す fragment は、同じディレクトリの `fragment.ts` のものだけにします。

```tsx
// Good: todo-list/index.tsx
{
  todos.map((todo) => <TodoItem key={todo.id} maskedTodo={todo} />);
}

// Bad: 親で子の fragment を読んでから渡している
const todo = readFragment(TodoItemFragment, maskedTodo);
<TodoItem todo={todo} />;
```

## fragment のモックは `mocks.ts` に `<Feature>FragmentMocks` で置く

サブフィーチャーをテストと story で描画するときの Props の値は、同じフィーチャーの `mocks.ts` に置いてください。
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

`@ksugawara61/code-lint` の `use-own-fragment` は、`readFragment` に渡す fragment を検査します。
同じディレクトリの `fragment.ts` から import したもの以外を渡すと報告します。
親が子の fragment を読む書き方を報告します。
どのパスに当てるかは、リポジトリの oxlint の `overrides` に従ってください（`src/features/**` など）。
