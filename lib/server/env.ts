import './guard';
import '@/lib/server/guard';

/**
 * Server environment access.
 *
 * Secrets are read lazily and validated where they are used, so the app still
 * boots (with honest "not configured" states) on a fresh checkout. Nothing here
 * is ever serialised to the browser.
 */
export function serverEnv() {
  return {
    databasePath: process.env.DATABASE_PATH ?? 'data/rayane.db',
    sessionSecret: process.env.SESSION_SECRET ?? '',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

/**
 * In production a real secret is mandatory: session tokens are hashed with it.
 * In development we fall back to a fixed local value so `npm run dev` works out
 * of the box, and print a warning so nobody ships it.
 */
let warned = false;
export function sessionSecret(): string {
  const { sessionSecret: configured, isProduction } = serverEnv();
  if (configured && configured.length >= 32) return configured;
  if (isProduction) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. ' +
        'Set it in the production environment before starting the server.',
    );
  }
  if (!warned) {
    warned = true;
    console.warn(
      '[rayane] SESSION_SECRET is not set — using an insecure development value. ' +
        'Set SESSION_SECRET (>= 32 chars) before deploying.',
    );
  }
  return 'rayane-affaire-development-only-secret-do-not-deploy';
}
