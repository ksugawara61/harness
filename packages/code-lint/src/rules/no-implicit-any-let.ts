import { defineRule } from "@oxlint/plugins";

// Biome の suspicious/noImplicitAnyLet の置き換え。
// TypeScript で、初期値も型注釈も無い let / var 宣言（暗黙の any）を禁止する（.d.ts は除く）
export const noImplicitAnyLet = defineRule({
  create: (context) => {
    const { filename } = context;
    const isTypeScript =
      /\.[cm]?tsx?$/.test(filename) && !/\.d\.[cm]?ts$/.test(filename);
    return {
      VariableDeclaration: (node) => {
        if (!isTypeScript || node.kind === "const" || node.declare) return;
        if (/^For(In|Of)Statement$/.test(node.parent.type)) return;
        const implicit = node.declarations.find(
          (declarator) => !declarator.init && !declarator.id.typeAnnotation,
        );
        if (implicit) {
          context.report({
            message: "This variable implicitly has the any type.",
            node: implicit.id,
          });
        }
      },
    };
  },
});
