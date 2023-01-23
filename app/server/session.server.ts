import type { User } from '~/types';
import { createCookieSessionStorage, redirect } from '@remix-run/node';

import { selectUserById } from './repo.server'
import { safeRedirect } from './helpers'

if (!process.env.SESSION_SECRET) 
  throw new Error('SESSION_SECRET must be set');

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production'
  }
});

export const USER_SESSION_KEY = "userId";

async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);

  const maxAge = remember 
    ? 60 * 60 * 24 * 7 // 7 days 
    : undefined;
  const headerValue = await sessionStorage.commitSession(session, { maxAge });

  return redirect(safeRedirect(redirectTo), {
    headers: {
      'Set-Cookie': headerValue
    }
  });
}

async function logout(
  request: Request,
  redirectTo = '/'
) {
  const session = await getSession(request);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session)
    }
  });
}

async function getUserId(request: Request): Promise<string | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);
  return userId;
}

async function getUser(request: Request): Promise<User | undefined> {
  const userId = await getUserId(request);
  return typeof userId === 'string' ? selectUserById(userId) : undefined;
}

async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
): Promise<string> {
  const userId = await getUserId(request);
  if (userId && typeof userId === 'string') return userId;

  const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
  throw redirect(
    redirectTo && redirectTo !== '/' 
    ? `/login?${searchParams}` 
    : '/login'
  );
}

async function requireUser(request: Request): Promise<User> {
  const userId = await requireUserId(request);
  const user = await selectUserById(userId);

  if (user) return user;

  const logoutResponse = await logout(request);
  throw logoutResponse;
}

export {
  getSession,
  createUserSession,
  logout,
  getUser,
  getUserId,
  requireUserId,
  requireUser
};
