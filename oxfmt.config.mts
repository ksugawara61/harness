import base from "./packages/code-lint/oxfmtrc.json" with { type: "json" };

export default {
  ...base,
  ignorePatterns: ["pnpm-lock.yaml"],
};
