import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { cruise, type IViolation } from "dependency-cruiser";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";
import { afterAll, describe, expect, it } from "vitest";
import { sharedFeatureRules } from "./dependency-cruiser.ts";

// 次の構成のプロジェクトを作り、dependency-cruiser で実際に検査する
// - todo-page/shared/todo-error/（共有フィーチャー）
// - todo-page/features/todo-list/shared/todo-filter/（サブフィーチャーの共有フィーチャー）
// - shared/scrap-chat/shared/scrap-avatar/（グループの中のフィーチャーの共有フィーチャー）
const root = mkdtempSync(join(tmpdir(), "shared-feature-rules-"));

const files: Record<string, string> = {
  "src/app/index.ts":
    'import { TodoPage } from "@/features/todo-page/index.ts";\nimport { TodoError } from "@/features/todo-page/shared/todo-error/index.ts";\nexport { TodoPage, TodoError };',
  "src/features/shared/scrap-chat/features/scrap-chat-item/index.ts":
    'export { ScrapAvatar } from "../../shared/scrap-avatar/index.ts";',
  "src/features/shared/scrap-chat/index.ts":
    'export { ScrapChatItem } from "./features/scrap-chat-item/index.ts";',
  "src/features/shared/scrap-chat/shared/scrap-avatar/index.ts":
    "export const ScrapAvatar = 1;",
  "src/features/todo-page/features/todo-add/index.ts":
    'export { TodoError } from "../../shared/todo-error/index.ts";\nexport { TodoFilter } from "../todo-list/shared/todo-filter/index.ts";',
  "src/features/todo-page/features/todo-list/features/todo-item/index.ts":
    'export { TodoFilter } from "../../shared/todo-filter/index.ts";\nexport { TodoError } from "../../../../shared/todo-error/index.ts";',
  "src/features/todo-page/features/todo-list/index.ts":
    'export { TodoItem } from "./features/todo-item/index.ts";\nexport { TodoFilter } from "@/features/todo-page/features/todo-list/shared/todo-filter/index.ts";',
  "src/features/todo-page/features/todo-list/shared/todo-filter/index.ts":
    'export { useService } from "./service.ts";',
  "src/features/todo-page/features/todo-list/shared/todo-filter/service.ts":
    "export const useService = 1;",
  "src/features/todo-page/index.ts":
    'export { TodoAdd } from "./features/todo-add/index.ts";\nexport { TodoList } from "./features/todo-list/index.ts";\nexport { TodoError } from "./shared/todo-error/index.ts";',
  "src/features/todo-page/shared/todo-error/index.ts":
    "export const TodoError = 1;",
  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      allowImportingTsExtensions: true,
      baseUrl: ".",
      module: "preserve",
      noEmit: true,
      paths: { "@/*": ["./src/*"] },
    },
  }),
};
for (const [path, content] of Object.entries(files)) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

afterAll(() => {
  rmSync(root, { force: true, recursive: true });
});

const cruiseViolations = async (): Promise<IViolation[]> => {
  const tsConfigFile = join(root, "tsconfig.json");
  const result = await cruise(
    ["src"],
    {
      baseDir: root,
      ruleSet: {
        forbidden: sharedFeatureRules({ cwd: root, groups: ["shared"] }),
      },
      tsConfig: { fileName: tsConfigFile },
      tsPreCompilationDeps: true,
      validate: true,
    },
    {},
    { tsConfig: extractTSConfig(tsConfigFile) },
  );
  if (typeof result.output === "string") throw new Error(result.output);
  return result.output.summary.violations;
};

const toPairs = (violations: IViolation[]) =>
  violations
    .map(({ from, rule, to }) => `${rule.name}: ${from} -> ${to}`)
    .toSorted();

describe("sharedFeatureRules", () => {
  it("shared/ を持つフィーチャーごとに、一番近い shared/ とパスエイリアスのルールを返す", () => {
    const rules = sharedFeatureRules({ cwd: root, groups: ["shared"] });
    expect(
      rules.map(({ from, name, to }) => ({ from, name, to })),
    ).toStrictEqual([
      {
        from: { pathNot: "^(?:src/features/shared/scrap-chat)/" },
        name: "shared-not-nearest",
        to: { path: "^(?:src/features/shared/scrap-chat/shared)/" },
      },
      {
        from: {},
        name: "shared-not-relative",
        to: {
          dependencyTypes: ["aliased", "undetermined"],
          path: "^(?:src/features/shared/scrap-chat/shared)/",
        },
      },
      {
        from: { pathNot: "^(?:src/features/todo-page)/" },
        name: "shared-not-nearest",
        to: { path: "^(?:src/features/todo-page/shared)/" },
      },
      {
        from: { path: "^(?:src/features/todo-page/features/todo-list)/" },
        name: "shared-not-nearest",
        to: {
          path: "^(?:src/features/todo-page/shared)/",
          pathNot: "^(?:src/features/todo-page/features/todo-list)/",
        },
      },
      {
        from: {},
        name: "shared-not-relative",
        to: {
          dependencyTypes: ["aliased", "undetermined"],
          path: "^(?:src/features/todo-page/shared)/",
        },
      },
      {
        from: { pathNot: "^(?:src/features/todo-page/features/todo-list)/" },
        name: "shared-not-nearest",
        to: { path: "^(?:src/features/todo-page/features/todo-list/shared)/" },
      },
      {
        from: {},
        name: "shared-not-relative",
        to: {
          dependencyTypes: ["aliased", "undetermined"],
          path: "^(?:src/features/todo-page/features/todo-list/shared)/",
        },
      },
    ]);
  });

  it("featuresDir が無ければルールを返さない", () => {
    expect(
      sharedFeatureRules({ cwd: root, featuresDir: "src/missing" }),
    ).toStrictEqual([]);
  });

  it("dependency-cruiser で、一番近くない shared/ とパスエイリアスの import を報告する", async () => {
    expect(toPairs(await cruiseViolations())).toStrictEqual([
      // features の外からの共有フィーチャーの import
      "shared-not-nearest: src/app/index.ts -> src/features/todo-page/shared/todo-error/index.ts",
      // 兄弟のサブフィーチャーの共有フィーチャーの import
      "shared-not-nearest: src/features/todo-page/features/todo-add/index.ts -> src/features/todo-page/features/todo-list/shared/todo-filter/index.ts",
      // より近い todo-list/shared/ があるときの、ページの共有フィーチャーの import
      "shared-not-nearest: src/features/todo-page/features/todo-list/features/todo-item/index.ts -> src/features/todo-page/shared/todo-error/index.ts",
      // features の外から、パスエイリアスで書いた import
      "shared-not-relative: src/app/index.ts -> src/features/todo-page/shared/todo-error/index.ts",
      // 一番近い shared/ でもパスエイリアスで書いた import
      "shared-not-relative: src/features/todo-page/features/todo-list/index.ts -> src/features/todo-page/features/todo-list/shared/todo-filter/index.ts",
    ]);
  });
});
