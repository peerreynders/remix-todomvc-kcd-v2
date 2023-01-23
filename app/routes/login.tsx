import { 
  Form, 
  useActionData, 
  useSearchParams 
} from '@remix-run/react';
import { useEffect, useRef } from 'react';

// --- BEGIN server side ---
import {
  json,
  type DataFunctionArgs,
  type MetaFunction
} from '@remix-run/node';

import {
  insertUser,
  selectUserByEmail,
  verifyLogin
} from '~/server/repo.server';
import { createUserSession } from '~/server/session.server';

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation 
const emailPattern = 
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const validateEmail = (email: unknown): email is string =>
  typeof email === 'string' && emailPattern.test(email);

export async function action({ request }: DataFunctionArgs) {
  const formData = await request.formData();

  const email = formData.get('email');
  if (!validateEmail(email)) 
    return json(
      { errors: { email: 'Email is invalid', password: null } },
      { status: 400 }
    );

  const  password = formData.get('password');
  if (typeof password !== 'string')
    return json(
      { errors: { email: null, password: 'Password is required'} },
      { status: 400 }
    );
  if (password.length < 8)
    return json(
      { errors: { email: null, password: 'Password too short'} },
      { status: 400 }
    );

  const intent = formData.get('intent');
  if (intent === 'signup') {
    const found = await selectUserByEmail(email);
    if (found)
      return json(
        {
	  errors: {
	    email: 'A user already exists with this email',
	    password: null
	  }

	},
        { status: 400 }
      );

  } else if ( intent !== 'login' ) 
    throw new Error(`Unknown intent: ${intent}`);

  const user = await (
    intent === 'login' ? 
    verifyLogin(email, password):
    insertUser(email, password)
  );

  if (!user)
    return json(
      { errors: { email: 'Invalid email or password', password: null } },
      { status: 400 }
    );

  const remember = formData.get('remember');
  const redirectTo = formData.get('redirectTo');
  return createUserSession({
    request,
    userId: user.id,
    remember: remember === 'on',
    redirectTo: typeof redirectTo === 'string' ? redirectTo : '/todos'
  });
}

export const meta: MetaFunction = () =>
  ({ title: 'Login' });

// --- END server side ---

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const actionData = useActionData<typeof action>();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
      return;
    }

    if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="c-login">
      <h1 className="c-login__header">TodoMVC Login</h1>
      <div className="login-container">
        <Form method="post" className="c-login__form">
	  <div>
	    <label htmlFor="email"> 
	      Email address
	    </label>
	    <input
	      ref={emailRef}
	      id="email"
	      className="c-login__email"
	      required
	      autoFocus={true}
	      name="email"
	      type="email"
	      autoComplete="email"
	      aria-invalid={Boolean(actionData?.errors.email) || undefined}
	      aria-errormessage={actionData?.errors.email ? 'email-error' : undefined }
	    />
	    {actionData?.errors.email && (
	      <div id="email-error">{actionData.errors.email}</div>
	    )}
	  </div>

	  <div>
	    <label htmlFor="password"> 
	      Password
	    </label>
	    <input
	      ref={passwordRef}
	      id="password"
	      className="c-login__password"
	      name="password"
	      type="password"
	      autoComplete="current-password"
	      aria-invalid={Boolean(actionData?.errors.password) || undefined}
	      aria-errormessage={actionData?.errors.password ? 'password-error' : undefined }
	    />
	    {actionData?.errors.password && (
	      <div id="password-error">{actionData.errors.password}</div>
	    )}
	  </div>

	  <input type="hidden" name="redirectTo" value={redirectTo} />
	  <button type="submit" name="intent" value="login">
	    Log in
	  </button>
	  <button type="submit" name="intent" value="signup">
	    Sign Up
	  </button>
	  <div>
	    <label htmlFor="remember">
	      <input 
	        id="remember"
		className="c-login__remember"
		name="remember" 
		type="checkbox"
	      /> Remember me
	    </label>
	  </div>
	</Form>
      </div>
    </div>
  );
}
