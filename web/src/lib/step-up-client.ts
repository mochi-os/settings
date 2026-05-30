import { requestHelpers, type StepUpClient, type StepUpResult } from '@mochi/web'
import endpoints from '@/api/endpoints'

// Errors surface inline in the StepUpDialog, so suppress the global toast.
const NO_TOAST = { mochi: { showGlobalErrorToast: false } } as const

// base64url(bytes), no padding - matches Go's base64.RawURLEncoding so the
// server can recompute the challenge from the verifier.
function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier(): string {
  const bytes = new Uint8Array(48)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

// challenge = base64url(sha256(verifier)); the dialog holds the verifier and
// sends only the challenge to begin, then presents the verifier to finish.
async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

// StepUpClient implementation for the settings app: wires the shared lib/web
// StepUpDialog to settings' own re-authentication actions (each backed by
// mochi.user.code.verify / totp.verify / passkey.verify / oauth.verify and
// mochi.user.methods.get / oauth.list). A lib/web component can't reference
// these paths itself, so the app injects this.
export const stepUpClient: StepUpClient = {
  methods: async () => {
    const raw = (await requestHelpers.get<{ methods: string[] }>(endpoints.user.accountMethods))
      .methods
    // Mirror the server's reauthentication_required: OAuth re-verifies the
    // email factor, recovery codes are not a step-up factor.
    const mapped = raw.map((m) => (m === 'oauth' ? 'email' : m)).filter((m) => m !== 'recovery')
    const deduped = Array.from(new Set(mapped))
    return deduped.length ? deduped : ['email']
  },
  send: async () => {
    await requestHelpers.post<{ ok: boolean }>(endpoints.user.accountCode, {}, NO_TOAST)
  },
  verifyEmail: (code) =>
    requestHelpers.post<StepUpResult>(endpoints.user.accountCodeVerify, { code }, NO_TOAST),
  verifyTotp: (code) =>
    requestHelpers.post<StepUpResult>(endpoints.user.accountTotpVerify, { code }, NO_TOAST),
  passkeyBegin: () =>
    requestHelpers.post<{ ceremony: string; options: unknown }>(
      endpoints.user.accountPasskeyVerifyBegin,
      {},
      NO_TOAST,
    ),
  passkeyFinish: (ceremony, assertion) =>
    requestHelpers.post<StepUpResult>(
      endpoints.user.accountPasskeyVerifyFinish,
      { ceremony, assertion },
      NO_TOAST,
    ),
  oauthProviders: async () => {
    const { identities } = await requestHelpers.get<{ identities: Array<{ provider: string }> }>(
      endpoints.user.accountOauth,
    )
    return Array.from(new Set((identities ?? []).map((i) => i.provider)))
  },
  oauthVerify: async (provider) => {
    const verifier = randomVerifier()
    const challenge = await challengeFor(verifier)
    const { url } = await requestHelpers.post<{ url: string }>(
      endpoints.user.accountOauthVerifyBegin,
      { provider, challenge },
      NO_TOAST,
    )
    // In the sandboxed shell iframe, window.open opens the popup but returns
    // null (the escaped popup has no opener handle), so DON'T treat null as
    // failure - poll for the proof the popup's callback stores either way. The
    // proof is keyed by the verifier the dialog alone holds. When we do get a
    // handle (top-window), popup.closed gives fast cancellation; otherwise we
    // fall back to the timeout.
    const popup = window.open(url, 'mochi-oauth-stepup', 'width=520,height=680')
    const deadline = Date.now() + 120_000
    let closedAt = 0
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const result = await requestHelpers.post<StepUpResult>(
        endpoints.user.accountOauthVerifyFinish,
        { verifier },
        NO_TOAST,
      )
      if (result && (result.token || result.remaining)) return result
      if (popup && popup.closed) {
        if (!closedAt) closedAt = Date.now()
        else if (Date.now() - closedAt > 2500) throw new Error('oauth-cancelled')
      }
      if (Date.now() > deadline) throw new Error('oauth-timeout')
    }
  },
}
