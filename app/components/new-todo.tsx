import { useEffect, useRef, type FormEvent } from 'react';
import { useFetcher } from '@remix-run/react';

function onSubmitCreateTodo(event: FormEvent<HTMLFormElement>) {
  const createdAtSelector = 'input[name="created-at"]';
  const createdAt = event.currentTarget.querySelector(createdAtSelector);
  if (!(createdAt instanceof HTMLInputElement))
    throw new Error(`Cannot find ${createdAtSelector}`);

  // This value is only used
  // for the optimistic todo (for sorting).
  //
  // The server will assign the
  // final `id` and `createdAt` when
  // the todo is persisted.
  createdAt.value = Date.now().toString();
}

export function NewTodo({
  id,
  hidden,
  errorMessage,
}: {
  id: string;
  hidden: boolean;
  errorMessage?: string;
}) {
  const createTodo = useFetcher();
  const inputTitle = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hidden) inputTitle.current?.focus();
  }, [hidden]);

  const [invalid, errorId] = errorMessage
    ? [true, `new-todo-error-${id}`]
    : [undefined, undefined];

  return (
    <createTodo.Form
      method="post"
      className="c-new-todo"
      onSubmit={onSubmitCreateTodo}
    >
      <input type="hidden" name="intent" value="createTodo" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="created-at" />
      <input
        ref={inputTitle}
        className="c-new-todo__title"
        placeholder="What needs to be done?"
        name="title"
        autoFocus={!hidden}
        hidden={hidden}
        aria-invalid={invalid}
        aria-errormessage={errorId}
      />
      {errorMessage ? (
        <div id={errorId} className="c-new-todo__error c-todos--error">
          {errorMessage}
        </div>
      ) : null}
    </createTodo.Form>
  );
}

