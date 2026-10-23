import {
  type ArgumentNode,
  type ASTNode,
  type DirectiveNode,
  type DocumentNode,
  type FieldDefinitionNode,
  type InputValueDefinitionNode,
  Kind,
  type ObjectFieldNode,
  parse,
  visit,
} from "graphql";

/** GraphQL のルール ID（Biome のルール名を kebab-case にしたもの） */
export type GraphqlRuleId =
  | "no-duplicate-argument-names"
  | "no-duplicate-enum-value-names"
  | "no-duplicate-field-definition-names"
  | "no-duplicate-fields"
  | "no-duplicate-graphql-operation-name"
  | "no-duplicate-input-field-names"
  | "no-duplicate-variable-names"
  | "use-deprecated-date"
  | "use-deprecated-reason"
  | "use-graphql-named-operations"
  | "use-lone-anonymous-operation"
  | "use-lone-executable-definition";

export type GraphqlProblem = {
  message: string;
  /** ソース先頭からのオフセット */
  offset: number;
  ruleId: GraphqlRuleId;
};

type Named = { loc?: ASTNode["loc"]; name: { value: string } };

/** 同じ名前が 2 回目以降に現れた要素を返す */
const duplicates = <T extends Named>(items: readonly T[]): T[] =>
  items.filter(
    (item, index) =>
      items.findIndex((other) => other.name.value === item.name.value) < index,
  );

const offsetOf = (node: { loc?: ASTNode["loc"] }) => node.loc?.start ?? 0;

const problem = (
  ruleId: GraphqlRuleId,
  node: { loc?: ASTNode["loc"] },
  message: string,
): GraphqlProblem => ({ message, offset: offsetOf(node), ruleId });

const deprecatedProblems = (
  directives: readonly DirectiveNode[] | undefined,
): GraphqlProblem[] =>
  (directives ?? [])
    .filter((directive) => directive.name.value === "deprecated")
    .flatMap((directive) => {
      const names = (directive.arguments ?? []).map((arg) => arg.name.value);
      return [
        ...(names.includes("reason")
          ? []
          : [
              problem(
                "use-deprecated-reason",
                directive,
                "The directive `@deprecated` should have a `reason` argument.",
              ),
            ]),
        ...(names.includes("deletionDate")
          ? []
          : [
              problem(
                "use-deprecated-date",
                directive,
                "The directive `@deprecated` should have a `deletionDate` argument.",
              ),
            ]),
      ];
    });

const fieldDefinitionProblems = (
  fields: readonly (FieldDefinitionNode | InputValueDefinitionNode)[] = [],
): GraphqlProblem[] =>
  duplicates(fields).map((field) =>
    problem(
      "no-duplicate-field-definition-names",
      field,
      `Duplicate field definition name \`${field.name.value}\`.`,
    ),
  );

const executableProblems = (document: DocumentNode): GraphqlProblem[] => {
  const executables = document.definitions.filter(
    (definition) =>
      definition.kind === Kind.OPERATION_DEFINITION ||
      definition.kind === Kind.FRAGMENT_DEFINITION,
  );
  const operations = document.definitions.filter(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  );
  const named = operations.filter(
    (operation): operation is typeof operation & Named => !!operation.name,
  );
  return [
    // Biome と同じく、ドキュメントごとに 2 つ目の定義だけを報告する
    ...executables
      .slice(1, 2)
      .map((definition) =>
        problem(
          "use-lone-executable-definition",
          definition,
          "Document contains multiple definitions. Move each definition to its own document.",
        ),
      ),
    ...(operations.length > 1
      ? operations
          .filter((operation) => !operation.name)
          .slice(0, 1)
          .map((operation) =>
            problem(
              "use-lone-anonymous-operation",
              operation,
              "Anonymous operations must be the only operation in the document.",
            ),
          )
      : []),
    ...operations
      .filter(
        (operation) =>
          !operation.name && operation.loc?.startToken.kind !== "{",
      )
      .map((operation) =>
        problem(
          "use-graphql-named-operations",
          operation,
          "Anonymous GraphQL operations are forbidden. Give the operation a name.",
        ),
      ),
    ...duplicates(named).map((operation) =>
      problem(
        "no-duplicate-graphql-operation-name",
        operation,
        `Duplicate operation name \`${operation.name.value}\`.`,
      ),
    ),
  ];
};

