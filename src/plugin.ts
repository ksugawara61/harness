import { definePlugin } from "@oxlint/plugins";
import { cognitiveComplexity } from "./rules/cognitive-complexity.ts";
import { graphqlRules } from "./rules/graphql.ts";
import { maxLines } from "./rules/max-lines.ts";
import { noDynamicNamespaceImportAccess } from "./rules/no-dynamic-namespace-import-access.ts";
import { noEventInYields } from "./rules/no-event-in-yields.ts";
import { noExpectInGivenWhen } from "./rules/no-expect-in-given-when.ts";
import { noExpoRouterInUseServiceReturn } from "./rules/no-expo-router-in-use-service-return.ts";
import { noFlatMapIdentity } from "./rules/no-flat-map-identity.ts";
import { noHandlerInComponent } from "./rules/no-handler-in-component.ts";
import { noImplicitAnyLet } from "./rules/no-implicit-any-let.ts";
import { noInlineHandlerLogic } from "./rules/no-inline-handler-logic.ts";
import { noMisplacedListElements } from "./rules/no-misplaced-list-elements.ts";
import { noMultipleFeatureExports } from "./rules/no-multiple-feature-exports.ts";
import { noRawSetterReturn } from "./rules/no-raw-setter-return.ts";
import { noRawVitestTest } from "./rules/no-raw-vitest-test.ts";
import { noStorybookTitle } from "./rules/no-storybook-title.ts";
import { noStringCaseMismatch } from "./rules/no-string-case-mismatch.ts";
import { noStylePropInUi } from "./rules/no-style-prop-in-ui.ts";
import { noSuspiciousSemicolonInJsx } from "./rules/no-suspicious-semicolon-in-jsx.ts";
import { noSvgWithoutTitle } from "./rules/no-svg-without-title.ts";
import { noTestId } from "./rules/no-test-id.ts";
import { noThisInStatic } from "./rules/no-this-in-static.ts";
import { noUnsafeIframeSandbox } from "./rules/no-unsafe-iframe-sandbox.ts";
import { noUnusedTemplateLiteral } from "./rules/no-unused-template-literal.ts";
import { noUselessContinue } from "./rules/no-useless-continue.ts";
import { noUselessStringRaw } from "./rules/no-useless-string-raw.ts";
import { noUselessUndefinedInitialization } from "./rules/no-useless-undefined-initialization.ts";
import { noVoidTypeReturn } from "./rules/no-void-type-return.ts";
import { noWaitingInWhen } from "./rules/no-waiting-in-when.ts";
import { noXorAsExponentiation } from "./rules/no-xor-as-exponentiation.ts";
import { onlyUseServiceHooks } from "./rules/only-use-service-hooks.ts";
import { sortJsxAttributes } from "./rules/sort-jsx-attributes.ts";
import { sortKeys } from "./rules/sort-keys.ts";
import { useExpressionWhen } from "./rules/use-expression-when.ts";
import { useFlatMathMinMax } from "./rules/use-flat-math-min-max.ts";
import { useParseIntRadix } from "./rules/use-parse-int-radix.ts";
import { useSemanticElements } from "./rules/use-semantic-elements.ts";
import { useServiceHandleOnly } from "./rules/use-service-handle-only.ts";
import { useServiceSingleComponent } from "./rules/use-service-single-component.ts";
import { useSimpleNumberKeys } from "./rules/use-simple-number-keys.ts";

export default definePlugin({
  meta: { name: "code-lint" },
  rules: {
    ...graphqlRules,
    "cognitive-complexity": cognitiveComplexity,
    "max-lines": maxLines,
    "no-dynamic-namespace-import-access": noDynamicNamespaceImportAccess,
    "no-event-in-yields": noEventInYields,
    "no-expect-in-given-when": noExpectInGivenWhen,
    "no-expo-router-in-use-service-return": noExpoRouterInUseServiceReturn,
    "no-flat-map-identity": noFlatMapIdentity,
    "no-handler-in-component": noHandlerInComponent,
    "no-implicit-any-let": noImplicitAnyLet,
    "no-inline-handler-logic": noInlineHandlerLogic,
    "no-misplaced-list-elements": noMisplacedListElements,
    "no-multiple-feature-exports": noMultipleFeatureExports,
    "no-raw-setter-return": noRawSetterReturn,
    "no-raw-vitest-test": noRawVitestTest,
    "no-storybook-title": noStorybookTitle,
    "no-string-case-mismatch": noStringCaseMismatch,
    "no-style-prop-in-ui": noStylePropInUi,
    "no-suspicious-semicolon-in-jsx": noSuspiciousSemicolonInJsx,
    "no-svg-without-title": noSvgWithoutTitle,
    "no-test-id": noTestId,
    "no-this-in-static": noThisInStatic,
    "no-unsafe-iframe-sandbox": noUnsafeIframeSandbox,
    "no-unused-template-literal": noUnusedTemplateLiteral,
    "no-useless-continue": noUselessContinue,
    "no-useless-string-raw": noUselessStringRaw,
    "no-useless-undefined-initialization": noUselessUndefinedInitialization,
    "no-void-type-return": noVoidTypeReturn,
    "no-waiting-in-when": noWaitingInWhen,
    "no-xor-as-exponentiation": noXorAsExponentiation,
    "only-use-service-hooks": onlyUseServiceHooks,
    "sort-jsx-attributes": sortJsxAttributes,
    "sort-keys": sortKeys,
    "use-expression-when": useExpressionWhen,
    "use-flat-math-min-max": useFlatMathMinMax,
    "use-parse-int-radix": useParseIntRadix,
    "use-semantic-elements": useSemanticElements,
    "use-service-handle-only": useServiceHandleOnly,
    "use-service-single-component": useServiceSingleComponent,
    "use-simple-number-keys": useSimpleNumberKeys,
  },
});
