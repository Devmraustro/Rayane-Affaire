/**
 * Server-only guard.
 *
 * Any module that touches the database, secrets or session state imports this
 * first. It throws at import time if the bundle somehow ends up client-side,
 * which turns a data-leak mistake into a loud development error.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'A server-only module was imported into the client bundle. ' +
      'Move the call into a Server Component, a Route Handler, or a Server Action.',
  );
}

export {};
