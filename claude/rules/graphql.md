---
description: GraphQL の操作（fragment・query・mutation）を使うフィーチャーの graphqls/ に置くコロケーションと、サブフィーチャーの fragment の扱い、操作を送るフックと API のモックの作り方
paths:
  - "**/src/features/**"
---

# GraphQL の操作のガイドライン

GraphQL の操作（fragment・query・mutation）を、使うフィーチャーの `graphqls/` に置く（コロケーション）ときの書き方を決めます。
サブフィーチャーが使うフィールドは fragment で宣言し、親のクエリが取り込みます（fragment colocation）。
操作は、データ取得のライブラリを包んだフックに渡して送り、API のモックも操作から作ります。
コードレビュー時は以下のルールに基づいて指摘してください。

- フィーチャーとサブフィーチャーの構成 → `feature-directory.md`
- import のパス（相対パスと `@/`）の書き方 → `import-path.md`
- `mocks.ts` と story の書き方 → `storybook.md`・`spec-test.md`
- 例は gql.tada（`graphql()`・`readFragment`・`FragmentOf`・`maskFragments`）・TanStack Query・MSW で書く。ほかのライブラリ（SWR など）では、同じ役割の関数に読み替える
- リポジトリ側に独自の GraphQL の規約がある場合は、そちらを優先してください

## 操作は使うフィーチャーの `graphqls/<operation-name>.ts` に置く

fragment・query・mutation は、それを使うフィーチャーの `graphqls/` に 1 操作 1 ファイルで置いてください。
`src/api/` のような、フィーチャーの外のディレクトリにまとめません。

- fragment は、`readFragment` で読むフィーチャーに置く
- query は、送る（`useGraphQLQuery` を呼ぶ）フィーチャーに置く
- mutation は、送る（`useGraphQLMutation` を呼ぶ）フィーチャーに置く

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
- 操作を送るフック（`useGraphQLQuery`・`useGraphQLMutation`）は、`graphqls/` ではなく `service.ts` の `useService` で呼ぶ

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
取り直しのための query key も、フィーチャーの外で共有しません。取り直すクエリは、mutation に型の名前で指定します（「取り直すクエリは型（`__typename`）で選ぶ」）。

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

## 操作は、ライブラリを包んだフックに渡して送る

フィーチャーは、データ取得のライブラリ（TanStack Query の `useQuery`・`useMutation`、SWR の `useSWR` など）と fetch の関数を直接使わないでください。
アプリの `src/lib/graphql-client.ts` などにライブラリを包んだフックを置き、フィーチャーはそのフックに `graphqls/` の操作を渡して送ります。

| フック               | 第 2 引数                  | 包むもの（TanStack Query） |
| -------------------- | -------------------------- | -------------------------- |
| `useGraphQLQuery`    | `{ typenames, variables }` | `useQuery`                 |
| `useGraphQLMutation` | `{ refetchTypes }`         | `useMutation`              |

フィーチャーがライブラリを直接使うと、各フィーチャーで query key・fetch の関数・取り直しを書くことになります。
同じ操作に別の key を付けたり、取り直す key を書き漏らしたりしても、型では気付けません。
フックに包めば、key は操作の名前と変数からフックが作り、フィーチャーには操作と変数だけが残ります。
ライブラリを入れ替えるときも、直すのはフックだけです。

```ts
// Good: todo-list/service.ts。操作を渡すだけで、key も fetch の関数も書かない
const { data, isError, isPending } = useGraphQLQuery(TodosQuery, {
  typenames: ["Todo"],
});

// Good: todo-add/service.ts。成功したときだけの処理は mutate の onSuccess に書く
const { isPending, mutate } = useGraphQLMutation(CreateTodoMutation, {
  refetchTypes: ["Todo"],
});
mutate({ input: { title } }, { onSuccess: () => setTitle("") });

// Bad: フィーチャーで key と fetch の関数を組み立てている
const { data } = useQuery({
  queryFn: () => gqlFetch(TodosQuery, {}),
  queryKey: ["todos"],
});
```

フックは、次のように作ります。

- query key は `["graphql", 操作の名前, 変数]` にする。操作の名前は、ドキュメントから `getOperationAST` で読む
- `useGraphQLQuery` の `typenames` は、query の `meta` に持たせる
- `useGraphQLMutation` は、成功したら `refetchTypes` の型を返すクエリを取り直す（`invalidateQueries` の `predicate`）。取り直しの Promise を `onSuccess` から返し、終わるまで `isPending` のままにする

```ts
// src/lib/graphql-client.ts（抜粋）
export const useGraphQLQuery = <Result, Variables>(
  document: TadaDocumentNode<Result, Variables>,
  options?: { typenames?: readonly string[]; variables?: Variables },
) =>
  useQuery({
    meta: { typenames: options?.typenames },
    queryFn: () => gqlFetch(document, options?.variables),
    queryKey: ["graphql", getOperationName(document), options?.variables],
  });
```

フィーチャーからライブラリと fetch の関数を import できないよう、oxlint の `no-restricted-imports` を `src/features/**` に当ててください。

