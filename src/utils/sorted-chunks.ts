import type { Context, Fix, Fixer } from "@oxlint/plugins";
import type { Node } from "./ast.ts";
import { naturalCompare } from "./natural-compare.ts";

export type Sortable = { name: string | undefined; node: Node };

/**
 * 並べ替えられない要素（name が undefined。spread や計算キー）で区切った塊ごとに、
 * 要素が natural order に並んでいるかを調べる。
 * 並んでいなければ、各要素の位置に並べ替え後の要素のテキストを書き込む修正を返す
 */
export const sortFix = (
  context: Context,
  items: Sortable[],
): ((fixer: Fixer) => Fix[]) | undefined => {
  // 並んでいるかだけを先に調べ、並んでいる（ほとんどの）場合は修正を組み立てない
  const isSorted = items.every((item, index) => {
    const previous = items[index - 1];
    if (!previous?.name || item.name === undefined) return true;
    return naturalCompare(previous.name, item.name) <= 0;
  });
  if (isSorted) return undefined;
  const chunks = items.reduce<Sortable[][]>(
    (acc, item) => {
      if (item.name === undefined) acc.push([]);
      else acc.at(-1)?.push(item);
      return acc;
    },
    [[]],
  );
  const unsorted = chunks
    .map((chunk) => ({
      chunk,
      sorted: [...chunk].sort((a, b) =>
        naturalCompare(a.name ?? "", b.name ?? ""),
      ),
    }))
    .filter(({ chunk, sorted }) =>
      chunk.some((item, index) => item !== sorted[index]),
    );
  if (unsorted.length === 0) return undefined;
  const { sourceCode } = context;
  return (fixer) =>
    unsorted.flatMap(({ chunk, sorted }) =>
      chunk.map((item, index) =>
        fixer.replaceText(item.node, sourceCode.getText(sorted[index]?.node)),
      ),
    );
};
