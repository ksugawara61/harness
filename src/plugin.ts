import { definePlugin } from "@oxlint/plugins";
import { cognitiveComplexity } from "./rules/cognitive-complexity.ts";
import { graphqlRules } from "./rules/graphql.ts";
import { maxLines } from "./rules/max-lines.ts";
import { noDynamicNamespaceImportAccess } from "./rules/no-dynamic-namespace-import-access.ts";
import { noFlatMapIdentity } from "./rules/no-flat-map-identity.ts";
import { noImplicitAnyLet } from "./rules/no-implicit-any-let.ts";
import { noMisplacedListElements } from "./rules/no-misplaced-list-elements.ts";
import { noStringCaseMismatch } from "./rules/no-string-case-mismatch.ts";
import { noSuspiciousSemicolonInJsx } from "./rules/no-suspicious-semicolon-in-jsx.ts";
import { noSvgWithoutTitle } from "./rules/no-svg-without-title.ts";
import { noThisInStatic } from "./rules/no-this-in-static.ts";
import { noUnsafeIframeSandbox } from "./rules/no-unsafe-iframe-sandbox.ts";
import { noUnusedTemplateLiteral } from "./rules/no-unused-template-literal.ts";
import { noUselessContinue } from "./rules/no-useless-continue.ts";
import { noUselessStringRaw } from "./rules/no-useless-string-raw.ts";
import { noUselessUndefinedInitialization } from "./rules/no-useless-undefined-initialization.ts";
import { noVoidTypeReturn } from "./rules/no-void-type-return.ts";
import { noXorAsExponentiation } from "./rules/no-xor-as-exponentiation.ts";
import { sortJsxAttributes } from "./rules/sort-jsx-attributes.ts";
import { sortKeys } from "./rules/sort-keys.ts";
import { useFlatMathMinMax } from "./rules/use-flat-math-min-max.ts";
import { useParseIntRadix } from "./rules/use-parse-int-radix.ts";
import { useSemanticElements } from "./rules/use-semantic-elements.ts";
import { useSimpleNumberKeys } from "./rules/use-simple-number-keys.ts";

export default definePlugin({
  meta: { name: "code-lint" },
  rules: {
    ...graphqlRules,
    "cognitive-complexity": cognitiveComplexity,
    "max-lines": maxLines,
    "no-dynamic-namespace-import-access": noDynamicNamespaceImportAccess,
    "no-flat-map-identity": noFlatMapIdentity,
    "no-implicit-any-let": noImplicitAnyLet,
    "no-misplaced-list-elements": noMisplacedListElements,
    "no-string-case-mismatch": noStringCaseMismatch,
    "no-suspicious-semicolon-in-jsx": noSuspiciousSemicolonInJsx,
    "no-svg-without-title": noSvgWithoutTitle,
    "no-this-in-static": noThisInStatic,
    "no-unsafe-iframe-sandbox": noUnsafeIframeSandbox,
    "no-unused-template-literal": noUnusedTemplateLiteral,
    "no-useless-continue": noUselessContinue,
    "no-useless-string-raw": noUselessStringRaw,
    "no-useless-undefined-initialization": noUselessUndefinedInitialization,
    "no-void-type-return": noVoidTypeReturn,
    "no-xor-as-exponentiation": noXorAsExponentiation,
    "sort-jsx-attributes": sortJsxAttributes,
    "sort-keys": sortKeys,
    "use-flat-math-min-max": useFlatMathMinMax,
    "use-parse-int-radix": useParseIntRadix,
    "use-semantic-elements": useSemanticElements,
    "use-simple-number-keys": useSimpleNumberKeys,
  },
});
