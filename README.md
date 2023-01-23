# remix-todomvc-kcd-v2
After some initial exploration of [Remix](https://remix.run/) through the [Jokes App Tutorial](https://remix.run/docs/en/v1/tutorials/jokes), [remix-todomvc](https://github.com/kentcdodds/remix-todomvc) served as an example of the use of [`useFetcher()`](https://remix.run/docs/en/v1/hooks/use-fetcher) for implementing [Optimistic UI](https://remix.run/docs/en/v1/guides/optimistic-ui) (partially inspired by [this](https://youtu.be/tfxxeknwsi8?t=11818)).

This lead to the (development-only) variation presented here. The optimistic UI logic was segregated into the [`to-be-todos.ts`](./app/lib/to-be-todos.ts) module which simplified the [`new-todo.tsx`](./app/components/new-todo.tsx) and [`todo-item.tsx`](./app/components/todo-item.tsx) components.

(CSS handling is loosely based on conventions found in [BEMIT](https://csswizardry.com/2015/08/bemit-taking-the-bem-naming-convention-a-step-further/) and [CSS guide lines](https://cssguidelin.es/#javascript-hooks).)

**Note**: The in-memory server side store re-seeds itself whenever the `todos-persisted.json` file cannot be found. To function [`SESSION_SECRET`](./.env.example) has to be set in the `.env` file. To see the optimistic UI in action enable the server delay:
```typescript
// …in app/routes/todos.tsx

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function action({ request }: DataFunctionArgs) {
  await delay(2000);
  const formData = await request.formData(); 
```

---
```shell
$ cd remix-todomvc-kcd-v2
$ npm i
added 1097 packages, and audited 1098 packages in 6s

found 0 vulnerabilities
$ mv .env.example .env
$ npm run dev

> dev
> remix dev

Loading environment variables from .env
Remix App Server started at http://localhost:3000 (http://192.168.1.202:3000)
```
