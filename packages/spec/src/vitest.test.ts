import type { TestContext } from "vitest";
import { describe, expect, expectTypeOf, it } from "vitest";
import { defineSpec } from "./define-spec.ts";
import { type SpecItPhase, type SpecItPhases, specIt } from "./vitest.ts";

const spec = defineSpec("todo-add", {
  "render.form": {
    when: "追加画面を開く",
    yields: "タイトルを入力できるフォームが表示される",
  },
  "submit.ok": {
    given: "タイトルを入力済み",
    when: "フォームを送信する",
    yields: "やることが作成され前の画面に戻る",
  },
  "validation.title-required": {
    given: "タイトルが未入力",
    when: "フォームを送信する",
    yields: ["バリデーションエラーが表示される", "送信されない"],
  },
});

type SubmitOkCase = (typeof spec)["cases"]["submit.ok"];
type RenderFormCase = (typeof spec)["cases"]["render.form"];
type ValidationCase = (typeof spec)["cases"]["validation.title-required"];

describe("specIt", () => {
  const executedPhases: string[] = [];

  specIt(spec, "submit.ok", {
    given: {
      desc: "タイトルを入力済み",
      run: async () => {
        executedPhases.push("given");
        return { title: "牛乳を買う" };
      },
    },
    when: {
      desc: "フォームを送信する",
      run: async (givenResult) => {
        executedPhases.push("when");
        expectTypeOf(givenResult).toEqualTypeOf<{ title: string }>();
        return `${givenResult.title} を送信した`;
      },
    },
    yields: {
      desc: "やることが作成され前の画面に戻る",
      run: (whenResult, givenResult, ctx) => {
        executedPhases.push("yields");

        expect(whenResult).toBe("牛乳を買う を送信した");
        expect(givenResult).toEqual({ title: "牛乳を買う" });
        expect(ctx.task.name).toBe(
          "Given タイトルを入力済み / When フォームを送信する / Then やることが作成され前の画面に戻る",
        );
        expect(ctx.task.annotations).toMatchObject([
          { message: "todo-add.submit.ok", type: "spec" },
        ]);
      },
    },
  });

  it("given → when → yields の順にフェーズを実行する", () => {
    expect(executedPhases).toEqual(["given", "when", "yields"]);
  });

  specIt(spec, "render.form", {
    when: { desc: "追加画面を開く", run: () => "フォームを描画した" },
    yields: {
      desc: "タイトルを入力できるフォームが表示される",
      run: (whenResult, givenResult, ctx) => {
        expectTypeOf(givenResult).toEqualTypeOf<undefined>();

        expect(whenResult).toBe("フォームを描画した");
        expect(givenResult).toBeUndefined();
        expect(ctx.task.name).toBe(
          "When 追加画面を開く / Then タイトルを入力できるフォームが表示される",
        );
        expect(ctx.task.annotations).toMatchObject([
          { message: "todo-add.render.form", type: "spec" },
        ]);
      },
    },
  });
});

describe("specIt（複数 yields）", () => {
  const executedYields: string[] = [];

  specIt(spec, "validation.title-required", {
    given: {
      desc: "タイトルが未入力",
      run: () => ({ title: "" }),
    },
    when: {
      desc: "フォームを送信する",
      run: (givenResult) => `${givenResult.title} を検証した`,
    },
    yields: [
      {
        desc: "バリデーションエラーが表示される",
        run: (whenResult, givenResult, ctx) => {
          executedYields.push("yields[0]");
          expect(whenResult).toBe(" を検証した");
          expect(givenResult).toEqual({ title: "" });
          expect(ctx.task.name).toBe(
            "Given タイトルが未入力 / When フォームを送信する / Then バリデーションエラーが表示される / And 送信されない",
          );
        },
      },
      {
        desc: "送信されない",
        run: (whenResult, givenResult, ctx) => {
          executedYields.push("yields[1]");
          expect(whenResult).toBe(" を検証した");
          expect(givenResult).toEqual({ title: "" });
          expect(ctx.task.annotations).toMatchObject([
            { message: "todo-add.validation.title-required", type: "spec" },
          ]);
        },
      },
    ],
  });

  it("複数 yields の run を順次実行する", () => {
    expect(executedYields).toEqual(["yields[0]", "yields[1]"]);
  });
});

