import { join } from "node:path";
import { ruleTester } from "../test-utils/rule-tester.ts";
import { useFeatureDirectory } from "./use-feature-directory.ts";

// ファイルシステムは見ないため、存在しないディレクトリを featuresDir にする
const featuresDir = join("/project", "src", "features");
const options = [{ featuresDir, groups: ["shared"] }];
const code = "export const TodoPage = () => null;";

const at = (path: string) => ({
  code,
  filename: join(featuresDir, path),
  options,
});

ruleTester.run("use-feature-directory", useFeatureDirectory, {
  invalid: [
    {
      ...at("todo-page.tsx"),
      errors: 1,
      name: "features 直下のファイルは報告する",
    },
    {
      ...at("shared/button.tsx"),
      errors: 1,
      name: "グループの直下のファイルは報告する",
    },
    {
      ...at("todo-page/todo-list/index.tsx"),
      errors: 1,
      name: "features/ を挟まずにフィーチャーの中に置いたディレクトリは報告する",
    },
    {
      ...at("todo-page/features/todo-list.tsx"),
      errors: 1,
      name: "features/ の直下のファイルは報告する（サブフィーチャーはディレクトリにする）",
    },
    {
      ...at("todo-page/components/empty/index.tsx"),
      errors: 1,
      name: "components/ の中のディレクトリは報告する",
    },
    {
      ...at("todo-page/features/todo-list/components/item/index.tsx"),
      errors: 1,
      name: "サブフィーチャーの components/ の中のディレクトリも報告する",
    },
    {
      ...at("todo-page/graphqls/todos-query/index.ts"),
      errors: 1,
      name: "allowDirs に無いディレクトリは報告する",
    },
    {
      ...at("todo-page/shared/format-date.ts"),
      errors: 1,
      name: "shared/ の直下のファイルは報告する（共有フィーチャーはディレクトリにする）",
    },
    {
      ...at("todo-page/shared/todo-error/utils/format.ts"),
      errors: 1,
      name: "共有フィーチャーの中も features/・shared/・components/ 以外のディレクトリは報告する",
    },
  ],
  valid: [
    {
      ...at("todo-page/index.tsx"),
      name: "フィーチャーのルートのファイルは許可する",
    },
    {
      ...at("todo-page/features/todo-list/index.tsx"),
      name: "features/<name>/ のサブフィーチャーのファイルは許可する",
    },
    {
      ...at("todo-page/features/todo-list/features/todo-item/service.ts"),
      name: "サブフィーチャーの中のサブフィーチャーも許可する",
    },
    {
      ...at("todo-page/components/empty-state.tsx"),
      name: "components/ の直下のファイルは許可する",
    },
    {
      ...at("todo-page/shared/todo-error/index.tsx"),
      name: "shared/<name>/ の共有フィーチャーのファイルは許可する",
    },
    {
      ...at("todo-page/shared/todo-error/features/todo-error-detail/index.tsx"),
      name: "共有フィーチャーの中のサブフィーチャーも許可する",
    },
    {
      ...at(
        "todo-page/features/todo-list/shared/todo-filter/components/chip.tsx",
      ),
      name: "サブフィーチャーの共有フィーチャーの components/ も許可する",
    },
    {
      ...at("shared/scrap-chat/features/scrap-chat-item/index.tsx"),
      name: "グループの中のフィーチャーも同じ構成で許可する",
    },
    {
      code,
      filename: join(featuresDir, "todo-page/graphqls/todos-query/index.ts"),
      name: "allowDirs に挙げたディレクトリは許可する",
      options: [{ allowDirs: ["graphqls"], featuresDir }],
    },
    {
      code,
      filename: join("/project", "src", "app.tsx"),
      name: "featuresDir の外のファイルは対象にしない",
      options,
    },
  ],
});
