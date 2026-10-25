import { ruleTester } from "../test-utils/rule-tester.ts";
import { noLogicInComponents } from "./no-logic-in-components.ts";

ruleTester.run("no-logic-in-components", noLogicInComponents, {
  invalid: [
    {
      code: "export const Empty = () => { const { label } = useService(); return <p>{label}</p>; };",
      errors: 1,
      name: "useService の呼び出しは報告する",
    },
    {
      code: "export const Toggle = () => { const [open] = useState(false); return <p>{open}</p>; };",
      errors: 1,
      name: "useState などのフックの呼び出しも報告する",
    },
    {
      code: "export const Toggle = () => { const [open] = React.useState(false); return <p>{open}</p>; };",
      errors: 1,
      name: "React.useXxx の呼び出しも報告する",
    },
  ],
  valid: [
    {
      code: "type Props = { label: string };\nexport const Empty = ({ label }: Props) => <p>{label}</p>;",
      name: "Props だけで描画する部品は許可する",
    },
    {
      code: "export const Count = ({ count }: { count: number }) => <p>{format(count)}</p>;",
      name: "フック以外の関数の呼び出しは許可する",
    },
    {
      code: "export const Label = ({ label }: { label: string }) => <p>{username(label)}</p>;",
      name: "use で始まっても大文字が続かない名前はフックとみなさない",
    },
  ],
});
