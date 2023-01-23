import { useRef } from 'react';

import {
  Form,
  Link,
  useCatch,
  useFetcher,
  useFetchers,
  useLoaderData,
  useLocation,
} from '@remix-run/react';

import { toCompleteValue, useUser } from '~/helpers';
import { isNewId, validateNewId } from '~/lib/new-ids';
import { countAndFilter, makeToBeTodos } from '~/lib/to-be-todos';
import type {
  TodoView,
  ActionResult,
  ClearTodosResult,
  CreateTodoResult,
  DeleteTodoResult,
  ToggleAllTodosResult,
  ToggleTodoResult,
  UpdateTodoResult,
} from '~/types';

import { NewTodo } from '~/components/new-todo';
import { TodoItem } from '~/components/todo-item';

// --- BEGIN server side ---

import { json, type DataFunctionArgs } from '@remix-run/node';
import { requireUser } from '~/server/session.server';
import {
  selectTodosByUserId,
  deleteTodoById,
  deleteTodosCompleteByUserId,
  insertTodo,
  updateAllTodosCompleteByUserId,
  updateTodoCompleteById,
  updateTodoTitleById,
} from '~/server/repo.server';

import type { Todo } from '~/server/types';

const toTodoView = ({ id, title, complete, createdAt }: Todo): TodoView => ({
  id,
  title,
  complete,
  createdAt,
});

export async function loader({ request }: DataFunctionArgs) {
  const user = await requireUser(request);
  const todos = ((await selectTodosByUserId(user.id)) || []).map(toTodoView);

  return json({
    todos,
  });
}

type ActionFn = (
  userId: string,
  formData: FormData
) => Promise<ReturnType<typeof json<ActionResult>>>;

const validateTitle = (title: string): string | undefined =>
  title.trim() ? undefined : 'Title required';

const demoTitleError = (title: string): string | undefined =>
  title.includes('error') ? 'Todos cannot include the word "error"' : undefined;

const actions: Record<string, ActionFn> = {
  async clearTodos(
    userId: string,
    _formData: FormData
  ): Promise<ReturnType<typeof json<ClearTodosResult>>> {
    const count = await deleteTodosCompleteByUserId(userId);
    if (count < 0)
      throw json({ error: 'todo list not found' }, { status: 404 });

    return json({ type: 'success', intent: 'clearTodos', id: 'clearTodos' });
  },

  async createTodo(
    userId: string,
    formData: FormData
  ): Promise<ReturnType<typeof json<CreateTodoResult>>> {
    const id = formData.get('id');
    const title = formData.get('title');
    if (typeof id !== 'string' || typeof title !== 'string')
      throw new Error('Invalid Form Data');

    const newIdError = validateNewId(id);
    if (newIdError) throw new Error(newIdError);

    const demoError = demoTitleError(title);
    if (demoError)
      return json(
        { type: 'error', intent: 'createTodo', id, message: demoError },
        { status: 400 }
      );

    const titleError = validateTitle(title);
    if (titleError)
      return json(
        { type: 'error', intent: 'createTodo', id, message: titleError },
        { status: 400 }
      );

    const count = await insertTodo(userId, title);
    if (count < 0) throw Error('Invalid user ID');

    return json({ type: 'success', intent: 'createTodo', id });
  },

  async deleteTodo(
    userId: string,
    formData: FormData
  ): Promise<ReturnType<typeof json<DeleteTodoResult>>> {
    const id = formData.get('id');
    if (typeof id !== 'string') throw new Error('Invalid Form Data');

    const count = await deleteTodoById(userId, id);
    if (count < 0) throw json({ error: 'todo not found' }, { status: 404 });

    return json({ type: 'success', intent: 'deleteTodo', id });
  },

  async toggleAllTodos(
    userId: string,
    formData: FormData
  ): Promise<ReturnType<typeof json<ToggleAllTodosResult>>> {
    const complete = toCompleteValue(formData);
    if (typeof complete !== 'boolean') throw new Error('Invalid Form Data');

    const count = await updateAllTodosCompleteByUserId(userId, complete);
    if (count < 0)
      throw json({ error: 'todo list not found' }, { status: 404 });

    return json({
      type: 'success',
      intent: 'toggleAllTodos',
      id: 'toggleAllTodos',
    });
  },

  async toggleTodo(
    userId: string,
    formData: FormData
  ): Promise<ReturnType<typeof json<ToggleTodoResult>>> {
    const id = formData.get('id');
    const complete = toCompleteValue(formData);

    if (typeof id !== 'string' || typeof complete !== 'boolean')
      throw new Error('Invalid Form Data');

    const count = await updateTodoCompleteById(userId, id, complete);
    if (count < 0) throw json({ error: 'todo not found' }, { status: 404 });

    return json({ type: 'success', intent: 'toggleTodo', id });
  },

  async updateTodo(
    userId: string,
    formData: FormData
  ): Promise<ReturnType<typeof json<UpdateTodoResult>>> {
    const id = formData.get('id');
    const title = formData.get('title');
    if (typeof id !== 'string' || typeof title !== 'string')
      throw new Error('Invalid Form Data');

    const demoError = demoTitleError(title);
    if (demoError)
      return json(
        { type: 'error', intent: 'updateTodo', id, message: demoError },
        { status: 400 }
      );

    const titleError = validateTitle(title);
    if (titleError)
      return json(
        { type: 'error', intent: 'updateTodo', id, message: titleError },
        { status: 400 }
      );

    const count = await updateTodoTitleById(userId, id, title);
    if (count < 0) throw json({ error: 'todo not found' }, { status: 404 });

    return json({ type: 'success', intent: 'updateTodo', id });
  },
} as const;

