import { defineRule, type ESTree } from "@oxlint/plugins";
import {
  checkGraphql,
  type GraphqlProblem,
  type GraphqlRuleId,
} from "../graphql/checks.ts";
import { isIdentifier, type Node } from "../utils/ast.ts";

/**
 * GraphQL を埋め込んだテンプレートリテラルを返す。
 * Biome と同じく `graphql(`...`)`・gql`...`・graphql`...` を対象にし、埋め込み式を含むものは除く
 */
const graphqlTemplate = (node: Node): ESTree.TemplateLiteral | undefined => {
  if (node.type === "TaggedTemplateExpression") {
    return isIdentifier(node.tag, /^(gql|graphql)$/) ? node.quasi : undefined;
  }
  if (node.type !== "CallExpression") return undefined;
  const [first] = node.arguments;
  const isGraphqlCall = isIdentifier(node.callee, "graphql");
  return isGraphqlCall && first?.type === "TemplateLiteral" ? first : undefined;
};

export const embeddedGraphql = (
  node: Node,
): ESTree.TemplateLiteral | undefined => {
  const template = graphqlTemplate(node);
  return template?.expressions.length === 0 ? template : undefined;
};

// ルールごとに同じテンプレートを解析し直さないよう、内容ごとに結果を覚えておく
const cache = new Map<string, GraphqlProblem[]>();

const checkCached = (source: string): GraphqlProblem[] => {
  const cached = cache.get(source);
  if (cached) return cached;
  const problems = checkGraphql(source);
  cache.set(source, problems);
  return problems;
};

/** 埋め込み GraphQL の問題を、JS ファイル上の位置に直して返す */
const problemsIn = (
  template: ESTree.TemplateLiteral,
): (GraphqlProblem & { start: number })[] => {
  const [quasi] = template.quasis;
  if (!quasi) return [];
  // quasi.start はバッククォートの直後を指す
  return checkCached(quasi.value.raw).map((item) => ({
    ...item,
    start: quasi.start + item.offset,
  }));
};

const createGraphqlRule = (ruleId: GraphqlRuleId) =>
  defineRule({
    create: (context) => {
      const check = (node: Node) => {
        const template = embeddedGraphql(node);
        if (!template) return;
        for (const item of problemsIn(template)) {
          if (item.ruleId !== ruleId) continue;
          const start = context.sourceCode.getLocFromIndex(item.start);
          context.report({
            loc: { end: start, start },
            message: item.message,
          });
        }
      };
      return { CallExpression: check, TaggedTemplateExpression: check };
    },
  });

// Biome の GraphQL ルールの置き換え。JS に埋め込んだ GraphQL を検査する
// （.graphql ファイルは bin/lint-graphql.ts が同じ検査を行う）
export const graphqlRules = {
  "graphql-no-duplicate-argument-names": createGraphqlRule(
    "no-duplicate-argument-names",
  ),
  "graphql-no-duplicate-enum-value-names": createGraphqlRule(
    "no-duplicate-enum-value-names",
  ),
  "graphql-no-duplicate-field-definition-names": createGraphqlRule(
    "no-duplicate-field-definition-names",
  ),
  "graphql-no-duplicate-fields": createGraphqlRule("no-duplicate-fields"),
  "graphql-no-duplicate-input-field-names": createGraphqlRule(
    "no-duplicate-input-field-names",
  ),
  "graphql-no-duplicate-operation-name": createGraphqlRule(
    "no-duplicate-graphql-operation-name",
  ),
  "graphql-no-duplicate-variable-names": createGraphqlRule(
    "no-duplicate-variable-names",
  ),
  "graphql-use-deprecated-date": createGraphqlRule("use-deprecated-date"),
  "graphql-use-deprecated-reason": createGraphqlRule("use-deprecated-reason"),
  "graphql-use-lone-anonymous-operation": createGraphqlRule(
    "use-lone-anonymous-operation",
  ),
  "graphql-use-lone-executable-definition": createGraphqlRule(
    "use-lone-executable-definition",
  ),
  "graphql-use-named-operations": createGraphqlRule(
    "use-graphql-named-operations",
  ),
};
