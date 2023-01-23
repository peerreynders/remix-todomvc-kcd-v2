import { redirect, type DataFunctionArgs } from '@remix-run/node';
import { getUser } from '~/server/session.server';

export async function loader({ request }: DataFunctionArgs) {
  const user = await getUser(request);
  return redirect(user ? '/todos' : '/login'); 
}