describe("specIt.each", () => {
  const rows = [
    { expected: "牛乳を買う を送信した", name: "1件目", title: "牛乳を買う" },
    { expected: "卵を買う を送信した", name: "2件目", title: "卵を買う" },
  ];

  specIt.each(spec, "submit.ok")(rows, {
    given: {
      desc: "タイトルを入力済み",
      run: (row) => ({ title: row.title }),
    },
    when: {
      desc: "フォームを送信する",
      run: (_row, givenResult) => {
        expectTypeOf(givenResult).toEqualTypeOf<{ title: string }>();
        return `${givenResult.title} を送信した`;
      },
    },
    yields: {
      desc: "やることが作成され前の画面に戻る",
      run: (row, whenResult, givenResult, ctx) => {
        expect(whenResult).toBe(row.expected);
        expect(givenResult).toEqual({ title: row.title });
        expect(ctx.task.name).toBe(
          `Given タイトルを入力済み / When フォームを送信する / Then やることが作成され前の画面に戻る / ${row.name}`,
        );
        expect(ctx.task.annotations).toMatchObject([
          { message: "todo-add.submit.ok", type: "spec" },
        ]);
      },
    },
  });

  specIt.each(spec, "render.form")(
    [{ expected: "フォームを描画した", name: "描画される" }],
    {
      when: { desc: "追加画面を開く", run: () => "フォームを描画した" },
      yields: {
        desc: "タイトルを入力できるフォームが表示される",
        run: (row, whenResult, givenResult, ctx) => {
          expectTypeOf(givenResult).toEqualTypeOf<undefined>();

          expect(whenResult).toBe(row.expected);
          expect(givenResult).toBeUndefined();
          expect(ctx.task.name).toBe(
            `When 追加画面を開く / Then タイトルを入力できるフォームが表示される / ${row.name}`,
          );
          expect(ctx.task.annotations).toMatchObject([
            { message: "todo-add.render.form", type: "spec" },
          ]);
        },
      },
    },
  );

  specIt.each(spec, "validation.title-required")(
    [{ name: "空文字", title: "" }],
    {
      given: {
        desc: "タイトルが未入力",
        run: (row) => ({ title: row.title }),
      },
      when: {
        desc: "フォームを送信する",
        run: (_row, givenResult) => `${givenResult.title} を検証した`,
      },
      yields: [
        {
          desc: "バリデーションエラーが表示される",
          run: (row, whenResult, _givenResult, ctx) => {
            expect(whenResult).toBe(" を検証した");
            expect(ctx.task.name).toBe(
              `Given タイトルが未入力 / When フォームを送信する / Then バリデーションエラーが表示される / And 送信されない / ${row.name}`,
            );
          },
        },
        {
          desc: "送信されない",
          run: (_row, whenResult, givenResult, ctx) => {
            expect(whenResult).toBe(" を検証した");
            expect(givenResult).toEqual({ title: "" });
            expect(ctx.task.annotations).toMatchObject([
              { message: "todo-add.validation.title-required", type: "spec" },
            ]);
          },
        },
      ],
    },
  );
});

describe("SpecItPhases", () => {
  it("各フェーズの desc は spec.ts の仕様文のリテラル型になる", () => {
    expectTypeOf<
      SpecItPhases<SubmitOkCase, undefined, string>["when"]["desc"]
    >().toEqualTypeOf<"フォームを送信する">();
    expectTypeOf<
      SpecItPhases<SubmitOkCase, undefined, string>["yields"]["desc"]
    >().toEqualTypeOf<"やることが作成され前の画面に戻る">();
  });

  it("yields の run は when / given の戻り値とテストコンテキストだけを受け取る", () => {
    expectTypeOf<
      Parameters<
        SpecItPhases<SubmitOkCase, { title: string }, number>["yields"]["run"]
      >
    >().toEqualTypeOf<[number, { title: string }, TestContext]>();
  });

  it("given を宣言していないケースの given の戻り値は undefined になる", () => {
    expectTypeOf<
      Parameters<SpecItPhases<RenderFormCase, undefined, number>["when"]["run"]>
    >().toEqualTypeOf<[undefined, TestContext]>();
  });

  it("given を宣言したケースは given フェーズを省略できない", () => {
    expectTypeOf<{
      when: SpecItPhase<"フォームを送信する", () => string>;
      yields: SpecItPhase<"やることが作成され前の画面に戻る", () => void>;
    }>().not.toExtend<SpecItPhases<SubmitOkCase, undefined, string>>();
  });

  it("given を宣言していないケースは given フェーズを書けない", () => {
    expectTypeOf<
      SpecItPhases<RenderFormCase, undefined, string>["given"]
    >().toEqualTypeOf<undefined>();
  });

  it("複数 yields の各要素の desc はタプルの各リテラル型になる", () => {
    type Yields = SpecItPhases<ValidationCase, undefined, string>["yields"];
    expectTypeOf<
      Yields[0]["desc"]
    >().toEqualTypeOf<"バリデーションエラーが表示される">();
    expectTypeOf<Yields[1]["desc"]>().toEqualTypeOf<"送信されない">();
  });

  it("複数 yields の各要素の run は when / given の戻り値とテストコンテキストを受け取る", () => {
    type Yields = SpecItPhases<
      ValidationCase,
      { title: string },
      number
    >["yields"];
    expectTypeOf<Parameters<Yields[0]["run"]>>().toEqualTypeOf<
      [number, { title: string }, TestContext]
    >();
  });
});
