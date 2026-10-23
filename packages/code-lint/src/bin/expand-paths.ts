import { globSync } from "node:fs";
import { matchesGlob } from "node:path";

/**
 * 引数のファイルパスとグロブを展開する。
 * `--ignore <グロブ>` に一致するパスと node_modules の中は除く
 */
export const expandPaths = (args: string[]): string[] => {
  const ignores = args.flatMap((arg, index) =>
    args[index - 1] === "--ignore" ? [arg] : [],
  );
  const patterns = args.filter(
    (arg, index) => !arg.startsWith("--") && args[index - 1] !== "--ignore",
  );
  const isIgnored = (path: string) =>
    path.split(/[\\/]/).includes("node_modules") ||
    ignores.some((ignore) => matchesGlob(path, ignore));
  return [
    ...new Set(
      patterns.flatMap((pattern) => globSync(pattern, { exclude: isIgnored })),
    ),
  ];
};
