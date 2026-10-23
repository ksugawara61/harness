/**
 * Biome の natural order（biome_string_case の CldrAsciiCollator と Collator::cmp）の移植。
 * - ASCII は CLDR のルート照合順に並べる（記号 < 数字 < 英字。英字は A < a < B < b）
 * - 連続する数字は数値として比べる（9 < 10）。先頭の 0 は読み飛ばさない
 * - ASCII 以外のバイトはバイト値のまま比べる
 */
const COLLATION = [
  ...[0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0e, 0x0f, 0x10],
  ...[0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c],
  ...[0x1d, 0x1e, 0x1f, 0x7f, 0x09, 0x0a, 0x0b, 0x0c, 0x0d],
  ...Array.from(
    " _-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz",
    (char) => char.charCodeAt(0),
  ),
];

const WEIGHTS = Array.from({ length: 256 }, (_, byte) =>
  byte < 128 ? COLLATION.indexOf(byte) : byte,
);

const isDigit = (byte: number | undefined): boolean =>
  byte !== undefined && byte >= 0x30 && byte <= 0x39;

/** 片方の文字列が終わったときの順序（短い方が先） */
const compareEnds = (a: number | undefined, b: number | undefined) =>
  (a === undefined ? 0 : 1) - (b === undefined ? 0 : 1);

/* oxlint-disable code-lint/cognitive-complexity -- Biome の Collator::cmp と 1 対 1 で読み比べられるよう、分岐を分割しない */

type Cursor = { i: number; prev: number | undefined };

/**
 * 数字の連なりを比べる。桁数が多い方が大きく、同じ桁数なら最初に異なる桁で決まる。
 * 決着がつけば順序を返し、つかなければ cursor を数字の直後に進めて undefined を返す
 */
const compareNumbers = (
  left: Uint8Array,
  right: Uint8Array,
  cursor: Cursor,
): number | undefined => {
  let numberOrdering = 0;
  for (;;) {
    const c1 = left[cursor.i];
    const c2 = right[cursor.i];
    const d1 = isDigit(c1);
    const d2 = isDigit(c2);
    if (!d1 && !d2) return numberOrdering === 0 ? undefined : numberOrdering;
    // 片方だけ数字が続くなら、直前も数字だった（数の途中だった）ときだけ桁数で決まる
    if (!d1 || !d2) return isDigit(cursor.prev) ? (d1 ? 1 : -1) : undefined;
    if (numberOrdering === 0) numberOrdering = Math.sign((c1 ?? 0) - (c2 ?? 0));
    const n1 = left[cursor.i + 1];
    const n2 = right[cursor.i + 1];
    if (n1 === undefined || n2 === undefined) {
      if (n1 === undefined && n2 === undefined) return numberOrdering;
      const longer = n1 === undefined ? n2 : n1;
      const sign = n1 === undefined ? -1 : 1;
      return isDigit(longer) ? sign : numberOrdering || sign;
    }
    cursor.prev = c1;
    cursor.i += 1;
  }
};

const encoder = new TextEncoder();

export const naturalCompare = (leftText: string, rightText: string): number => {
  const left = encoder.encode(leftText);
  const right = encoder.encode(rightText);
  const cursor: Cursor = { i: 0, prev: undefined };
  for (;;) {
    const c1 = left[cursor.i];
    const c2 = right[cursor.i];
    if (c1 === undefined || c2 === undefined) return compareEnds(c1, c2);
    if (c1 !== c2) {
      const byNumber = compareNumbers(left, right, cursor);
      if (byNumber !== undefined) return byNumber;
      const a = left[cursor.i] ?? 0;
      const b = right[cursor.i] ?? 0;
      const byWeight = Math.sign((WEIGHTS[a] ?? a) - (WEIGHTS[b] ?? b));
      if (byWeight !== 0) return byWeight;
    }
    cursor.prev = left[cursor.i];
    cursor.i += 1;
  }
};

/* oxlint-enable code-lint/cognitive-complexity */
