import { ruleTester } from "../test-utils/rule-tester.ts";
import { noLogicInRoutes } from "./no-logic-in-routes.ts";

const expoRouter = [{ allowHooks: ["useLocalSearchParams"] }];
const tanstackRouter = [{ allowHooks: ["useParams", "useSearch"] }];

ruleTester.run("no-logic-in-routes", noLogicInRoutes, {
  invalid: [
    {
      code: "export default function Page() { const { data } = useQuery(options); return <List data={data} />; }",
      errors: [
        {
          message:
            "ルーティングのファイルでは useQuery を呼ばず、features のページの service.ts に移してください。ルーティングのファイルは、パスのパラメーターなどをページに Props で渡して描画するだけにします",
        },
      ],
      name: "データ取得のフックを呼ぶと報告する",
      options: expoRouter,
    },
    {
      code: "export default function Page() { const [open, setOpen] = React.useState(false); return <Dialog open={open} />; }",
      errors: 1,
      name: "React.useXxx の呼び出しも報告する",
      options: expoRouter,
    },
    {
      code: "const Detail = () => { const navigate = Route.useNavigate(); return <TodoDetail onBack={() => navigate({ to: '/' })} />; };",
      errors: 1,
      name: "allowHooks に無い Route.useXxx の呼び出しは報告する",
      options: tanstackRouter,
    },
    {
      code: "export default function Page() { const { id } = useLocalSearchParams(); return <BookDetail id={id} />; }",
      errors: 1,
      name: "allowHooks を指定しなければ、パラメーターの読み取りも報告する",
    },
  ],
  valid: [
    {
      code: "export default function Page() { const { id } = useLocalSearchParams<{ id: string }>(); return <BookDetail id={id ?? ''} />; }",
      name: "expo-router: allowHooks に挙げたフックは許可する",
      options: expoRouter,
    },
    {
      code: "const Detail = () => { const { id } = Route.useParams(); return <TodoDetail id={id} />; };",
      name: "TanStack Router: allowHooks に挙げた Route.useXxx は許可する",
      options: tanstackRouter,
    },
    {
      code: 'export const Route = createFileRoute("/")({ component: TodoPage });',
      name: "フックを呼ばないルートの定義は許可する",
    },
  ],
});
