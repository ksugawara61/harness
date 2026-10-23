import { readFile } from "node:fs/promises";
import parseJsonc from "markdownlint-cli2/parsers/jsonc";
import { expect, it } from "vitest";

// VS Code の markdownlint 拡張は .markdownlint-cli2.jsonc の ignores しか読まないため、
// textlint の .textlintignore と同じ除外を二重に持つ。ずれると片方の検査だけが生成物や取り込みスキルに掛かる
const repoRoot = new URL("../../../../", import.meta.url);

const readRepoFile = (name: string) =>
  readFile(new URL(name, repoRoot), "utf8");

it(".markdownlint-cli2.jsonc の ignores は .textlintignore と同じ対象を除く", async () => {
  const textlintIgnores = (await readRepoFile(".textlintignore"))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  const markdownlintConfig = parseJsonc(
    await readRepoFile(".markdownlint-cli2.jsonc"),
  );

  expect(markdownlintConfig).toMatchObject({ ignores: textlintIgnores });
});
