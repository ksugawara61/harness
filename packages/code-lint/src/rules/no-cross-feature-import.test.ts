import { join } from "node:path";
import { ruleTester } from "../test-utils/rule-tester.ts";
import { noCrossFeatureImport } from "./no-cross-feature-import.ts";

// ファイルシステムは見ないため、存在しないディレクトリを featuresDir にする
const src = join("/project", "src");
const featuresDir = join(src, "features");
const options = [
  { aliases: { "@/": `${src}/` }, featuresDir, groups: ["shared"] },
];

const from = (path: string, code: string) => ({
  code,
  filename: join(src, path),
  options,
});

ruleTester.run("no-cross-feature-import", noCrossFeatureImport, {
  invalid: [
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoList } from "../todo-list/index.tsx";',
      ),
      errors: 1,
      name: "features 直下のほかのフィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoList } from "../todo-list";',
      ),
      errors: 1,
      name: "ディレクトリを指す import も報告する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoItem } from "./features/todo-list/features/todo-item/index.tsx";',
      ),
      errors: 1,
      name: "孫のサブフィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { TodoAdd } from "../todo-add/index.tsx";',
      ),
      errors: 1,
      name: "兄弟のサブフィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { Header } from "../../components/header.tsx";',
      ),
      errors: 1,
      name: "親のフィーチャーのファイルの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-add/index.tsx",
        'import { filterTodos } from "../todo-list/shared/filter.ts";',
      ),
      errors: 1,
      name: "兄弟のサブフィーチャーの shared/ の import は報告する",
    },
    {
      ...from(
        "features/todo-page/mocks.ts",
        'export { TodoListMocks } from "../todo-list/mocks.ts";',
      ),
      errors: 1,
      name: "ほかのフィーチャーからの re-export も報告する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'const TodoList = lazy(() => import("../todo-list/index.tsx"));',
      ),
      errors: 1,
      name: "ほかのフィーチャーの動的 import も報告する",
    },
    {
      ...from(
        "app.tsx",
        'import { TodoList } from "./features/todo-page/features/todo-list/index.tsx";',
      ),
      errors: 1,
      name: "features の外からのサブフィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoList } from "@/features/todo-list";',
      ),
      errors: 1,
      name: "パスエイリアスで書いたほかのフィーチャーの import も報告する",
    },
    {
      ...from(
        "app/index.tsx",
        'import { TodoList } from "@/features/todo-page/features/todo-list/index.tsx";',
      ),
      errors: 1,
      name: "ルーティングのファイルからのサブフィーチャーの import は報告する",
    },
  ],
  valid: [
    {
      ...from(
        "features/todo-page/test.tsx",
        'import { TodoPage } from "./index.tsx";\nimport { TodoPageMocks } from "./mocks.ts";',
      ),
      name: "同じフィーチャーのファイルの import は許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoList } from "./features/todo-list/index.tsx";\nimport { Empty } from "./components/empty.tsx";',
      ),
      name: "直下のサブフィーチャーと自分の components/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { TodoItem } from "./features/todo-item";',
      ),
      name: "サブフィーチャーからその直下のサブフィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/features/todo-item/service.ts",
        'import { formatDate } from "../../../../shared/format.ts";\nimport { filterTodos } from "../../shared/filter.ts";',
      ),
      name: "親のフィーチャーの shared/ の import は許可する（どの shared/ に限るかは use-nearest-shared-import が見る）",
    },
    {
      ...from(
        "features/todo-page/components/empty.tsx",
        'import { Button } from "../../../ui/button/index.tsx";',
      ),
      name: "featuresDir の外のモジュールの import は許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { ScrapChat } from "../shared/scrap-chat/index.tsx";',
      ),
      name: "グループの中のフィーチャーの import は許可する",
    },
    {
      ...from(
        "app.tsx",
        'import { TodoPage } from "./features/todo-page/index.tsx";',
      ),
      name: "features の外からの features 直下のフィーチャーの import は許可する",
    },
    {
      ...from(
        "app/index.tsx",
        'import { TodoPage } from "@/features/todo-page/index.tsx";',
      ),
      name: "パスエイリアスで書いた features 直下のフィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { ScrapChat } from "@/features/shared/scrap-chat";',
      ),
      name: "パスエイリアスで書いたグループの中のフィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { useQuery } from "@tanstack/react-query";',
      ),
      name: "相対パスでもパスエイリアスでもない import は対象にしない",
    },
  ],
});