// const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function action({ request }: DataFunctionArgs) {
  // await delay(2000);
  const formData = await request.formData();
  const intent = formData.get('intent');
  if (typeof intent !== 'string') throw new Error('Invalid Form Data');

  const actionFn = actions[intent];
  if (!actionFn) throw Error(`Unsupported intent: ${intent}`);

  const { id: userId } = await requireUser(request);
  return actionFn(userId, formData);
}

// --- END server side ---

function useToBeTodos(
  todos: TodoView[],
  keepFn: ((todo: TodoView) => boolean) | undefined
) {
  const newTodoIds = useRef<string[] | null>(null);
  const allFetchers = useFetchers();

  const toBeTodos = makeToBeTodos(todos, newTodoIds.current);
  for (const { state, type, submission, data } of allFetchers) {
    toBeTodos.addFetchStatus(state, type, submission?.formData, data);
  }
  const { errors, render, visible, newIds, showNewId } =
    toBeTodos.buildResult();

  const { complete, incomplete, renderTodos, hiddenIds, noVisibleTodos } =
    countAndFilter(render, visible, keepFn);

  newTodoIds.current = newIds;
  return {
    errors,
    newIds,
    showNewId,
    complete,
    incomplete,
    renderTodos,
    hiddenIds,
    noVisibleTodos,
  };
}

const TODOS_FILTER = {
  all: undefined,
  active: (todo: TodoView) => !todo.complete,
  complete: (todo: TodoView) => todo.complete,
} as const;
type FilterName = keyof typeof TODOS_FILTER;

const isFilterName = (name: string): name is FilterName =>
  Object.hasOwn(TODOS_FILTER, name);

const routeLeaf = (pathname: string) =>
  pathname.slice(pathname.lastIndexOf('/') + 1);

