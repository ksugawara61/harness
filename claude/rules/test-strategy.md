---
description: 全テスト共通の方針。何をテストし、何をテストしないかを決める
paths:
  - "**/*.test.{ts,tsx}"
  - "**/test.{ts,tsx}"
---

# テスト戦略のコーディングガイドライン

**何をテストし、何をテストしないか** を決めます。すべてのテストに適用します。
コードレビュー時は以下のルールに基づいて指摘してください。

- テストの書き方 → `test.md`
- リポジトリ側に独自のテスト規約がある場合は、そちらを優先してください

## 実装を書き換えても通るテストだけを書く

内部の名前・呼び出し順・内部状態に依存したテストは、実装を整理しただけで落ちるため書かないでください。
**リファクタリングへの耐性を最優先** します。

```ts
// Good: 公開された振る舞い（保存されたこと）だけを検証している
it("TODO を作成して保存する", async () => {
  const result = await createTodo({ title: "牛乳を買う" });

  expect(await findTodoInDb(result.id)).toMatchObject({ title: "牛乳を買う" });
});

// Bad: 内部の協力者の呼び出し方に依存している（1 クエリ化をやめた瞬間に落ちる）
it("表示名は findByUserIds で 1 クエリ解決する", async () => {
  const findByUserIds = vi.spyOn(
    UserProfileRepository.prototype,
    "findByUserIds",
  );

  await createTodo({ assigneeUserId: ASSIGNEE_USER_ID, title: "ゴミを出す" });

  expect(findByUserIds).toHaveBeenCalledOnce();
  expect(findByUserIds).toHaveBeenCalledWith([ASSIGNEE_USER_ID]);
});
```

## 自明なコードにはテストを書かない

単純マッピング・getter・薄い委譲・export の有無は tsc が保証します。
テストを書くのは分岐・重複排除・早期 return のあるロジックだけにしてください。

```ts
// Good: 分岐と重複排除のあるロジックにユニットテストを書いている（findAssigneeDisplayNames）
it("担当者ありの TODO が無ければ repository を呼ばない", ...);
it("プロフィール未登録の担当者は索引に含まれない", ...);

// Bad: 単純マッピングをフィールドごとに検証している（toTodoResponse）
it("todo.title を title にマッピングする", ...);
it("todo.memo を memo にマッピングする", ...);

// Bad: 型が保証することをテストで確認している
it("createTodo を export している", () => {
  expect(module).toHaveProperty("createTodo");
});
```

## 状態の抜けはテストではなく型で防ぐ

判別可能ユニオン ＋ 網羅 `switch` の `const _exhaustive: never` で tsc に検出させるのが既定です。
型で表せない振る舞いだけテストを書いてください。

```ts
// Good: source の追加を tsc に検出させている
switch (input.source) {
  case "database": {
    return await getDatabaseArticles(input);
  }
  case "rss": {
    return await getRssArticles(input, ...);
  }
  default: {
    const _exhaustive: never = input.source;
    throw new ServiceError(`Unknown article source: ${_exhaustive}`, { ... });
  }
}

// Bad: 網羅を型で保証せず、ケースごとのテストで代替している
const getArticles = async (input: { source: string }) => {
  if (input.source === "database") return await getDatabaseArticles(input);
  if (input.source === "rss") return await getRssArticles(input, ...);
  return [];
};
```

## CRUD は 1 操作あたり標準リストだけ書く

1 操作につき **正常系 1 本 / 意味のある境界 / 認可 / 見つからない・競合** の 4 種類だけ書いてください。
超えるときはテストリストに理由を書いてください。

```ts
// Good: 標準リストの 4 本に収まっている
describe("createTodo", () => {
  it("TODO を作成して保存する", ...); // 正常系（findTodoInDb で実 DB を確認）
  it("memo が上限を超えるとエラーになる", ...); // 意味のある境界
  it("他の family の TODO は操作できない", ...); // 認可
  it("存在しない担当者を指定するとエラーになる", ...); // not found
});

// Bad: 正常系を入力の組み合わせごとに並べ、共通処理を再検証している
describe("createTodo", () => {
  it("タイトルのみで作成する", ...);
  it("メモ付きで作成する", ...);
  it("担当者付きで作成する", ...);
  it("期限付きで作成する", ...);
  it("repository が Error を投げたら ServiceError に変換する", ...); // toServiceError は 1 箇所で確認済み
  it("repository が Error 以外を投げたら Unknown error として扱う", ...);
});
```

## モックしてよいのはプロセス外依存だけ

