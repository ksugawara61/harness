import { ruleTester } from "../test-utils/rule-tester.ts";
import { noExpectInGivenWhen } from "./no-expect-in-given-when.ts";

const specIt = (phases: string) => `specIt(spec, "key", { ${phases} });`;

ruleTester.run("no-expect-in-given-when", noExpectInGivenWhen, {
  invalid: [
    {
      code: specIt(
        "given: { desc: 'a', run: () => { expect(1).toBe(1); } }, when: { desc: 'b', run: () => x() }",
      ),
      errors: 1,
      name: "given の expect は報告する",
    },
    {
      code: specIt("when: { desc: 'b', run: () => expect(x) }"),
      errors: 1,
      name: "when の expect は報告する",
    },
    {
      code: specIt(
        "given: { run: () => { expect(1); expect(2); } }, when: { run: () => expect(3) }",
      ),
      errors: 2,
      name: "フェーズごとに最初の expect を 1 件だけ報告する",
    },
    {
      code: specIt("given: { run: () => { const f = () => expect(1); } }"),
      errors: 1,
      name: "ネストした関数の中の expect も報告する",
    },
    {
      code: specIt("...rest, given: { run: () => { expect(1); } }"),
      errors: 1,
      name: "spread があっても given を探す",
    },
  ],
  valid: [
    {
      code: specIt("yields: { run: () => { expect(1); } }"),
      name: "yields の expect は許可する",
    },
    {
      code: specIt("given: { run: () => { expect.soft(1); } }"),
      name: "expect.soft は対象外",
    },
    {
      code: "specIt.each(spec, 'a', { given: { run: () => { expect(1); } } });",
      name: "specIt.each は対象外",
    },
    {
      code: "specIt(spec, { given: { run: () => { expect(1); } } });",
      name: "引数が 3 つでない specIt は対象外",
    },
    {
      code: specIt("given: { run() { expect(1); } }"),
      name: "メソッド記法の run は対象外",
    },
  ],
});
