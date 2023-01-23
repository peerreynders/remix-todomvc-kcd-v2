// `toBe` is used here to mean "optimistic"
import { toCompleteValue } from '~/helpers';
import { initNewIds, isNewId, nextId } from './new-ids';
import type { ActionResult, TodoView } from '~/types';

// --- In-flight action processing

type ToBeContext = {
  errors: Map<string, string>;
  todos: {
    index: Map<string, TodoView>;
    render: TodoView[];
    visible: Map<string, TodoView>;
  };
  createTodo: {
    previousIds: string[];
    currentNewId: string;
    done: string[];
    pending: string[];
    failed: string[];
  };
};

export type ToBeResult = {
  errors: Map<string, string>;
  render: TodoView[];
  visible: Map<string, TodoView>;
  newIds: string[];
  showNewId: string;
};

function pushTodoRender(todos: ToBeContext['todos'], todo: TodoView) {
  todos.index.set(todo.id, todo);
  todos.render.push(todo);
  todos.visible.set(todo.id, todo);
}

// Return ID for optimistic (toBe) status
// for cases without an (loading) error result
function toBeId(
  intent: string,
  state: string,
  formData?: FormData,
  data?: ActionResult
): string | undefined {
  if (data && data.intent !== intent) throw new Error('ActionResult mismatch');

  // Both 'submitting' and 'loading'
  // are a `pending` (toBe) action
  if (state === 'submitting') {
    if (formData) {
      const id = formData.get('id');
      if (typeof id === 'string') return id;
    }
    return;
  }

  if (state === 'loading') {
    if (data && data.type === 'success') return data.id;

    return;
  }
}

function toBeIdWithError(
  intent: string,
  state: string,
  type: string,
  formData?: FormData,
  data?: ActionResult
):
  | undefined
  | [kind: 'pending' | 'done', id: string]
  | [kind: 'error', id: string, message: string] {
  if (data && data.intent !== intent) throw new Error('ActionResult mismatch');

  if (state === 'idle') {
    if (type === 'done' && data) {
      if (data.type === 'error') return ['error', data.id, data.message];
      else if (data.type === 'success') return ['done', data.id];
    }
    return;
  }

  if (state === 'submitting') {
    if (formData) {
      const id = formData.get('id');
      if (typeof id === 'string') return ['pending', id];
    }

    return;
  }

  if (state === 'loading') {
    if (!data) return;

    if (data.type === 'error') return ['error', data.id, data.message];
    else if (data.type === 'success') return ['pending', data.id];

    return;
  }
}

const handlers: Record<
  string,
  (
    context: ToBeContext,
    state: string,
    type: string,
    formData?: FormData,
    data?: ActionResult
  ) => void
> = {
  clearTodos(
    { todos: { visible } }: ToBeContext,
    state: string,
    _type: string,
    formData?: FormData,
    data?: ActionResult
  ) {
    const id = toBeId('clearTodos', state, formData, data);
    if (id !== 'clearTodos') return;

    // Hide any visible complete todos
    for (const { id, complete } of visible.values()) {
      if (complete) visible.delete(id);
    }
  },

  createTodo(
    { errors, todos, createTodo }: ToBeContext,
    state: string,
    type: string,
    formData?: FormData,
    data?: ActionResult
  ) {
    const result = toBeIdWithError('createTodo', state, type, formData, data);
    if (!result) return;

    const [kind, id, message] = result;
    const { done, failed, pending } = createTodo;

    if (kind === 'pending') {
      if (!formData) return;

      const title = formData.get('title');
      const createdAt = Number(formData.get('created-at'));
      if (typeof title !== 'string' || Number.isNaN(createdAt)) return;

      const todo: TodoView = {
        id,
        title,
        complete: false,
        createdAt,
      };
      pushTodoRender(todos, todo);
      pending.push(id);
    } else if (kind === 'done') {
      done.push(id);
    } else if (kind === 'error') {
      errors.set(id, message);
      failed.push(id);
    }
  },

  deleteTodo(
    { todos: { visible } }: ToBeContext,
    state: string,
    _type: string,
    formData?: FormData,
    data?: ActionResult
  ) {
    const todoId = toBeId('deleteTodo', state, formData, data);
    if (typeof todoId !== 'string') return;

    visible.delete(todoId);
  },

  toggleAllTodos(
    { todos }: ToBeContext,
    state: string,
    _type: string,
    formData?: FormData,
    data?: ActionResult
  ) {
    const id = toBeId('toggleAllTodos', state, formData, data);
    if (id !== 'toggleAllTodos' || !formData) return;

    const complete = toCompleteValue(formData);
    if (typeof complete !== 'boolean') return;

    todos.visible.forEach((todo) => (todo.complete = complete));
  },

  toggleTodo(
    { todos }: ToBeContext,
    state: string,
    _type: string,
    formData?: FormData,
    data?: ActionResult
  ) {
    const todoId = toBeId('toggleTodo', state, formData, data);
    if (typeof todoId !== 'string' || !formData) return;

    const complete = toCompleteValue(formData);
    if (typeof complete !== 'boolean') return;

    const todo = todos.index.get(todoId);
    if (!todo) return;

    todo.complete = complete;
  },

  updateTodo(
    { errors, todos }: ToBeContext,
    state: string,
    type: string,
    formData?: FormData,
    data?: ActionResult
  ) {
    const result = toBeIdWithError('updateTodo', state, type, formData, data);
    if (!result) return;

    const [kind, id, message] = result;
    if (kind === 'pending') {
      const title = formData?.get('title');
      if (typeof title !== 'string') return;

      const todo = todos.index.get(id);
      if (!todo) return;

      todo.title = title;
      return;
    } else if (kind === 'error') {
      errors.set(id, message);
      return;
    }
  },
};

