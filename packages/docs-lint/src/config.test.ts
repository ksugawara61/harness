import { describe, expect, it } from "vitest";
import { groupByTextlintProfile, parseConfig } from "./config.ts";

describe("parseConfig", () => {
  it("省略した項目は、全文書を technical で検査し文字数の上限を掛けない既定値になる", () => {
    expect(parseConfig({})).toEqual({
      charLimit: { overrides: [] },
      textlint: { overrides: [], profile: "technical" },
    });
  });

  it("overrides の dir は末尾に / を補い、別のディレクトリの前方一致を防ぐ", () => {
    expect(
      parseConfig({
        textlint: { overrides: [{ dir: "apps/blog/posts", profile: "blog" }] },
      }).textlint.overrides,
    ).toEqual([{ dir: "apps/blog/posts/", profile: "blog" }]);
  });

  it.each([
    [{ textlint: { profile: "novel" } }, /textlint\.profile/],
    [
      { textlint: { overrides: [{ dir: "a/", profile: "novel" }] } },
      /textlint\.overrides\[0\]\.profile/,
    ],
    [
      { textlint: { overrides: [{ profile: "blog" }] } },
      /textlint\.overrides\[0\]\.dir/,
    ],
    [{ textlint: { overrides: {} } }, /textlint\.overrides は配列/],
    [
      { charLimit: { overrides: [{ dir: "a/", max: 0 }] } },
      /charLimit\.overrides\[0\]\.max/,
    ],
    [
      { charLimit: { overrides: [{ max: 8000 }] } },
      /charLimit\.overrides\[0\]\.dir/,
    ],
    [[], /オブジェクトではありません/],
  ])("不正な設定 %j はどこが不正かを示して失敗する", (raw, message) => {
    expect(() => parseConfig(raw)).toThrow(message);
  });
});

describe("groupByTextlintProfile", () => {
  it("overrides の dir 配下はそのプロファイルに、それ以外は既定のプロファイルに振り分ける", () => {
    const config = parseConfig({
      textlint: {
        overrides: [{ dir: "apps/blog/posts/", profile: "blog" }],
        profile: "technical",
      },
    });

    expect(
      groupByTextlintProfile(
        [
          "docs/setup.md",
          "apps/blog/posts/hello-blog.md",
          "README.md",
          "apps/blog/mobile/README.md",
        ],
        config,
      ),
    ).toEqual(
      new Map([
        [
          "technical",
          ["docs/setup.md", "README.md", "apps/blog/mobile/README.md"],
        ],
        ["blog", ["apps/blog/posts/hello-blog.md"]],
      ]),
    );
  });
});
