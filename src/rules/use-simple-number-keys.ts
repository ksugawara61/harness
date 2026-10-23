import { defineRule } from "@oxlint/plugins";

/** 10 進数（区切りの _ なし）以外で書いた数値のキーか */
const isComplexNumberKey = (raw: string) =>
  /^0[bBoOxX]/.test(raw) ||
  /^0[0-7]/.test(raw) ||
  raw.includes("_") ||
  raw.endsWith("n");

// Biome の complexity/useSimpleNumberKeys の置き換え。
// オブジェクトのキーに 2 進・8 進・16 進・BigInt・区切りの _ を含む数値を使うことを禁止する
export const useSimpleNumberKeys = defineRule({
  create: (context) => ({
    Property: (node) => {
      const { key } = node;
      if (node.computed || key.type !== "Literal") return;
      const raw = key.raw ?? "";
      if (typeof key.value !== "number" && typeof key.value !== "bigint")
        return;
      if (isComplexNumberKey(raw)) {
        context.report({
          message:
            "Number literal keys should be written as simple decimal numbers.",
          node: key,
        });
      }
    },
  }),
});
