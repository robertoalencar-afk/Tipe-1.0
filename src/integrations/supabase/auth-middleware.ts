import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'




function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// Contas com verificação em duas etapas: sessão só com senha (aal1) não chama o servidor.
// Guarda por 60 s, neste isolate, só a resposta "não tem 2FA" (quem ativa já sobe para aal2).
const SEM_2FA_TTL_MS = 60_000;
const sem2fa = new Map<string, number>();

async function temSegundoFator(supabase: ReturnType<typeof createClient<Database>>, token: string, userId: string) {
  const ate = sem2fa.get(userId);
  if (ate && ate > Date.now()) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Unauthorized: Invalid token');
  const tem = (data.user.factors ?? []).some((f) => f.status === 'verified');
  if (!tem) {
    if (sem2fa.size > 5000) sem2fa.clear();
    sem2fa.set(userId, Date.now() + SEM_2FA_TTL_MS);
  }
  return tem;
}

export class MfaRequiredError extends Error {
  status = 401;
  constructor() { super('Confirme o código do aplicativo autenticador para continuar.'); }
}

async function autenticar(permitirAal1: boolean) {
    
    const SUPABASE_URL = process.env['SUPABASE_URL'];
    const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'];

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Configure os segredos do servidor (docs/deploy/README.md).`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }
    
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }


    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    if (token.split('.').length !== 3) {
      throw new Error('Unauthorized: Invalid token');
    }

    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY!),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error('Unauthorized: Invalid token');
    }

    if (!data.claims.sub) {
      throw new Error('Unauthorized: No user ID found in token');
    }

    if (!permitirAal1 && (data.claims as { aal?: string }).aal !== 'aal2' && (await temSegundoFator(supabase, token, data.claims.sub))) {
      throw new MfaRequiredError();
    }

    return { supabase, userId: data.claims.sub, claims: data.claims };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => next({ context: await autenticar(false) }),
);

/** Só para o resgate de código de recuperação do 2FA, que acontece antes do aal2. */
export const requireSupabaseAuthAal1 = createMiddleware({ type: 'function' }).server(
  async ({ next }) => next({ context: await autenticar(true) }),
);