/** Biome と同じく、重複した引数名はフィールドやディレクティブごとに 1 件だけ報告する */
const argumentProblems = (args: readonly ArgumentNode[] = []) =>
  duplicates(args)
    .slice(0, 1)
    .map((arg) =>
      problem(
        "no-duplicate-argument-names",
        arg,
        `Duplicate argument name \`${arg.name.value}\`.`,
      ),
    );

/** 重複したフィールド・変数・フィールドの引数を、重複ごとに no-duplicate-fields として報告する */
const duplicateFieldProblems = (items: readonly Named[]) =>
  duplicates(items).map((item) =>
    problem(
      "no-duplicate-fields",
      item,
      `Duplicate field \`${item.name.value}\`.`,
    ),
  );

/**
 * Biome の GraphQL ルール相当の検査を、1 つの GraphQL ドキュメントに対して行う。
 * 構文エラーのドキュメントは検査しない（gql.tada の型検査とコード生成に任せる）
 */
export const checkGraphql = (source: string): GraphqlProblem[] => {
  const document = (() => {
    try {
      return parse(source);
    } catch {
      return undefined;
    }
  })();
  if (!document) return [];
  const problems: GraphqlProblem[] = [...executableProblems(document)];
  // graphql の visit はコールバックで各ノードを訪れる API のため、検出結果は push で集める
  visit(document, {
    Directive: (node) => {
      problems.push(...argumentProblems(node.arguments));
    },
    EnumTypeDefinition: (node) => {
      problems.push(
        ...duplicates(node.values ?? []).map((value) =>
          problem(
            "no-duplicate-enum-value-names",
            value,
            `Duplicate enum value name \`${value.name.value}\`.`,
          ),
        ),
      );
    },
    EnumValueDefinition: (node) => {
      problems.push(...deprecatedProblems(node.directives));
    },
    Field: (node) => {
      problems.push(
        ...argumentProblems(node.arguments),
        ...duplicateFieldProblems(node.arguments ?? []),
      );
    },
    FieldDefinition: (node) => {
      problems.push(...deprecatedProblems(node.directives));
    },
    InputObjectTypeDefinition: (node) => {
      problems.push(...fieldDefinitionProblems(node.fields));
    },
    InputValueDefinition: (node) => {
      problems.push(...deprecatedProblems(node.directives));
    },
    InterfaceTypeDefinition: (node) => {
      problems.push(...fieldDefinitionProblems(node.fields));
    },
    ObjectTypeDefinition: (node) => {
      problems.push(...fieldDefinitionProblems(node.fields));
    },
    ObjectValue: (node) => {
      problems.push(
        ...duplicates<ObjectFieldNode>(node.fields)
          .slice(0, 1)
          .map((field) =>
            problem(
              "no-duplicate-input-field-names",
              field,
              `Duplicate input field name \`${field.name.value}\`.`,
            ),
          ),
      );
    },
    OperationDefinition: (node) => {
      const variables = (node.variableDefinitions ?? []).map((definition) => ({
        loc: definition.loc,
        name: definition.variable.name,
      }));
      problems.push(
        // Biome と同じく、重複した変数名は操作ごとに 1 件だけ報告する
        ...duplicates(variables)
          .slice(0, 1)
          .map((definition) =>
            problem(
              "no-duplicate-variable-names",
              definition,
              `Duplicate variable name \`$${definition.name.value}\`.`,
            ),
          ),
        ...duplicateFieldProblems(variables),
      );
    },
    SelectionSet: (node) => {
      const fields = node.selections.flatMap((selection) =>
        selection.kind === Kind.FIELD
          ? [{ loc: selection.loc, name: selection.alias ?? selection.name }]
          : [],
      );
      problems.push(...duplicateFieldProblems(fields));
    },
  });
  return problems.sort((a, b) => a.offset - b.offset);
};
