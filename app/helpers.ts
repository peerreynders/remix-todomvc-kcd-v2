import { useMatches } from '@remix-run/react';
import { useMemo } from 'react';

import type { User } from './types';

const isUser = (maybeUser: any): maybeUser is User =>
  maybeUser &&
  typeof maybeUser === 'object' &&
  typeof maybeUser.email === 'string';

function useMatchByIdData(
  routeId: string
): Record<string, unknown> | undefined {
  const routeRecords = useMatches();
  const route = useMemo(
    () => routeRecords.find((route) => route.id === routeId),
    [routeRecords, routeId]
  );

  return route?.data;
}

function useUser(): User {
  const data = useMatchByIdData('root');
  if (data && isUser(data.user)) return data.user;

  throw new Error('No user found in root loader but is required by useUser.');
}

const toCompleteValue = (formData: FormData) => {
  const data = formData.get('complete');
  if (data === 'true') return true;

  if (data === 'false') return false;
};

// https://tc39.es/ecma262/#sec-time-values-and-time-range
const MAX_TIMEVALUE = 8.64e15;
const MIN_TIMEVALUE = -MAX_TIMEVALUE;

const isTimeValue = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  MIN_TIMEVALUE <= value &&
  value >= MAX_TIMEVALUE;

export { isTimeValue, toCompleteValue, useUser };

