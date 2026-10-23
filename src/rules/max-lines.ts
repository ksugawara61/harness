import { defineRule } from "@oxlint/plugins";
import type { Node } from "../utils/ast.ts";
import { embeddedGraphql } from "./graphql.ts";

type Options = { maxLines?: number; skipBlankLines?: boolean };

const DEFAULT_MAX = 300;

const isComment = (token: { type: string }) =>
  token.type === "Line" || token.type === "Block";

const countNewlines = (text: string) => text.split("\n").length - 1;

/**
 * 埋め込み GraphQL ドキュメントの行数。Biome は埋め込み GraphQL を別のドキュメントとして数えるため、
 * 1 + 改行の後にトークン（# のコメント以外）が始まる行の数とする
 */
const embeddedLines = (raw: string, skipBlankLines: boolean): number => {
  const [, ...lines] = raw.replace(/#.*$/gm, "").split("\n");
  const tokenLines = lines.filter((line) => line.trim() !== "").length;
  return 1 + (skipBlankLines ? tokenLines : countNewlines(raw.trimEnd()));
};

// Biome の style/noExcessiveLinesPerFile の置き換え（biome_analyze の count_lines_in_file の移植）。
// Biome は行をトークン単位で数え、トークンの手前（コメントの外）に改行があれば 1 行とする。
// そのため、コメントだけの行と、複数行にまたがる 1 つのトークン（JSX のテキストやテンプレート）の
// 2 行目以降は数えない。skipBlankLines が false のときは、手前の改行の数をそのまま数える。
// 埋め込み GraphQL は、Biome と同じく JS とは別のドキュメントとして数えて報告する
export const maxLines = defineRule({
  create: (context) => {
    const [options] = context.options as [Options?];
    const max = options?.maxLines ?? DEFAULT_MAX;
    const skipBlankLines = options?.skipBlankLines ?? false;
    const report = (node: Node, count: number) => {
      context.report({
        message: `This file has too many lines (${count}). Maximum allowed is ${max}.`,
        node,
      });
    };
    const checkGraphql = (node: Node) => {
      const template = embeddedGraphql(node);
      const raw = template?.quasis[0]?.value.raw;
      if (!template || raw === undefined) return;
      const count = embeddedLines(raw, skipBlankLines);
      if (count > max) report(template, count);
    };
    return {
      CallExpression: checkGraphql,
      // Biome の count_lines_in_file と 1 対 1 で読み比べられるよう、reduce にせずループのまま書く
      Program: (program) => {
        const { text, tokensAndComments } = context.sourceCode;
        let count = 1;
        let triviaStart = 0;
        let newlinesInTrivia = 0;
        for (const token of tokensAndComments) {
          // コメントの中の改行は数えず、コメントの前後の改行だけを数える
          newlinesInTrivia += countNewlines(
            text.slice(triviaStart, token.start),
          );
          triviaStart = token.end;
          if (isComment(token)) continue;
          count += skipBlankLines
            ? Math.min(newlinesInTrivia, 1)
            : newlinesInTrivia;
          newlinesInTrivia = 0;
        }
        if (count > max) report(program, count);
      },
      TaggedTemplateExpression: checkGraphql,
    };
  },
  meta: {
    schema: [
      {
        additionalProperties: false,
        properties: {
          maxLines: { type: "integer" },
          skipBlankLines: { type: "boolean" },
        },
        type: "object",
      },
    ],
  },
});
