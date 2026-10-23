import { naturalCompare } from "../utils/natural-compare.ts";

/**
 * キーの並びを保った JSON の値。
 * JS のオブジェクトは整数風のキーを先頭に並べ替えてしまうため、オブジェクトは [キー, 値] の配列で持つ
 */
type Json =
  | { items: Json[]; kind: "array" }
  | { entries: [string, Json][]; kind: "object" }
  | { kind: "raw"; text: string };

const SCALAR_END = /[\s,\]}]/;

/** キーの並びを保ったまま JSON を読み込む（構文は先に JSON.parse で検証する） */
const parseOrdered = (source: string): Json => {
  JSON.parse(source);
  let i = 0;
  const skipSpace = () => {
    while (/\s/.test(source.charAt(i))) i += 1;
  };
  /** 区切りの , と閉じ括弧を読み飛ばしながら、閉じ括弧までの要素を読む */
  const readList = <T>(close: string, readItem: () => T): T[] => {
    const items: T[] = [];
    i += 1;
    for (skipSpace(); source.charAt(i) !== close; skipSpace()) {
      items.push(readItem());
      skipSpace();
      if (source.charAt(i) === ",") i += 1;
    }
    i += 1;
    return items;
  };
  const readString = (): string => {
    const start = i;
    i += 1;
    while (source.charAt(i) !== '"') i += source.charAt(i) === "\\" ? 2 : 1;
    i += 1;
    return source.slice(start, i);
  };
  const readScalar = (): Json => {
    if (source.charAt(i) === '"') return { kind: "raw", text: readString() };
    const start = i;
    while (i < source.length && !SCALAR_END.test(source.charAt(i))) i += 1;
    return { kind: "raw", text: source.slice(start, i) };
  };
  const readEntry = (): [string, Json] => {
    const key = JSON.parse(readString()) as string;
    skipSpace();
    i += 1; // :
    return [key, readValue()];
  };
  const readValue = (): Json => {
    skipSpace();
    const char = source.charAt(i);
    if (char === "{")
      return { entries: readList("}", readEntry), kind: "object" };
    if (char === "[") return { items: readList("]", readValue), kind: "array" };
    return readScalar();
  };
  return readValue();
};

/** natural order に並んでいないオブジェクトを、JSON ポインタ風のパスで返す */
export const unsortedPaths = (source: string): string[] => {
  const walk = (value: Json, path: string): string[] => {
    if (value.kind === "raw") return [];
    if (value.kind === "array") {
      return value.items.flatMap((item, index) =>
        walk(item, `${path}/${index}`),
      );
    }
    const keys = value.entries.map(([key]) => key);
    const sorted = [...keys].sort(naturalCompare);
    const isSorted = keys.every((key, index) => key === sorted[index]);
    return [
      ...(isSorted ? [] : [path || "/"]),
      ...value.entries.flatMap(([key, item]) => walk(item, `${path}/${key}`)),
    ];
  };
  return walk(parseOrdered(source), "");
};

const stringify = (value: Json, indent: string): string => {
  const inner = `${indent}  `;
  if (value.kind === "raw") return value.text;
  const lines =
    value.kind === "array"
      ? value.items.map((item) => inner + stringify(item, inner))
      : [...value.entries]
          .sort(([a], [b]) => naturalCompare(a, b))
          .map(
            ([key, item]) =>
              `${inner}${JSON.stringify(key)}: ${stringify(item, inner)}`,
          );
  const [open, close] = value.kind === "array" ? ["[", "]"] : ["{", "}"];
  if (lines.length === 0) return `${open}${close}`;
  return `${open}\n${lines.join(",\n")}\n${indent}${close}`;
};

/** キーを natural order に並べ替えた JSON を返す（配列の折り返しなどの整形は oxfmt に任せる） */
export const sortJsonKeys = (source: string): string =>
  `${stringify(parseOrdered(source), "")}\n`;
