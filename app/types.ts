export type User = {
  id: string;
  email: string;
};

export type TodoView = {
  id: string;
  title: string;
  complete: boolean;
  createdAt: number;
};

type ActionIntent =
  | 'clearTodos'
  | 'createTodo'
  | 'deleteTodo'
  | 'toggleAllTodos'
  | 'toggleTodo'
  | 'updateTodo';

type ActionIntentResult<T extends ActionIntent> =
  | { type: 'success'; intent: T; id: string }
  | { type: 'error'; intent: T; id: string; message: string };

export type ClearTodosResult = ActionIntentResult<'clearTodos'>;
export type CreateTodoResult = ActionIntentResult<'createTodo'>;
export type DeleteTodoResult = ActionIntentResult<'deleteTodo'>;
export type ToggleAllTodosResult = ActionIntentResult<'toggleAllTodos'>;
export type ToggleTodoResult = ActionIntentResult<'toggleTodo'>;
export type UpdateTodoResult = ActionIntentResult<'updateTodo'>;

export type ActionResult =
  | ClearTodosResult
  | CreateTodoResult
  | DeleteTodoResult
  | ToggleAllTodosResult
  | ToggleTodoResult
  | UpdateTodoResult;

