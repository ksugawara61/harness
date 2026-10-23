import { defineRule } from "@oxlint/plugins";

// Biome の nursery/noUnsafeIframeSandbox の置き換え。
// <iframe> の sandbox に allow-scripts と allow-same-origin を同時に指定することを禁止する
// （サンドボックスを外せてしまう組み合わせ。sandbox が無いこと自体は対象外）
export const noUnsafeIframeSandbox = defineRule({
  create: (context) => ({
    JSXOpeningElement: (node) => {
      if (node.name.type !== "JSXIdentifier" || node.name.name !== "iframe")
        return;
      const sandbox = node.attributes.find(
        (attribute) =>
          attribute.type === "JSXAttribute" &&
          attribute.name.type === "JSXIdentifier" &&
          attribute.name.name === "sandbox",
      );
      if (sandbox?.type !== "JSXAttribute" || sandbox.value?.type !== "Literal")
        return;
      const tokens = String(sandbox.value.value).toLowerCase().split(/\s+/);
      if (
        tokens.includes("allow-scripts") &&
        tokens.includes("allow-same-origin")
      ) {
        context.report({
          message:
            "Unsafe sandbox: allow-scripts and allow-same-origin together let the iframe remove its own sandbox.",
          node: sandbox,
        });
      }
    },
  }),
});
