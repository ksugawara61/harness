#!/usr/bin/env node
// .graphql ファイルに Biome の GraphQL ルール相当の検査を行う。
// oxlint は .graphql を読めないため、JS に埋め込んだ GraphQL（rules/graphql.ts）と同じ検査をここで行う。
// 使い方: code-lint-graphql [--ignore <グロブ>]... <file.graphql またはグロブ>...
import { readFileSync } from "node:fs";
import { checkGraphql } from "../graphql/checks.ts";
import { expandPaths } from "./expand-paths.ts";

const lineColumnOf = (source: string, offset: number) => {
  const before = source.slice(0, offset).split("\n");
  return { column: (before.at(-1)?.length ?? 0) + 1, line: before.length };
};

const files = expandPaths(process.argv.slice(2)).filter((file) =>
  file.endsWith(".graphql"),
);
const problems = files.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return checkGraphql(source).map((item) => ({
    ...item,
    ...lineColumnOf(source, item.offset),
    file,
  }));
});

for (const { column, file, line, message, ruleId } of problems) {
  console.error(`${file}:${line}:${column}: ${message} [graphql/${ruleId}]`);
}
console.log(
  `Checked ${files.length} GraphQL files. Found ${problems.length} problems.`,
);
process.exitCode = problems.length > 0 ? 1 : 0;