```json
{
  "group": ["@tanstack/react-query", "@/lib/gql.ts"],
  "message": "フィーチャーからは @/lib/graphql-client.ts の useGraphQLQuery・useGraphQLMutation で操作を送ってください"
}
```

## 取り直すクエリは型（`__typename`）で選ぶ

mutation のあとに取り直すクエリは、`useGraphQLMutation` の `refetchTypes` に、変わる型の名前で指定してください。
取り直すクエリの key や、ほかのフィーチャーのクエリを import して指定しません。

```ts
// Good: todo-item/service.ts。Todo を返すクエリをすべて取り直す
const toggle = useGraphQLMutation(UpdateTodoMutation, {
  refetchTypes: ["Todo"],
});

// Bad: 一覧の key をフィーチャーの外に置き、mutation を送る側から指定している
// src/api/todo.ts
export const todosQueryKey = ["todos"];
// todo-item/service.ts
onSuccess: () => queryClient.invalidateQueries({ queryKey: todosQueryKey });
```

key で指定すると、mutation を送るフィーチャーが、取り直すクエリを知っていなければなりません。
クエリを足すたびに mutation の側も直すことになり、key を共有するためにフィーチャーの外へ値を置くことにもなります。
型で指定すれば、mutation の側は自分が変える型だけを書き、どのクエリが取り直されるかはクエリの側で決まります。

クエリが返す型は、キャッシュした結果に含まれる `__typename` と、`useGraphQLQuery` に渡した `typenames` を合わせたものです。
一覧のクエリは空のとき結果から型を拾えないため、`typenames` に型を書いてください。
結果に `__typename` を選ばないクエリも、同じく `typenames` に書きます。

```ts
// Good: 空の一覧からも、追加したあとに取り直せる
useGraphQLQuery(TodosQuery, { typenames: ["Todo"] });

// Bad: 空の一覧は型を拾えず、最初の 1 件を追加しても取り直されない
useGraphQLQuery(TodosQuery);
```

## API のモックは操作から作る

決まった応答を返す API のモックは、`src/mocks/graphql.ts` などに置いたヘルパーで、同じフィーチャーの `graphqls/` の操作から作ってください。
`mocks.ts` で、操作の名前の文字列や、`errors` の JSON をケースごとに書きません。

| ヘルパー              | 作るもの                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `createMockQuery`     | クエリに応答する MSW のハンドラー。resolver が返す `data` は、クエリの結果の型で検査される |
| `createMockMutation`  | mutation に応答する MSW のハンドラー                                                       |
| `mockErrorResolver`   | `errors` を返して、操作を失敗させる resolver。`data` を持たないため、どの操作にも渡せる    |
| `mockLoadingResolver` | 応答を返さず、読み込み中のままにする resolver（MSW の `delay("infinite")`）                |

```ts
// Good: todo-list/mocks.ts
export const TodoListMocks = {
  Error: [
    createMockQuery(TodosQuery, mockErrorResolver("読み込みに失敗しました")),
  ],
  Loading: [createMockQuery(TodosQuery, mockLoadingResolver)],
  Success: createTodoHandlers([buildTodo({ title: "牛乳を買う" })]),
} satisfies Record<string, RequestHandler[]>;

// Bad: 操作の名前を文字列で書き、errors の JSON をケースごとに組み立てている
export const TodoListMocks = {
  Error: [
    graphql.query("Todos", () =>
      HttpResponse.json({ errors: [{ message: "読み込みに失敗しました" }] }),
    ),
  ],
} satisfies Record<string, RequestHandler[]>;
```

操作を渡せば、操作の名前を書き違えることがなく、`data` の形もクエリの結果の型で検査されます。
ハンドラーは、アプリの GraphQL のエンドポイント（`graphql.link`）に結び付けて作ります。
読み込み中の表示も、`mockLoadingResolver` のケースを作り、story で残します（`storybook.md`）。

## lint で強制する

`@ksugawara61/code-lint` の次のルールで、この規約を lint で強制できます。

| ルール                       | 検査すること                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `use-feature-directory`      | `graphqls/` の中にディレクトリを切らず、ファイルを直接置いているか                                    |
| `use-graphql-operation-file` | `graphqls/` のファイルが操作を 1 つだけ export し、名前と種類がファイル名に合っているか               |
| `use-own-fragment`           | `readFragment` に、同じフィーチャーの `graphqls/` から import した fragment だけを渡しているか        |
| `no-cross-feature-import`    | ほかのフィーチャーの `graphqls/` を import していないか（親から直下の子の fragment の import は許す） |
| `no-restricted-imports`      | フィーチャーが、データ取得のライブラリと fetch の関数を直接 import していないか（oxlint の組み込み）  |

`use-graphql-operation-file` は `src/features/**/graphqls/*.ts` に当てます。
`use-own-fragment`・`no-restricted-imports` は `src/features/**` に当てます。
どのパスに当てるかは、リポジトリの oxlint の `overrides` に従ってください。
