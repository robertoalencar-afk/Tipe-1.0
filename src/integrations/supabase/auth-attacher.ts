import { createMiddleware } from '@tanstack/react-start'
import { carregarSupabase, temSessaoSalva } from './lazy'

let clienteCriado = false
if (typeof window !== 'undefined') {
  window.addEventListener('tipe:supabase-pronto', () => (clienteCriado = true), { once: true })
}

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
// Sem sessão salva (cliente anônimo na mesa, visitante da landing) não há token a
// anexar, então o supabase-js nem é baixado.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    if (!clienteCriado && !temSessaoSalva()) return next({ headers: {} })
    const supabase = await carregarSupabase()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
