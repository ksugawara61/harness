import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { ruleTester } from "../test-utils/rule-tester.ts";
import { useStoriesFile } from "./use-stories-file.ts";

// ルールはファイルシステムを見るため、stories.tsx の有無が違うディレクトリを用意する
const root = mkdtempSync(join(tmpdir(), "use-stories-file-"));
const withStories = join(root, "with-stories");
const withoutStories = join(root, "without-stories");
mkdirSync(withStories);
mkdirSync(withoutStories);
writeFileSync(join(withStories, "stories.tsx"), "");
writeFileSync(join(withoutStories, "button.stories.tsx"), "");

afterAll(() => {
  rmSync(root, { force: true, recursive: true });
});

const component = "export const TodoAdd = () => null;";

ruleTester.run("use-stories-file", useStoriesFile, {
  invalid: [
    {
      code: component,
      errors: 1,
      filename: join(withoutStories, "index.tsx"),
      name: "stories.tsx が無いディレクトリのコンポーネントの export は報告する（button.stories.tsx は数えない）",
    },
    {
      code: "const TodoAdd = () => null; export default TodoAdd;",
      errors: 1,
      filename: join(withoutStories, "index.tsx"),
      name: "default export のコンポーネントも報告する",
    },
    {
      code: `export type Props = { title: string };\n${component}\nexport const Other = () => null;`,
      errors: 1,
      filename: join(withoutStories, "index.tsx"),
      name: "export 文が複数あっても 1 度だけ報告する",
    },
  ],
  valid: [
    {
      code: component,
      filename: join(withStories, "index.tsx"),
      name: "同じディレクトリに stories.tsx があれば許可する",
    },
    {
      code: "const TodoAdd = () => null;",
      filename: join(withoutStories, "index.tsx"),
      name: "export の無いファイルは対象にしない",
    },
    {
      code: "export type Props = { title: string };",
      filename: join(withoutStories, "types.ts"),
      name: "型だけを export するファイルは対象にしない",
    },
  ],
});
