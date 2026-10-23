#!/usr/bin/env node
// JSON ファイルのキーが natural order に並んでいるかを検査する（Biome の useSortedKeys の JSON 版の置き換え）。
// oxlint は JSON を読めず、oxfmt はキーを並べ替えないため、ここで検査する。
// 使い方: code-lint-sort-json-keys [--write] [--ignore <グロブ>]... <file.json またはグロブ>...
//   --write を付けると並べ替えて書き込む。書き込んだ後は oxfmt で整形すること
import { readFileSync, writeFileSync } from "node:fs";
import { sortJsonKeys, unsortedPaths } from "../json/sort-keys.ts";
import { expandPaths } from "./expand-paths.ts";

const args = process.argv.slice(2);
const write = args.includes("--write");
const files = expandPaths(args).filter((file) => file.endsWith(".json"));

const unsorted = files.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  const paths = unsortedPaths(source);
  if (paths.length === 0) return [];
  if (write) writeFileSync(file, sortJsonKeys(source));
  return paths.map((path) => ({ file, path }));
});

for (const { file, path } of unsorted) {
  console.error(
    `${file}: keys of ${path} are not sorted in natural order${write ? " (fixed)" : ""}`,
  );
}
console.log(`Checked ${files.length} JSON files.`);
process.exitCode = unsorted.length > 0 && !write ? 1 : 0;
