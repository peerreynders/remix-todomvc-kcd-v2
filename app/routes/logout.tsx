import { type DataFunctionArgs } from '@remix-run/node';
import { logout } from '~/server/session.server';

export const action = async ({ request }: DataFunctionArgs) =>
  logout(request, '/login')
