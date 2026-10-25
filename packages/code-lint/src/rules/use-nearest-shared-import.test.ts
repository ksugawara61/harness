import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { ruleTester } from "../test-utils/rule-tester.ts";
import { useNearestSharedImport } from "./use-nearest-shared-import.ts";

// ルールはファイルシステムで shared/ の有無を見るため、次のディレクトリを用意する
// - todo-page/shared/todo-error/
// - todo-page/shared/todo-banner/shared/todo-icon/（自身も shared/ を持つ共有フィーチャー）
// - todo-page/features/todo-list/shared/todo-filter/
// - shared/scrap-chat/shared/scrap-avatar/（グループの中のフィーチャー）
// todo-page/features/todo-add/ と todo-page/features/todo-list/features/todo-item/ は shared/ を持たない
const root = mkdtempSync(join(tmpdir(), "use-nearest-shared-import-"));
const src = join(root, "src");
const featuresDir = join(src, "features");
const todoPage = join(featuresDir, "todo-page");
for (const dir of [
  join(todoPage, "shared", "todo-error"),
  join(todoPage, "shared", "todo-banner", "shared", "todo-icon"),
  join(todoPage, "features", "todo-list", "shared", "todo-filter"),
  join(featuresDir, "shared", "scrap-chat", "shared", "scrap-avatar"),
]) {
  mkdirSync(dir, { recursive: true });
}

afterAll(() => {
  rmSync(root, { force: true, recursive: true });
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
        'import { TodoError } from "../../shared/todo-error/index.tsx";',
      ),
      errors: 1,
      name: "自分の shared/ があるときの親のフィーチャーの共有フィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/features/todo-item/index.tsx",
        'import { TodoError } from "../../../../shared/todo-error/index.tsx";',
      ),
      errors: 1,
      name: "間により近い shared/ があるときの遠い親の共有フィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-add/index.tsx",
        'import { TodoFilter } from "../todo-list/shared/todo-filter/index.tsx";',
      ),
      errors: 1,
      name: "兄弟のサブフィーチャーの共有フィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoFilter } from "./features/todo-list/shared/todo-filter/index.tsx";',
      ),
      errors: 1,
      name: "子のサブフィーチャーの共有フィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/shared/todo-banner/index.tsx",
        'import { TodoError } from "../todo-error/index.tsx";',
      ),
      errors: 1,
      name: "自身も shared/ を持つ共有フィーチャーからの兄弟の共有フィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { TodoFilter } from "@/features/todo-page/features/todo-list/shared/todo-filter/index.tsx";',
      ),
      errors: 1,
      name: "一番近い shared/ でもパスエイリアスで書いた import は報告する",
    },
    {
      ...from(
        "features/todo-page/shared/todo-banner/index.tsx",
        'import { useService } from "@/features/todo-page/shared/todo-banner/service.ts";',
      ),
      errors: 1,
      name: "共有フィーチャーの中のファイルどうしでもパスエイリアスで書いた import は報告する",
    },
    {
      ...from(
        "app/index.tsx",
        'import { TodoError } from "@/features/todo-page/shared/todo-error/index.tsx";',
      ),
      errors: 1,
      name: "features の外からの共有フィーチャーの import は報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/mocks.ts",
        'export { TodoErrorMocks } from "../../shared/todo-error/mocks.ts";',
      ),
      errors: 1,
      name: "一番近くない shared/ からの re-export も報告する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'const TodoError = lazy(() => import("../../shared/todo-error/index.tsx"));',
      ),
      errors: 1,
      name: "一番近くない shared/ の動的 import も報告する",
    },
  ],
  valid: [
    {
      ...from(
        "features/todo-page/index.tsx",
        'import { TodoError } from "./shared/todo-error/index.tsx";',
      ),
      name: "自分の shared/ の共有フィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-add/index.tsx",
        'import { TodoError } from "../../shared/todo-error/index.tsx";',
      ),
      name: "自分の shared/ が無いときの親のフィーチャーの共有フィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/features/todo-item/index.tsx",
        'import { TodoFilter } from "../../shared/todo-filter/index.tsx";',
      ),
      name: "一番近い親の共有フィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/components/todo-remaining.tsx",
        'import { TodoFilter } from "../shared/todo-filter/index.tsx";',
      ),
      name: "components/ からの自分のフィーチャーの共有フィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/shared/todo-error/stories.tsx",
        'import { TodoError } from "./index.tsx";\nimport { TodoErrorMocks } from "./mocks.ts";',
      ),
      name: "共有フィーチャーの中のファイルどうしの import は許可する",
    },
    {
      ...from(
        "features/todo-page/shared/todo-error/index.tsx",
        'import { TodoBanner } from "../todo-banner/index.tsx";',
      ),
      name: "shared/ を持たない共有フィーチャーからの兄弟の共有フィーチャーの import は許可する",
    },
    {
      ...from(
        "features/todo-page/shared/todo-banner/index.tsx",
        'import { useService } from "./service.ts";\nimport { TodoIcon } from "./shared/todo-icon/index.tsx";',
      ),
      name: "自身も shared/ を持つ共有フィーチャーの中のファイルと自身の shared/ の import は許可する",
    },
    {
      ...from(
        "features/todo-page/features/todo-list/index.tsx",
        'import { TodoFilter } from "./shared/todo-filter";',
      ),
      name: "共有フィーチャーのディレクトリを指す import も一番近ければ許可する",
    },
    {
      ...from(
        "features/shared/scrap-chat/features/scrap-chat-item/index.tsx",
        'import { ScrapAvatar } from "../../shared/scrap-avatar/index.tsx";',
      ),
      name: "グループの中のフィーチャーでも一番近い親の共有フィーチャーの import は許可する",
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
      name: "共有フィーチャー以外の import は対象にしない",
    },
  ],
});
