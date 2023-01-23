import { useFetcher } from '@remix-run/react';

import type { FocusEvent } from 'react';
import type { TodoView } from '~/types';

export function TodoItem({
  todo,
  disabled,
  errorMessage,
}: {
  todo: TodoView;
  disabled: boolean;
  errorMessage?: string;
}) {
  const deleteTodo = useFetcher();
  const toggleTodo = useFetcher();
  const updateTodo = useFetcher();

  const [invalid, errorId] = errorMessage
    ? [true, `todo-item-error-${todo.id}`]
    : [undefined, undefined];

  const submitTitleUpdate = (event: FocusEvent<HTMLInputElement, Element>) => {
    if (event.currentTarget.value !== todo.title)
      updateTodo.submit(event.currentTarget.form);
  };

  const [todoModifier, toggleModifier, toggleTitle, toggleTo] = todo.complete
    ? [
        'js-c-todo-item--complete',
        'js-c-todo-item__toggle--complete',
        'Mark as incomplete',
        'false',
      ]
    : [
        'js-c-todo-item--incomplete',
        'js-c-todo-item__toggle--incomplete',
        'Mark as complete',
        'true',
      ];

  return (
    <div className={'c-todo-item ' + todoModifier}>
      <toggleTodo.Form method="post">
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="complete" value={toggleTo} />
        <button
          className={'c-todo-item__toggle ' + toggleModifier}
          disabled={disabled}
          title={toggleTitle}
          name="intent"
          type="submit"
          value="toggleTodo"
        />
      </toggleTodo.Form>
      <updateTodo.Form method="post" className="c-todo-item__update">
        <input type="hidden" name="intent" value="updateTodo" />
        <input type="hidden" name="id" value={todo.id} />
        <input
          className="c-todo-item__title"
          defaultValue={todo.title}
          disabled={disabled}
          name="title"
          onBlur={submitTitleUpdate}
          aria-invalid={invalid}
          aria-describedby={errorId}
        />
        {errorMessage ? (
          <div id={errorId} className="c-todo-item__error c-todos--error">
            {errorMessage}
          </div>
        ) : null}
      </updateTodo.Form>
      <deleteTodo.Form method="post">
        <input type="hidden" name="id" value={todo.id} />
        <button
          className="c-todo-item__delete"
          disabled={disabled}
          name="intent"
          title="Delete todo"
          type="submit"
          value="deleteTodo"
        />
      </deleteTodo.Form>
    </div>
  );
}
