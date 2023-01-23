const DEFAULT_REDIRECT = '/';

const safeRedirect = (
  to: FormDataEntryValue | null,
  defaultRedirect = DEFAULT_REDIRECT
) =>
  !to || typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')
    ? defaultRedirect
    : to;

export { safeRedirect };

