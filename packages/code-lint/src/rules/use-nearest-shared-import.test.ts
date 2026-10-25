import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { ruleTester } from "../test-utils/rule-tester.ts";
import { useNearestSharedImport } from "./use-nearest-shared-import.ts";

// ルールはファイルシステムで shared/ の有無を見るため、次のディレクトリを用意する
// - todo-page/shared/
// - todo-page/features/todo-list/shared/
// - shared/scrap-chat/shared/（グループの中のフィーチャー）
// todo-page/features/todo-add/ と todo-page/features/todo-list/features/todo-item/ は shared/ を持たない
const src = join(
  mkdtempSync(join(tmpdir(), "use-nearest-shared-import-")),
  "src",
);
const featuresDir = join(src, "features");
const todoPage = join(featuresDir, "todo-page");
const todoList = join(todoPage, "features", "todo-list");
mkdirSync(join(todoPage, "shared"), { recursive: true });
mkdirSync(join(todoList, "shared"), { recursive: true });
mkdirSync(join(featuresDir, "shared", "scrap-chat", "shared"), {
  recursive: true,
});

afterAll(() => {
  rmSync(join(src, ".."), { force: true, recursive: true });
});

const options = [
  { aliases: { "@/": `${src}/` }, featuresDir, groups: ["shared"] },
];

const from = (path: string, code: string) => ({
  code,
  filename: join(src, path),
  options,
});

ruleTester.run("use-nearest-shared-import", useNearestSharedImport, {
  invalid: [
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { formatDate } from "../../shared/format.ts";',
      ),
      errors: 1,
      name: "自分の shared/ があるときの親のフィーチャーの shared/ の import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/features/todo-item/index.tsx",
        'import { formatDate } from "../../../../shared/format.ts";',
      ),
      errors: 1,
      name: "間により近い shared/ があるときの遠い親の shared/ の import は報告する",
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
        "features/todo-page/index.tsx",
        'import { filterTodos } from "./features/todo-list/shared/filter.ts";',
      ),
      errors: 1,
      name: "子のサブフィーチャーの shared/ の import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { filterTodos } from "@/features/todo-page/features/todo-list/shared/filter.ts";',
      ),
      errors: 1,
      name: "一番近い shared/ でもパスエイリアスで書いた import は報告する",
    },
    {
      ...from(
        "app/index.tsx",
        'import { formatDate } from "@/features/todo-page/shared/format.ts";',
      ),
      errors: 1,
      name: "features の外からの shared/ の import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/mocks.ts",
        'export { formatDate } from "../../shared/format.ts";',
      ),
      errors: 1,
      name: "一番近くない shared/ からの re-export も報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'const format = () => import("../../shared/format.ts");',
      ),
      errors: 1,
      name: "一番近くない shared/ の動的 import も報告する",
    },
  ],
  valid: [
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { formatDate } from "./shared/format.ts";',
      ),
      name: "自分の shared/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-add/service.ts",
        'import { formatDate } from "../../shared/format.ts";',
      ),
      name: "自分の shared/ が無いときの親のフィーチャーの shared/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/features/todo-item/service.ts",
        'import { filterTodos } from "../../shared/filter.ts";',
      ),
      name: "一番近い親の shared/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/components/todo-remaining.tsx",
        'import { countRemaining } from "../shared/count.ts";',
      ),
      name: "components/ からの自分のフィーチャーの shared/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/shared/filter.ts",
        'import { isDone } from "./is-done.ts";',
      ),
      name: "shared/ の中どうしの import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import * as shared from "./shared";',
      ),
      name: "shared/ のディレクトリを指す import も一番近ければ許可する",
    },
    {
      ...from(
        "features/shared/scrap-chat/features/scrap-chat-item/index.tsx",
        'import { formatMessage } from "../../shared/format.ts";',
      ),
      name: "グループの中のフィーチャーでも一番近い親の shared/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { ScrapChat } from "@/features/shared/scrap-chat/index.tsx";',
      ),
      name: "グループ（features 直下の shared）の中のフィーチャーの import は対象にしない",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { Button } from "@/ui/button/index.tsx";\nimport { useService } from "./service.ts";',
      ),
      name: "shared/ 以外の import は対象にしない",
    },
  ],
});