// --- toBeTodos

const byCreatedAtDesc = (a: TodoView, b: TodoView) => {
  // newer first
  // cmp > 0  `a` after `b`
  // cmp < 0  `a` before `b`

  const aIsNew = isNewId(a.id);
  const bIsNew = isNewId(b.id);
  if (aIsNew === bIsNew) return b.createdAt - a.createdAt;

  // Always show optimistic
  // created todos before others
  return aIsNew ? -1 : 1;
};

function intentFromStatus(formData?: FormData, data?: ActionResult) {
  if (data && data?.intent) return data.intent;

  if (formData) {
    const intent = formData.get('intent');
    return typeof intent === 'string' ? intent : undefined;
  }
  return undefined;
}

function fromCreateTodo({
  currentNewId,
  done,
  failed,
  pending,
  previousIds,
}: ToBeContext['createTodo']) {
  // Remove "spent" temporary IDs
  // and add another one as soon as `currentNewId` is in use.
  const newIds = previousIds.filter((id) => !done.includes(id));
  let entryId = currentNewId;
  if (
    pending.includes(entryId) ||
    done.includes(entryId) ||
    failed.includes(entryId)
  ) {
    entryId = nextId();
    newIds.push(entryId);
  }
  const showNewId = failed.length > 0 ? failed[0] : entryId;

  return {
    newIds,
    showNewId,
  };
}

function makeToBeTodos(todos: TodoView[], previousNew: string[] | null) {
  // Active `CreateTodo` temporary IDs
  const previousIds = previousNew !== null ? previousNew : initNewIds();

  // CreateTodo new ID
  // "waiting" for next new todo title
  const currentNewId = previousIds.at(-1);
  if (typeof currentNewId !== 'string') throw new Error('Empty newIds');

  // clone server todos and index them
  const index = new Map<string, TodoView>();
  const visible = new Map<string, TodoView>();
  const render = todos.reduce<TodoView[]>((list, todo) => {
    const clone = { ...todo };
    list.push(clone);
    index.set(clone.id, clone);
    visible.set(clone.id, clone);

    return list;
  }, []);

  const context: ToBeContext = {
    errors: new Map(),
    todos: {
      index,
      render,
      visible,
    },
    createTodo: {
      previousIds,
      currentNewId,
      done: [],
      pending: [],
      failed: [],
    },
  };

  return {
    addFetchStatus(
      state: string,
      type: string,
      formData?: FormData,
      data?: ActionResult
    ): void {
      const intent = intentFromStatus(formData, data);
      if (!intent) return;

      handlers[intent]?.(context, state, type, formData, data);
    },

    buildResult(): ToBeResult {
      const { newIds, showNewId } = fromCreateTodo(context.createTodo);
      context.todos.render.sort(byCreatedAtDesc);

      return {
        errors: context.errors,
        render: context.todos.render,
        visible: context.todos.visible,
        showNewId,
        newIds,
      };
    },
  };
}

export type ToBeTodosFiltered = {
  complete: number;
  incomplete: number;
  renderTodos: TodoView[];
  hiddenIds: Set<string>;
  noVisibleTodos: boolean;
};

function filterTodos(
  render: TodoView[],
  visible: Map<string, TodoView>,
  keepFn: ((todo: TodoView) => boolean) | undefined
): [TodoView[], Set<string>] {
  if (!keepFn) {
    const collectHiddenId = (ids: Set<string>, { id }: TodoView) => {
      if (!visible.has(id)) ids.add(id);

      return ids;
    };
    return [render, render.reduce(collectHiddenId, new Set<string>())];
  }

  const hiddenIds = new Set<string>();
  const collectSelectedTodo = (todos: TodoView[], todo: TodoView) => {
    if (keepFn(todo)) {
      todos.push(todo);
      if (!visible.has(todo.id)) hiddenIds.add(todo.id);
    } else {
      visible.delete(todo.id);
    }
    return todos;
  };

  return [render.reduce(collectSelectedTodo, []), hiddenIds];
}

function countAndFilter(
  render: TodoView[],
  visible: Map<string, TodoView>,
  keepFn: ((todo: TodoView) => boolean) | undefined
): ToBeTodosFiltered {
  // Count of 'All' (toBe) todos
  let complete = 0;
  for (const { complete: done } of visible.values()) if (done) complete += 1;

  const incomplete = visible.size - complete;

  // Filter todos
  const [renderTodos, hiddenIds] = filterTodos(render, visible, keepFn);

  const noVisibleTodos = renderTodos.length <= hiddenIds.size;

  return {
    complete,
    incomplete,
    renderTodos,
    hiddenIds,
    noVisibleTodos,
  };
}

export { countAndFilter, makeToBeTodos };

