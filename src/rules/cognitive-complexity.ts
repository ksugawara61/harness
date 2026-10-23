import { type Context, defineRule } from "@oxlint/plugins";
import type { FunctionNode, Node } from "../utils/ast.ts";
import { isFunction } from "../utils/ast.ts";

const DEFAULT_MAX = 15;

/** 1 + ネストの深さを加点し、配下のネストを 1 深くする構文 */
const NESTING_STRUCTURES = new Set([
  "CatchClause",
  "ConditionalExpression",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "IfStatement",
  "SwitchStatement",
  "WhileStatement",
]);

type FunctionState = {
  fn: FunctionNode;
  lastOperator: string | undefined;
  nesting: number;
  score: number;
};

/** ネストの深さに関係なく 1 だけ加点する構文（finally・with・ラベル付きの break / continue） */
const isFlatPenalty = (node: Node) => {
  if (node.type === "WithStatement") return true;
  if (node.type === "BreakStatement" || node.type === "ContinueStatement") {
    return node.label !== null;
  }
  return (
    node.type === "BlockStatement" &&
    node.parent.type === "TryStatement" &&
    node.parent.finalizer === node
  );
};

/** Biome と同じく、アロー関数は `=>`、名前付き関数は名前の位置に報告する */
const reportTarget = (context: Context, fn: FunctionNode) => {
  if (fn.type === "ArrowFunctionExpression") {
    const arrow = context.sourceCode.getTokenBefore(fn.body, {
      filter: (token) => token.value === "=>",
    });
    if (arrow) return { loc: arrow.loc };
  }
  const { parent } = fn;
  if (
    (parent.type === "Property" || parent.type === "MethodDefinition") &&
    parent.value === fn
  ) {
    return { node: parent.key };
  }
  return { node: fn.id ?? fn };
};

// Biome の complexity/noExcessiveCognitiveComplexity の置き換え。
// Biome の実装（CognitiveComplexityVisitor）をそのまま移植し、同じ点数になるようにしている。
// - if / 三項演算子 / switch / ループ / catch は 1 + ネストの深さを加点し、配下のネストを 1 深くする
// - else は 1 加点する。else if の if は親の if と同じ深さで数える
// - finally・with・ラベル付きの break / continue は 1 加点する
// - 論理演算子は直前に見た演算子と違えば 1 加点する（括弧や他のノードを挟むと数え直す）
// - ネストした関数は、外側のその時点のネストの深さ + 1 から別の関数として数える
// Biome は else を抜けるときにもネストを 1 浅くするため、if / else の後ろの構文は浅く数えられる。
// 点数を Biome と揃えるため、この挙動も再現している
export const cognitiveComplexity = defineRule({
  create: (context) => {
    const [options] = context.options as [{ maxAllowedComplexity?: number }?];
    const max = options?.maxAllowedComplexity ?? DEFAULT_MAX;
    const stack: FunctionState[] = [];
    const { visitorKeys } = context.sourceCode;

    /** 子ノードをソース上の出現順に返す（visitorKeys はソース順に並んでいる） */
    const children = (node: Node): Node[] =>
      (visitorKeys[node.type] ?? []).flatMap((key) => {
        const value = (node as unknown as Record<string, unknown>)[key];
        const values = Array.isArray(value) ? value : [value];
        return values.filter(
          (item): item is Node =>
            typeof item === "object" && item !== null && "type" in item,
        );
      });

    const isParenthesized = (node: Node) =>
      context.sourceCode.getTokenBefore(node)?.value === "(" &&
      context.sourceCode.getTokenAfter(node)?.value === ")";

    const scoreLogical = (
      state: FunctionState,
      node: Node & { operator: string },
    ) => {
      // Biome の構文木では括弧も 1 つのノードなので、括弧で包まれた式は連なりが切れる
      if (isParenthesized(node)) state.lastOperator = undefined;
      if (state.lastOperator !== node.operator) {
        state.score += 1;
        state.lastOperator = node.operator;
      }
    };

    const scoreNode = (state: FunctionState, node: Node) => {
      if (NESTING_STRUCTURES.has(node.type)) {
        state.score += 1 + state.nesting;
        state.nesting += 1;
        state.lastOperator = undefined;
        return;
      }
      if (isFlatPenalty(node)) state.score += 1;
      if (node.type === "LogicalExpression") {
        scoreLogical(state, node);
        return;
      }
      state.lastOperator = undefined;
    };

    const enter = (node: Node) => {
      const parent = stack.at(-1);
      if (isFunction(node)) {
        stack.push({
          fn: node,
          lastOperator: undefined,
          nesting: parent ? parent.nesting + 1 : 0,
          score: 0,
        });
      }
      const state = stack.at(-1);
      if (state) scoreNode(state, node);
    };

    const leave = (node: Node) => {
      if (isFunction(node)) {
        const state = stack.pop();
        if (state && state.score > max) {
          context.report({
            message: `Excessive complexity of ${state.score} detected (max: ${max}).`,
            ...reportTarget(context, state.fn),
          });
        }
        return;
      }
      const state = stack.at(-1);
      if (state && NESTING_STRUCTURES.has(node.type)) {
        state.nesting = Math.max(0, state.nesting - 1);
      }
    };

    /** Biome の構文木にある else 節（JsElseClause）の出入りを再現する */
    const visitElse = (alternate: Node) => {
      const state = stack.at(-1);
      const isElseIf = alternate.type === "IfStatement";
      if (state) {
        if (isElseIf) state.nesting = Math.max(0, state.nesting - 1);
        else state.score += 1;
      }
      visit(alternate);
      if (state) {
        state.nesting = isElseIf
          ? state.nesting + 1
          : Math.max(0, state.nesting - 1);
      }
    };

    const visit = (node: Node): void => {
      enter(node);
      for (const child of children(node)) {
        if (node.type === "IfStatement" && child === node.alternate) {
          visitElse(child);
        } else {
          visit(child);
        }
      }
      leave(node);
    };

    return { Program: visit };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: { maxAllowedComplexity: { type: "integer" } },
        type: "object",
      },
    ],
  },
});
