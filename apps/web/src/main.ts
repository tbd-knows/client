import { createClient } from '@supabase/supabase-js';
import './style.css';

type Link = { token_hash: string; type: 'invite' | 'email' };
type JoinSession = { accessToken: string; expiresAt: number };
const resendMessage = 'Ask the founder to resend your Join TBD email.';

export function mount(fragment: string): void {
  const status = document.querySelector<HTMLParagraphElement>('#status')!;
  const button = document.querySelector<HTMLButtonElement>('#join')!;
  let session: JoinSession | undefined;
  let busy = false;
  let link: Link | undefined;

  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  fragment = '';
  const type = params.get('type');
  const hash = params.get('token_hash');
  if (params.getAll('type').length === 1 && params.getAll('token_hash').length === 1 &&
      (type === 'invite' || type === 'email') && hash && /^[a-zA-Z0-9_-]{1,1024}$/.test(hash)) {
    link = { token_hash: hash, type };
  }
  params.delete('token_hash');
  params.delete('type');

  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  function finish(message: string): void {
    session = undefined;
    link = undefined;
    status.textContent = message;
    button.hidden = true;
  }

  function retry(): void {
    status.textContent = 'We could not finish joining TBD. Press Retry to try again.';
    button.textContent = 'Retry';
  }

  if (!link) {
    finish(`This invitation link is missing or invalid. ${resendMessage}`);
    return;
  }
  if (!apiUrl || !supabaseUrl || !publicKey) {
    finish('Joining is not configured yet. Please contact the founder.');
    return;
  }
  status.textContent = 'Press Join TBD to verify your email and join.';
  button.hidden = false;

  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    status.textContent = 'Joining TBD…';
    try {
      if (!session) {
        if (!link) return;
        const client = createClient(supabaseUrl, publicKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { fetch: (input, init) => fetch(input, {
            ...init, cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit',
            signal: AbortSignal.timeout(15000),
          }) },
        });
        try {
          const { data, error } = await client.auth.verifyOtp(link);
          link = undefined;
          if (error || !data.session?.access_token || !data.session.expires_at) {
            finish(`This link could not be verified. It may have expired or already been used. ${resendMessage}`);
            return;
          }
          session = { accessToken: data.session.access_token, expiresAt: data.session.expires_at };
        } finally {
          // Remove SDK listeners; the short-lived SDK client/session can be collected.
          await client.auth.dispose();
        }
      }
      if (session.expiresAt * 1000 <= Date.now()) {
        finish(`Your verification has expired. ${resendMessage}`);
        return;
      }
      const response = await fetch(`${apiUrl}/v1/join`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}`, Accept: 'application/json' },
        cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit', redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        finish(`Your verification has expired. ${resendMessage}`);
        return;
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        finish('We could not complete this invitation. Please contact the founder.');
        return;
      }
      if (!response.ok) {
        retry();
        return;
      }
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string' ||
          !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(result.id)) {
        retry();
        return;
      }
      finish("You're in TBD.");
    } catch {
      if (session) retry();
      else finish(`This link could not be verified. ${resendMessage}`);
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
}
