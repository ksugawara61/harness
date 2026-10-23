import { type Context, defineRule, type Scope } from "@oxlint/plugins";
import { isIdentifier, type Node } from "../utils/ast.ts";

/** 識別子がローカルの変数に束縛されていない（グローバルを指す）か */
const isUnshadowed = (
  context: Context,
  identifier: Node & { name: string },
) => {
  for (
    let scope: Scope | null = context.sourceCode.getScope(identifier);
    scope;
    scope = scope.upper
  ) {
    // 宣言の無いグローバル変数は defs が空になる
    const variable = scope.set.get(identifier.name);
    if (variable && variable.defs.length > 0) return false;
  }
  return true;
};

/** `parseInt(...)` か `Number.parseInt(...)`（どちらもグローバルのもの）か */
const isGlobalParseInt = (context: Context, callee: Node) => {
  if (isIdentifier(callee, "parseInt")) return isUnshadowed(context, callee);
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    isIdentifier(callee.object, "Number") &&
    isIdentifier(callee.property, "parseInt") &&
    isUnshadowed(context, callee.object)
  );
};

/** 2〜36 の整数リテラルか、数値リテラル以外の式（undefined は除く）なら有効とみなす */
const isValidRadix = (radix: Node) => {
  if (radix.type === "Literal") {
    return (
      typeof radix.value === "number" &&
      Number.isInteger(radix.value) &&
      radix.value >= 2 &&
      radix.value <= 36
    );
  }
  return !isIdentifier(radix, "undefined");
};

const problemOf = (args: Node[]): string | undefined => {
  const [value, radix] = args;
  if (!value) {
    return "This call to parseInt has no arguments, it will always return NaN.";
  }
  if (value.type === "SpreadElement") return undefined;
  if (!radix) return "Missing radix parameter.";
  if (radix.type === "SpreadElement" || isValidRadix(radix)) return undefined;
  return "Invalid radix parameter. Radix must be a non-fractional number between 2 and 36.";
};

// Biome の correctness/useParseIntRadix の置き換え（ESLint の radix は条件式の基数も不正と判定するため）。
// 基数の無い parseInt と、2〜36 の整数でないリテラルの基数を報告する。式の基数は検査しない
export const useParseIntRadix = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      if (!isGlobalParseInt(context, node.callee)) return;
      const message = problemOf(node.arguments);
      if (message) context.report({ message, node });
    },
  }),
});
