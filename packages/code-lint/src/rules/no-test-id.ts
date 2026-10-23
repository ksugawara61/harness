import { defineRule } from "@oxlint/plugins";

// testID の JSX 属性を禁止する（aria-label などのアクセシビリティ属性を使う）
export const noTestId = defineRule({
  create: (context) => ({
    JSXAttribute: (node) => {
      if (node.name.type === "JSXIdentifier" && node.name.name === "testID") {
        context.report({
          message:
            "testIDの使用は禁止されています。aria-labelなどのアクセシビリティ属性を使用してください。",
          node,
        });
      }
    },
  }),
});
