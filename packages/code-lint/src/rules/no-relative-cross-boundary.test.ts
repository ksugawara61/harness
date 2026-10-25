import { join } from "node:path";
import { ruleTester } from "../test-utils/rule-tester.ts";
import { noRelativeCrossBoundary } from "./no-relative-cross-boundary.ts";

// ファイルシステムは見ないため、存在しないディレクトリをエイリアスの解決先にする
const src = join("/project", "src");
const options = [
  {
    aliases: { "@/": `${src}/` },
    featuresDir: join(src, "features"),
    groups: ["shared"],
  },
];

const from = (path: string, code: string) => ({
  code,
  filename: join(src, path),
  options,
});

ruleTester.run("no-relative-cross-boundary", noRelativeCrossBoundary, {
  invalid: [
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { Button } from "../../ui/button/index.tsx";',
      ),
      errors: [
        {
          message:
            '境界（フィーチャー・レイヤー）を越える import は、相対パスではなくパスエイリアスで書いてください（"@/ui/button/index.tsx"）',
        },
      ],
      name: "フィーチャーからレイヤーへの相対パスの import は報告し、エイリアスのパスを示す",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/test.tsx",
        'import { server } from "../../../../test-utils/server.ts";',
      ),
      errors: 1,
      name: "サブフィーチャーからレイヤーへの相対パスの import も報告する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { ScrapChat } from "../shared/scrap-chat/index.tsx";',
      ),
      errors: 1,
      name: "グループの中のフィーチャーへの相対パスの import は報告する",
    },
    {
      ...from(
        "features/shared/scrap-chat/index.tsx",
        'import { Diary } from "../diary-form/index.tsx";',
      ),
      errors: 1,
      name: "グループの中のフィーチャー同士の相対パスの import は報告する",
    },
    {
      ...from(
        "app/index.tsx",
        'import { TodoPage } from "../features/todo-page/index.tsx";',
      ),
      errors: 1,
      name: "ルーティングのレイヤーからフィーチャーへの相対パスの import は報告する",
    },
    {
      ...from("main.tsx", 'import { App } from "./app.tsx";'),
      errors: 1,
      name: "直下のファイル同士の相対パスの import は報告する",
    },
    {
      ...from(
        "api/todo.ts",
        'export { createTodoHandlers } from "../mocks/handlers.ts";',
      ),
      errors: 1,
      name: "レイヤーを越える re-export も報告する",
    },
    {
      ...from(
        "stories.test.tsx",
        'const load = () => import("./test-utils/server.ts");',
      ),
      errors: 1,
      name: "レイヤーを越える動的 import も報告する",
    },
  ],
  valid: [
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { schema } from "../../schema.ts";\nimport { TodoItem } from "./features/todo-item/index.tsx";',
      ),
      name: "同じフィーチャーの内側は、親方向の相対パスでも許可する",
    },
    {
      ...from(
        "features/shared/scrap-chat/features/input/index.tsx",
        'import { schema } from "../../schema.ts";',
      ),
      name: "グループの中の同じフィーチャーの内側の相対パスは許可する",
    },
    {
      ...from(
        "ui/button/index.tsx",
        'import { Icon } from "../icon/index.tsx";',
      ),
      name: "同じレイヤーの内側の相対パスは許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { Button } from "@/ui/button/index.tsx";',
      ),
      name: "パスエイリアスの import は許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import logo from "../../../assets/logo.png";',
      ),
      name: "エイリアスのディレクトリの外の import は対象にしない",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { useQuery } from "@tanstack/react-query";',
      ),
      name: "パッケージの import は対象にしない",
    },
    {
      code: 'import { App } from "../src/app.tsx";',
      filename: join("/project", ".storybook", "preview.tsx"),
      name: "エイリアスのディレクトリの外のファイルは対象にしない",
      options,
    },
  ],
});