モックしてよいのは自分たちの管理外にあるプロセス外依存（外部 API、通知送信、課金）だけです。
フロントエンドでは API 境界（GraphQL / REST）を MSW などで差し替えるのを唯一のモック点にします。
**内部の Repository・UseCase・子コンポーネントはモックしない**。DB もモックせず、テスト用の実 DB（SQLite など）で確認してください。

```tsx
// Good: フロントエンドは API 境界を MSW で差し替える
server.use(...TodoAddMocks.Success);
await renderSuspense(<TodoAdd />);

// Good: DB はモックせず実 DB の結果で確認する
const result = await createTodo({ title: "牛乳を買う" });
expect(await findTodoInDb(result.id)).toMatchObject({ title: "牛乳を買う" });

// Bad: 内部の Repository をモックしている
vi.spyOn(TodoRepository.prototype, "create").mockRejectedValue(
  new Error("Unexpected DB error"),
);
```

## 呼び出し検証は管理外依存への副作用があるときだけ書く

内部の呼び出し回数・引数・順序は検証しないでください。

```ts
// Good: mutation が送られた／送られていないことだけを検証している
const { handler, resolver } = spyOnMock(TodoAddMocks.Success[1]);
server.use(TodoAddMocks.Success[0], handler);

// ...バリデーションエラーになる操作...

expect(resolver).not.toHaveBeenCalled();

// Bad: 内部の協力者の呼び出し回数を検証している
expect(findByUserIds).toHaveBeenCalledOnce();
expect(findByUserIds).not.toHaveBeenCalled();
```

## 同じ振る舞いを層をまたいで二度検証しない

子フィーチャー・子コンポーネントで検証した振る舞いは親では検証しないでください。逆も同じです。

```tsx
// Good: 親（TodoAdd）はフィーチャーの結合だけを検証する
it("追加するとやることが作成され前の画面に戻る", ...);
it("追加に失敗した場合はエラートーストを表示して画面に留まる", ...);

// Bad: 子コンポーネントで検証済みの入力挙動を親でも検証している
it("タイトルに入力した文字がテキストフィールドに表示される", ...);
```

## 見た目の検証は VRT に任せる

色・余白・レイアウトは `toHaveStyle` で検証せず、Storybook の story を足して VRT（ビジュアルリグレッションテスト）で確認してください。

```tsx
// Good: story を足して VRT で見る
export const Completed: Story = {
  args: { completed: true },
};

// Bad: スタイル値をテストで検証している
expect(screen.getByText("牛乳を買う")).toHaveStyle({ color: "#9CA3AF" });
```

## テストの単位はファイルではなく振る舞いにする

実装ファイル 1 つにつきテストファイル 1 つを機械的に作らないでください。
ユースケースやフィーチャー（画面・コンポーネントの入口）から書き、
内側の層は間接的に覆います。分岐の多いロジックが現れたときだけ純粋関数に切り出し、そこにユニットテストを足してください。

```text
# Good: 外側の結合テスト ＋ 分岐のある純粋関数のユニットテスト
application/todo/mutations/create-todo/test.ts  # ユースケースの結合テスト
domain/todo/assignee.test.ts                    # 分岐のある純粋関数

# Bad: 実装ファイルごとに機械的にテストファイルを作る
domain/todo/model.test.ts   # 型定義だけ
domain/todo/schema.test.ts  # tsc が保証する
```

## ロジックと I/O が混在した関数はテストの前に分離を提案する

そのままテストを書くとモックが必要になります。テストを書く前に純粋関数への切り出しを提案してください。

```ts
// Good: I/O は呼び出し側に残し、判断は純粋関数に切り出してテストする
export const resolveAssignee = (
  assigneeUserId: string | null,
  displayNameByUserId: Record<string, string>,
): TodoAssignee | null => { ... };

// Bad: 1 つの関数で取得と判断を行っており、テストに Repository のモックが必要になる
export const resolveAssignee = async (
  assigneeUserId: string | null,
  profileRepository: IUserProfileRepository,
): Promise<TodoAssignee | null> => {
  const profiles = await profileRepository.findByUserIds([assigneeUserId]);
  ...
};
```

## TDD は「テストリスト → 外側 1 本 → 最小実装 → リファクタ」の順で進める

1. 実装の前にテストリスト（`it` の名前だけ）を出して合意を取る
2. いちばん外側から 1 本書く（ユースケース、またはフィーチャーの `index.tsx`）
3. 落ちることを確認してから最小の実装を書く
4. リファクタする。分岐の多いロジックが現れたときだけ純粋関数に切り出し、ユニットテストを足す