// `toBe` is used as a synonym to optimistic
export default function TodosPage() {
  const user = useUser();
  const { todos: serverTodos } = useLoaderData<typeof loader>();

  const location = useLocation();
  const leafName = routeLeaf(location.pathname);
  const filterName = isFilterName(leafName) ? leafName : 'all';
  const keepFn = TODOS_FILTER[filterName];

  const clearTodos = useFetcher<typeof actions.clearAllTodos>();
  const toggleAllTodos = useFetcher<typeof actions.toggleAllTodos>();

  // Optimistic UI
  // 1. Hold but HIDE "delete in progress" todos (retain DOM)
  // 2. Hold but HIDE "clear" in progress" todos (retain DOM)
  // 3. SHOW "create in progress" todos (DOM will be replaced with permanent ID)
  //
  // Visible
  // - Loaded Todo (exists on the server)
  //   - and NOT "delete in progress" todo (HIDDEN - optimistic delete)
  //   - and NOT "clear in progess" todo (HIDDEN - optimistic clear)
  // - createTodo.pending (i.e. NOT yet server loaded; optmististic create)

  const {
    errors,
    newIds,
    showNewId,
    complete,
    incomplete,
    renderTodos,
    hiddenIds,
    noVisibleTodos,
  } = useToBeTodos(serverTodos, keepFn);
  const total = complete + incomplete;

  const mainModifier = noVisibleTodos
    ? 'js-c-todos__main--no-todos-visible'
    : '';

  // toggle all to "complete" is there is at least one
  // "incomplete" todo. Otherwise toggle to "incomplete".
  const [toggleAllTo, toggleAllTitle, toggleAllModifier] =
    incomplete > 0
      ? [true, 'Mark all as complete', '']
      : total > 0
      ? [false, 'Mark all as incomplete', 'js-c-todos__toggle-all--checked']
      : [true, '', 'js-c-todos__toggle-all--no-todos'];

  const [filterAllModifier, filterActiveModifier, filterCompleteModifier] =
    filterName === 'all'
      ? ['js-c-todos__filter-link--selected', '', '']
      : filterName === 'active'
      ? ['', 'js-c-todos__filter-link--selected', '']
      : ['', '', 'js-c-todos__filter-link--selected'];

  return (
    <>
      <section className="c-todos">
        <div>
          <header className="header">
            <h1 className="c-todos__header">todos</h1>
            {newIds.map((id) => (
              <NewTodo
                key={id}
                id={id}
                hidden={id !== showNewId}
                errorMessage={errors.get(id)}
              />
            ))}
          </header>
          <section className={'c-todos__main ' + mainModifier}>
            <toggleAllTodos.Form method="post">
              <input type="hidden" name="id" value="toggleAllTodos" />
              <input
                type="hidden"
                name="complete"
                value={toggleAllTo.toString()}
              />
              <button
                className={'c-todos__toggle-all ' + toggleAllModifier}
                name="intent"
                title={toggleAllTitle}
                type="submit"
                value="toggleAllTodos"
              />
            </toggleAllTodos.Form>
            <ul className="c-todo-list" hidden={noVisibleTodos}>
              {renderTodos.map((todo) => (
                <li
                  key={todo.id}
                  hidden={hiddenIds.has(todo.id)}
                  className="c-todo-list__item"
                >
                  <TodoItem
                    todo={todo}
                    disabled={isNewId(todo.id)}
                    errorMessage={errors.get(todo.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
          <footer className="c-todos__footer">
            <span className="c-todos__count">
              <strong>{incomplete}</strong>
              <span> {incomplete === 1 ? 'item' : 'items'} left</span>
            </span>
            <ul className="c-todos__filters">
              <li className="c-todos__filter-item">
                <Link
                  to="."
                  className={'c-todos__filter-link ' + filterAllModifier}
                  prefetch="render"
                >
                  All
                </Link>
              </li>{' '}
              <li className="c-todos__filter-item">
                <Link
                  to="active"
                  className={'c-todos__filter-link ' + filterActiveModifier}
                  prefetch="render"
                >
                  Active
                </Link>
              </li>{' '}
              <li className="c-todos__filter-item">
                <Link
                  to="complete"
                  className={'c-todos__filter-link ' + filterCompleteModifier}
                  prefetch="render"
                >
                  Completed
                </Link>
              </li>
            </ul>
            {complete > 0 ? (
              <clearTodos.Form method="post">
                <input type="hidden" name="id" value="clearTodos" />
                <button
                  className="c-todos__clear-completed"
                  name="intent"
                  type="submit"
                  value="clearTodos"
                >
                  Clear completed
                </button>
              </clearTodos.Form>
            ) : null}
          </footer>
        </div>
      </section>
      <footer className="c-info">
        <p className="c-info__line">
          Source on{' '}
          <a
            href="http://github.com/peerreynders/remix-todomvc-kcd-v2"
            className="c-info__pointer"
          >
            Github
          </a>
        </p>
        <p className="c-info__line">
          Based on{' '}
          <a
            href="http://github.com/kentcdodds/remix-todomvc"
            className="c-info__pointer"
          >
            remix-todomvc
          </a>
        </p>
        <div>
          {user.email}{' '}
          <Form method="post" action="/logout" className="c-info__logout">
            <button type="submit" className="c-info__pointer">
              Logout
            </button>
          </Form>
        </div>
      </footer>
    </>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 400) {
    return <div>You did something wrong: {caught.data.error}</div>;
  }

  if (caught.status === 404) {
    return <div>Not found</div>;
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return <div>An unexpected error occured</div>;
}

