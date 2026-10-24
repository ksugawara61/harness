import { describe, expect, expectTypeOf, it } from "vitest";
import { defineSpec, formatSpecCase } from "./define-spec.ts";

describe("defineSpec", () => {
  it("caseId が featureId とケースキーを連結した仕様 ID を返す", () => {
    const spec = defineSpec("todo-add", {
      "submit.ok": {
        given: "タイトルを入力済み",
        when: "フォームを送信する",
        yields: "やることが作成され前の画面に戻る",
      },
    });

    expect(spec.caseId("submit.ok")).toBe("todo-add.submit.ok");
  });

  it("仕様文をリテラル型のまま保つ", () => {
    const spec = defineSpec("todo-add", {
      "submit.ok": {
        given: "タイトルを入力済み",
        when: "フォームを送信する",
        yields: "やることが作成され前の画面に戻る",
      },
    });

    expectTypeOf(spec.cases["submit.ok"]).toEqualTypeOf<{
      readonly given: "タイトルを入力済み";
      readonly when: "フォームを送信する";
      readonly yields: "やることが作成され前の画面に戻る";
    }>();
  });

  it("複数 yields をタプル型のまま保つ", () => {
    const spec = defineSpec("todo-add", {
      "validation.title-required": {
        given: "タイトルが未入力",
        when: "フォームを送信する",
        yields: ["バリデーションエラーが表示される", "送信されない"],
      },
    });

    expectTypeOf(spec.cases["validation.title-required"].yields).toEqualTypeOf<
      readonly ["バリデーションエラーが表示される", "送信されない"]
    >();
  });
});

describe("formatSpecCase", () => {
  it.each([
    [
      "given がある場合は Given / When / Then を並べる",
      {
        given: "タイトルを入力済み",
        when: "フォームを送信する",
        yields: "やることが作成され前の画面に戻る",
      },
      "Given タイトルを入力済み / When フォームを送信する / Then やることが作成され前の画面に戻る",
    ],
    [
      "given が無い場合は When / Then だけを並べる",
      {
        when: "追加画面を開く",
        yields: "入力フォームが表示される",
      },
      "When 追加画面を開く / Then 入力フォームが表示される",
    ],
    [
      "複数 yields を Then X / And Y 形式でフォーマットする",
      {
        given: "タイトルが未入力",
        when: "フォームを送信する",
        yields: ["バリデーションエラーが表示される", "送信されない"],
      },
      "Given タイトルが未入力 / When フォームを送信する / Then バリデーションエラーが表示される / And 送信されない",
    ],
  ])("%s", (_name, specCase, expected) => {
    expect(formatSpecCase(specCase)).toBe(expected);
  });
});
