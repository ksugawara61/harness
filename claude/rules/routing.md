---
description: ルーティングのディレクトリ（app・routes など）とフィーチャーの役割分担。ルーティングのライブラリを問わない
paths:
  - "**/src/app/**"
  - "**/src/routes/**"
  - "**/src/pages/**"
---

# ルーティングのガイドライン

URL と画面の対応をルーティングのディレクトリに、画面の中身を `src/features/` に置き分ける規約を決めます。
expo-router・TanStack Router・React Router・Next.js など、ルーティングのライブラリを問わずに当てます。
コードレビュー時は以下のルールに基づいて指摘してください。

- 画面の中身（ページのフィーチャー）の構成 → `feature-directory.md`
- import のパスの書き方 → `import-path.md`
- リポジトリ側に独自のルーティングの規約がある場合は、そちらを優先してください

## ルーティングのディレクトリにはルートの定義だけを置く

ルーティングのディレクトリには、ライブラリが決めるルートのファイルだけを置いてください。
ディレクトリの名前と置き方はライブラリと設定に従います。

| ライブラリ                    | ルーティングのディレクトリの例                                             |
| ----------------------------- | -------------------------------------------------------------------------- |
| expo-router                   | `src/app/`（`_layout.tsx`・`(group)/` など）                               |
| TanStack Router（file-based） | `routesDirectory` に指定したディレクトリ（`src/app/`・`src/routes/` など） |
| Next.js（App Router）         | `src/app/`（`page.tsx`・`layout.tsx` など）                                |

ルートのファイルの役割は、次の 3 つだけです。

- パスとルートの対応を宣言する（`createFileRoute("/")`・`export default` など、ライブラリの書き方に従う）
- パスのパラメーターやクエリを読み、ページに Props で渡す
- レイアウト（タブ・スタック・`<Outlet />` など）を組む

データの取得・状態・イベントハンドラーなどのロジックは置かず、`src/features/` のページの `service.ts` に置いてください。
ルートのファイルに部品やロジックを足すと、ルーティングのライブラリを替えるときは画面ごと書き直すことになります。
テストと Storybook の対象からも外れます。

```tsx
// Good（expo-router）: パラメーターを読んで、ページに渡すだけ
import { useLocalSearchParams } from "expo-router";
import { BookDetail } from "@/features/book-detail";

export default function BookDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookDetail id={id ?? ""} />;
}

// Good（TanStack Router）: ページをそのまま component に渡す
import { createFileRoute } from "@tanstack/react-router";
import { TodoPage } from "@/features/todo-page/index.tsx";

export const Route = createFileRoute("/")({ component: TodoPage });

// Bad: ルートのファイルでデータを取得し、一覧を描画している
export const Route = createFileRoute("/")({
  component: () => {
    const { data } = useQuery(todosQueryOptions);
    return (
      <ul>
        {data?.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    );
  },
});
```

## ルートのファイルからは features 直下のページだけを import する

ルートのファイルから描画するのは、`src/features/` 直下のページのフィーチャーだけです。
1 つのルートに 1 つのページを対応させ、ページの部品（サブフィーチャー・`components/`）を直接 import しないでください。
import は `@/features/<page>/...` のパスエイリアスで書きます。

## フィーチャーからルーティングのディレクトリを import しない

フィーチャーはルーティングのディレクトリに依存させないでください。
`Route.useParams()` のようにルートの定義をフィーチャーから参照すると、フィーチャーを別のルートや Storybook で描画できなくなります。
パスのパラメーターは、ルートのファイルで読んでページの Props にします。

画面の遷移には、ルーティングのライブラリのフック（`useRouter`・`useNavigate` など）を使います。
フックは `service.ts` の `useService` の中で呼び、遷移は `handleXxx` の中で完結させてください。
ルーターの値そのものは `useService` の return に含めません。

## lint で強制する

`@ksugawara61/code-lint` の次のルールで、この役割分担を lint で強制できます。

| ルール                            | 当てる範囲                 | 検査すること                                                                  |
| --------------------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `no-logic-in-routes`              | ルーティングのディレクトリ | `allowHooks` に挙げたフック（パラメーターの読み取りなど）以外を呼ばないか     |
| `no-cross-feature-import`         | `src/**`                   | ルーティングのディレクトリなど、features の外からはページだけを import するか |
| `no-router-in-use-service-return` | `service.ts`               | `hooks` に挙げたフックの値を `useService` の return に含めないか              |
| `no-restricted-imports`（oxlint） | `src/features/**`          | ルーティングのディレクトリ（`@/app/*` など）を import しないか                |

`no-logic-in-routes` の `allowHooks` と `no-router-in-use-service-return` の `hooks` は、使うライブラリに合わせて設定します。

| ライブラリ      | `allowHooks`                       | `hooks`                        |
| --------------- | ---------------------------------- | ------------------------------ |
| expo-router     | `["useLocalSearchParams"]`         | `["useRouter"]`                |
| TanStack Router | `["useParams", "useSearch"]`       | `["useRouter", "useNavigate"]` |
| Next.js         | `["useParams", "useSearchParams"]` | `["useRouter"]`                |

どのディレクトリに当てるかは、リポジトリの oxlint の `overrides` に従ってください。
